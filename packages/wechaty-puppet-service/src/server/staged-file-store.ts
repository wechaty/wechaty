/**
 * Ephemeral disk-backed staging store for `POST /files` and `GET /files/:id` on
 * `PuppetServer`, enforcing per-file byte limits, total disk/entry caps (including
 * in-flight reservations), and automatic TTL eviction without buffering entire
 * files in memory.
 */
import crypto from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rm, unlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Readable } from 'node:stream'

/**
 * Metadata for a staged file stored on disk.
 */
export interface StagedFileEntry {
  id: string
  url: string
  name: string
  mimeType: string
  size: number
  filePath: string
  expiresAt: number
}

/**
 * Error thrown when an incoming upload exceeds `maxBytes` or total staging capacity.
 */
export class PayloadTooLargeError extends Error {
  /** Create a `PayloadTooLargeError` describing the violated byte limit. */
  constructor (message: string) {
    super(message)
    this.name = 'PayloadTooLargeError'
  }
}

const DEFAULT_MAX_FILE_BYTES = 100 * 1024 * 1024 // 100 MiB
const DEFAULT_MAX_TOTAL_BYTES = 512 * 1024 * 1024 // 512 MiB
const DEFAULT_MAX_ENTRIES = 1000
const DEFAULT_TTL_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Ephemeral disk-backed store for staged HTTP file uploads.
 */
export class StagedFileStore {

  private readonly entries = new Map<string, StagedFileEntry>()
  private readonly maxBytes: number
  private readonly maxTotalBytes: number
  private readonly maxEntries: number
  private readonly ttlMs: number
  private totalBytes = 0
  private reservedBytes = 0
  private reservedEntries = 0
  private dirPath?: string
  private dirInitPromise?: Promise<string>
  private sweepTimer?: ReturnType<typeof setInterval>

  /**
   * Create a `StagedFileStore` with optional per-file, total-disk, entry-count, and TTL bounds.
   */
  constructor (options?: {
    maxBytes?: number
    maxTotalBytes?: number
    maxEntries?: number
    ttlMs?: number
  }) {
    const envMax = Number(process.env['WECHATY_PUPPET_SERVICE_MAX_FILE_BYTES'])
    this.maxBytes = options?.maxBytes
      ?? (Number.isFinite(envMax) && envMax > 0 ? envMax : DEFAULT_MAX_FILE_BYTES)
    this.maxTotalBytes = options?.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  }

  private async ensureDir (): Promise<string> {
    if (this.dirPath) {
      return this.dirPath
    }
    if (!this.dirInitPromise) {
      const candidate = path.join(os.tmpdir(), `wechaty-puppet-files-${crypto.randomUUID()}`)
      this.dirInitPromise = mkdir(candidate, { recursive: true })
        .then(() => {
          this.dirPath = candidate
          this.sweepTimer = setInterval(() => {
            void this.evictExpired()
          }, Math.min(this.ttlMs, 60_000))
          this.sweepTimer.unref?.()
          return candidate
        })
        .catch((err) => {
          this.dirInitPromise = undefined
          throw err
        })
    }
    return await this.dirInitPromise
  }

  private async deleteEntry (id: string, entry: StagedFileEntry): Promise<void> {
    if (this.entries.delete(id)) {
      this.totalBytes = Math.max(0, this.totalBytes - entry.size)
      await unlink(entry.filePath).catch(() => {})
    }
  }

  /**
   * Stream an incoming HTTP request body to a temporary file while enforcing
   * per-file and total staging limits (with in-flight reservations for concurrent uploads).
   * Drains excess request bytes rather than destroying the socket so the server can
   * deliver an HTTP 413 response cleanly.
   */
  public async stageFromStream (
    stream: Readable,
    meta: { name?: string; mimeType?: string },
  ): Promise<StagedFileEntry> {
    await this.evictExpired()
    if (this.entries.size + this.reservedEntries >= this.maxEntries) {
      stream.resume()
      throw new PayloadTooLargeError(`Staged file entry limit (${this.maxEntries}) reached`)
    }

    this.reservedEntries += 1
    let myReservedBytes = 0
    let filePath = ''

    try {
      const dir = await this.ensureDir()
      const id = crypto.randomUUID()
      filePath = path.join(dir, id)
      const name = (meta.name && path.basename(meta.name)) || `${id}.bin`
      const mimeType = meta.mimeType || 'application/octet-stream'

      let size = 0
      const writeStream = createWriteStream(filePath)

      await new Promise<void>((resolve, reject) => {
        let settled = false
        let failed = false

        const fail = (err: Error, drainInput = false) => {
          if (settled) return
          settled = true
          failed = true
          writeStream.destroy()
          if (drainInput) {
            // Drain remaining request body so HTTP/1.1 can still send 413 before closing.
            stream.resume()
          } else {
            stream.destroy()
          }
          reject(err)
        }

        const onData = (chunk: Buffer) => {
          if (failed || settled) return
          size += chunk.length
          if (size > this.maxBytes) {
            stream.removeListener('data', onData)
            fail(new PayloadTooLargeError(`Uploaded file exceeds maximum size of ${this.maxBytes} bytes`), true)
            return
          }
          if (this.totalBytes + this.reservedBytes + chunk.length > this.maxTotalBytes) {
            stream.removeListener('data', onData)
            fail(new PayloadTooLargeError(`Staged file store exceeds total capacity of ${this.maxTotalBytes} bytes`), true)
            return
          }
          this.reservedBytes += chunk.length
          myReservedBytes += chunk.length
          if (!writeStream.write(chunk)) {
            stream.pause()
            writeStream.once('drain', () => {
              if (!failed && !settled) stream.resume()
            })
          }
        }

        stream.on('data', onData)

        stream.once('end', () => {
          if (failed || settled) return
          writeStream.end((err?: Error | null) => {
            if (settled) return
            settled = true
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })

        stream.once('error', (err) => fail(err, false))
        writeStream.once('error', (err) => fail(err, true))
      })

      const entry: StagedFileEntry = {
        id,
        url: `/files/${id}`,
        name,
        mimeType,
        size,
        filePath,
        expiresAt: Date.now() + this.ttlMs,
      }
      this.entries.set(id, entry)
      this.totalBytes += size
      return entry
    } catch (err) {
      if (filePath) {
        await unlink(filePath).catch(() => {})
      }
      throw err
    } finally {
      this.reservedEntries = Math.max(0, this.reservedEntries - 1)
      this.reservedBytes = Math.max(0, this.reservedBytes - myReservedBytes)
    }
  }

  /**
   * Retrieve a non-expired staged file entry by ID.
   */
  public get (id: string): StagedFileEntry | undefined {
    const entry = this.entries.get(id)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      void this.deleteEntry(id, entry)
      return undefined
    }
    return entry
  }

  private async evictExpired (): Promise<void> {
    const now = Date.now()
    for (const [id, entry] of this.entries) {
      if (now > entry.expiresAt) {
        await this.deleteEntry(id, entry)
      }
    }
  }

  /**
   * Stop the eviction timer and remove all staged files from disk.
   */
  public async destroy (): Promise<void> {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer)
      this.sweepTimer = undefined
    }
    this.entries.clear()
    this.totalBytes = 0
    this.reservedBytes = 0
    this.reservedEntries = 0
    this.dirInitPromise = undefined
    if (this.dirPath) {
      const dir = this.dirPath
      this.dirPath = undefined
      await rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  }

}
