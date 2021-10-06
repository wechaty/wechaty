import fs     from 'fs'
import os     from 'os'
import path   from 'path'

import type { Readable } from 'stream'

import { log } from 'wechaty-puppet'

import {
  randomUuid,
}               from './random-uuid.js'

/**
 * A UUID will be only keep for a certain time.
 */
const DEFAULT_UUID_EXPIRE_MINUTES = 30

interface UuidFileManagerOptions {
  expireMilliseconds?: number,
}

class UuidFileManager {

  protected uuidDir      : string
  protected uuidTimerMap : Map<string, ReturnType<typeof setTimeout>>

  protected expireMilliseconds: number

  constructor (
    options: UuidFileManagerOptions = {},
  ) {
    log.verbose('UuidFileManager', 'constructor("%s")', JSON.stringify(options))

    this.uuidDir = path.join(
      os.tmpdir(),
      'uuid-file-manager.' + String(process.pid),
    )
    this.uuidTimerMap = new Map()

    this.expireMilliseconds = options.expireMilliseconds ?? (DEFAULT_UUID_EXPIRE_MINUTES * 60 * 1000 * 1000)
  }

  async init () {
    log.verbose('UuidFileManager', 'init()')

    try {
      const stat = await fs.promises.stat(this.uuidDir)
      if (!stat.isDirectory()) {
        throw new Error(this.uuidDir + ' is Not a directory')
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.promises.mkdir(this.uuidDir, { recursive: true })
      } else {
        throw e
      }
    }

    /**
     * We will remove all the UUID files before exit the Node.js program
     */
    process.addListener('exit', () => this.destroy())
  }

  protected uuidFile (uuid: string): string {
    return path.join(
      this.uuidDir,
      uuid,
    )
  }

  /**
   * `load()` can only be used once.
   *  after load, the UUID will be not exist any more
   */
  async load (uuid: string): Promise<Readable> {
    log.verbose('UuidFileManager', 'load(%s)', uuid)

    /**
     * Check & remove UUID from timer map
     */
    if (!this.uuidTimerMap.has(uuid)) {
      throw new Error('UuidFileManager load(' + uuid + ') but not exist')
    }

    const timer = this.uuidTimerMap.get(uuid)
    this.uuidTimerMap.delete(uuid)
    if (timer) {
      clearTimeout(timer)
    }

    const file    = this.uuidFile(uuid)
    const stream  = fs.createReadStream(file)

    /**
     * Remove the file after read
     */
    stream.on('end', () => this.deregister(uuid))

    await new Promise<void>((resolve, reject) => {
      stream.on('ready', resolve)
      stream.on('error', reject)
    })

    return stream
  }

  /**
   * Save the `Readable` stream and return a random UUID
   *  The UUID will be expired after MAX_KEEP_MINUTES
   */
  async save (stream: Readable): Promise<string> {
    log.verbose('UuidFileManager', 'save(stream)')

    const uuid = randomUuid()

    const fileStream = fs.createWriteStream(this.uuidFile(uuid))
    const future = new Promise<void>((resolve, reject) => {
      stream.on('end',        resolve)
      stream.on('error',      reject)
      fileStream.on('error',  reject)
    })
    stream.pipe(fileStream)
    await future

    this.register(uuid)

    return uuid
  }

  /**
   * Register a timer to execute cleaner callback after `expireMilliseconds`
   */
  protected register (uuid: string): void {
    log.verbose('UuidFileManager', 'register(%s)', uuid)

    const timer = setTimeout(
      () => this.deregister(uuid),
      DEFAULT_UUID_EXPIRE_MINUTES * 60 * 1000,
    )
    this.uuidTimerMap.set(uuid, timer)
  }

  protected async deregister (uuid: string): Promise<void> {
    log.verbose('UuidFileManager', 'deregister(%s)', uuid)

    /**
     * 1. Remove the timer (if there's any)
     */
    const timer = this.uuidTimerMap.get(uuid)
    if (timer) {
      this.uuidTimerMap.delete(uuid)
      clearTimeout(timer)
    }

    /**
    * 2. Remove the file
    */
    const unlinkUuid = this.unlinkFactory(uuid)
    await unlinkUuid()
  }

  protected unlinkFactory (uuid: string) {
    log.verbose('UuidFileManager', 'unlinkFactory(%s)', uuid)

    const file = this.uuidFile(uuid)
    return async () => {
      try {
        await fs.promises.unlink(file)
        log.silly('UuidFileManager', 'unlinkFactory() unlink(%s)', file)
      } catch (e) {
        log.warn('UuidFileManager', 'unlinkFactory() unlink() rejection:', (e as Error).message)
      }
    }
  }

  destroy () {
    log.verbose('UuidFileManager', 'destroy() %s UUIDs left', this.uuidTimerMap.size)

    /**
     * Huan(202110):
     *  Check for the `this.uuidDir` exist or not
     *    when we are running unit tests, we might instanciate multiple UuidFileManager
     *    which will cause the `this.destroy()` to be registered multiple times
     */
    try {
      fs.statSync(this.uuidDir)
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        log.verbose('UuidFileManager', 'destroy() %s not exist', this.uuidDir)
        return
      } else {
        throw e
      }
    }

    ;[...this.uuidTimerMap.values()].forEach(clearTimeout)

    log.verbose('UuidFileManager', 'destroy() fs.rmSync(%s) ...', this.uuidDir)
    try {
      fs.rmSync(this.uuidDir, { recursive: true })
      log.verbose('UuidFileManager', 'destroy() fs.rmSync(%s) done', this.uuidDir)
    } catch (e) {
      log.warn('UuidFileManager', 'destroy() fs.rmSync(%s) exception: %s', (e as Error).message)
    }
  }

}

export { UuidFileManager }
