/**
 * Ephemeral disk-backed staging store for `POST /files` and `GET /files/:id` on
 * `PuppetServer`, enforcing max upload byte limits and automatic TTL eviction
 * without buffering entire files in memory.
 */
import crypto from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rm, unlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Readable } from 'node:stream'

export interface StagedFileEntry {
  id: string
  url: string
  name: string
  mimeType: string
  size: number
  filePath: string
  expiresAt: number
}

export class PayloadTooLargeError extends Error {
  constructor (maxBytes: number) {
    super(`Uploaded file exceeds maximum size of ${maxBytes} bytes`)
    this.name = 'PayloadTooLargeError'
  }
}

const DEFAULT_MAX_FILE_BYTES = 100 * 1024 * 1024 // 100 MiB
const DEFAULT_TTL_MS = 15 * 60 * 1000 // 15 minutes

export class StagedFileStore {

  private readonly entries = new Map<string, StagedFileEntry>()
  private readonly maxBytes: number
  private readonly ttlMs: number
  private dirPath?: string
  private sweepTimer?: ReturnType<typeof setInterval>

  constructor (options?: { maxBytes?: number; ttlMs?: number }) {
    const envMax = Number(process.env['WECHATY_PUPPET_SERVICE_MAX_FILE_BYTES'])
    this.maxBytes = options?.maxBytes
      ?? (Number.isFinite(envMax) && envMax > 0 ? envMax : DEFAULT_MAX_FILE_BYTES)
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  }

  private async ensureDir (): Promise<string> {
    if (!this.dirPath) {
      this.dirPath = path.join(os.tmpdir(), `wechaty-puppet-files-${crypto.randomUUID()}`)
      await mkdir(this.dirPath, { recursive: true })
      this.sweepTimer = setInterval(() => {
        void this.evictExpired()
      }, Math.min(this.ttlMs, 60_000))
      this.sweepTimer.unref?.()
    }
    return this.dirPath
  }

  /**
   * Stream an incoming HTTP request body to a temporary file while enforcing `maxBytes`.
   */
  public async stageFromStream (
    stream: Readable,
    meta: { name?: string; mimeType?: string },
  ): Promise<StagedFileEntry> {
    const dir = await this.ensureDir()
    const id = crypto.randomUUID()
    const filePath = path.join(dir, id)
    const name = (meta.name && path.basename(meta.name)) || `${id}.bin`
    const mimeType = meta.mimeType || 'application/octet-stream'

    let size = 0
    const writeStream = createWriteStream(filePath)

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false
        const fail = (err: Error) => {
          if (settled) return
          settled = true
          stream.destroy()
          writeStream.destroy()
          reject(err)
        }

        stream.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > this.maxBytes) {
            fail(new PayloadTooLargeError(this.maxBytes))
            return
          }
          if (!writeStream.write(chunk)) {
            stream.pause()
            writeStream.once('drain', () => stream.resume())
          }
        })

        stream.once('end', () => {
          if (!settled) {
            writeStream.end(() => {
              if (!settled) {
                settled = true
                resolve()
              }
            })
          }
        })

        stream.once('error', fail)
        writeStream.once('error', fail)
      })
    } catch (err) {
      await unlink(filePath).catch(() => {})
      throw err
    }

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
    return entry
  }

  /**
   * Retrieve a non-expired staged file entry by ID.
   */
  public get (id: string): StagedFileEntry | undefined {
    const entry = this.entries.get(id)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(id)
      void unlink(entry.filePath).catch(() => {})
      return undefined
    }
    return entry
  }

  private async evictExpired (): Promise<void> {
    const now = Date.now()
    for (const [id, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(id)
        await unlink(entry.filePath).catch(() => {})
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
    if (this.dirPath) {
      const dir = this.dirPath
      this.dirPath = undefined
      await rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  }

}
