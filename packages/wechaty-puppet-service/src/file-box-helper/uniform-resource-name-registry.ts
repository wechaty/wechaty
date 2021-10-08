/**
 * Huan(202110): Assignment and Resolution of Uniform Resource Names
 *  https://datatracker.ietf.org/wg/urn/about/
 *
 * Uniform Resource Name namespace for UUIDs (Universally Unique IDentifier),
 * also known as GUIDs (Globally Unique IDentifier).
 *
 * A UUID is 128 bits long, and can guarantee uniqueness across space and time.
 * UUIDs were originally used in the Apollo Network Computing System
 * and later in the Open Software Foundation's (OSF) Distributed Computing Environment (DCE),
 * and then in Microsoft Windows platforms.
 */
import fs     from 'fs'
import os     from 'os'
import path   from 'path'

import type { Readable } from 'stream'

import { log }              from 'wechaty-puppet'
import { instanceToClass }  from 'clone-class'

import {
  randomUuid,
}               from './random-uuid.js'

/**
 * A UUID will be only keep for a certain time.
 */
const DEFAULT_UUID_EXPIRE_MINUTES = 30

interface UuidFileManagerOptions {
  expireMilliseconds? : number,
  storeDir?           : string,
}

class UniformResourceNameRegistry {

  protected static removeProcessExitListenerMap = new WeakMap<
    UniformResourceNameRegistry,
    Function
  >()

  protected storeDir      : string
  protected uuidTimerMap : Map<string, ReturnType<typeof setTimeout>>

  protected expireMilliseconds: number

  constructor (
    options: UuidFileManagerOptions = {},
  ) {
    log.verbose('UniformResourceNameRegistry', 'constructor("%s")', JSON.stringify(options))

    this.uuidTimerMap = new Map()

    this.expireMilliseconds = options.expireMilliseconds ?? (DEFAULT_UUID_EXPIRE_MINUTES * 60 * 1000 * 1000)
    this.storeDir = options.storeDir || path.join(
      os.tmpdir(),
      'uniform-resource-name-registry.' + String(process.pid),
    )
  }

  async init () {
    log.verbose('UniformResourceNameRegistry', 'init()')

    try {
      const stat = await fs.promises.stat(this.storeDir)
      if (!stat.isDirectory()) {
        throw new Error(this.storeDir + ' is Not a directory')
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.promises.mkdir(this.storeDir, { recursive: true })
      } else {
        throw e
      }
    }

    await this.addProcessExitListener()
  }

  /**
   * Clean up by calling this.destroy() before process exit
   */
  protected async addProcessExitListener () {
    log.verbose('UniformResourceNameRegistry', 'addProcessExitListener()')

    const Klass = instanceToClass(this, UniformResourceNameRegistry)

    /**
     * If we have already registered the listener, do nothing.
     */
    if (Klass.removeProcessExitListenerMap.has(this)) {
      return
    }

    const destroyCallback = () => this.destroy()

    process.addListener('exit', destroyCallback)
    Klass.removeProcessExitListenerMap.set(
      this,
      () => process.removeListener('exit', destroyCallback),
    )
  }

  protected uuidFile (uuid: string): string {
    return path.join(
      this.storeDir,
      uuid,
    )
  }

  /**
   * `resolve()` can only be used once.
   *  after resolve(), the UUID will be not exist any more
   */
  async resolve (uuid: string): Promise<Readable> {
    log.verbose('UniformResourceNameRegistry', 'resolve(%s)', uuid)

    /**
     * Check & remove UUID from timer map
     */
    if (!this.uuidTimerMap.has(uuid)) {
      throw new Error('UniformResourceNameRegistry resolve(' + uuid + ') but not exist')
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
    stream.on('end', () => this.delete(uuid))

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
  async register (stream: Readable): Promise<string> {
    log.verbose('UniformResourceNameRegistry', 'register(stream)')

    const uuid = randomUuid()

    const fileStream = fs.createWriteStream(this.uuidFile(uuid))
    const future = new Promise<void>((resolve, reject) => {
      stream.on('end',        resolve)
      stream.on('error',      reject)
      fileStream.on('error',  reject)
    })
    stream.pipe(fileStream)
    await future

    this.addTimer(uuid)

    return uuid
  }

  /**
   * Set a timer to execute delete callback after `expireMilliseconds`
   */
  protected addTimer (uuid: string): void {
    log.verbose('UniformResourceNameRegistry', 'addTimer(%s)', uuid)

    const timer = setTimeout(
      () => this.delete(uuid),
      this.expireMilliseconds,
    )
    this.uuidTimerMap.set(uuid, timer)
  }

  protected async delete (uuid: string): Promise<void> {
    log.verbose('UniformResourceNameRegistry', 'delete(%s)', uuid)

    /**
     * 1. Clear the timer (if there's any)
     */
    const timer = this.uuidTimerMap.get(uuid)
    if (timer) {
      this.uuidTimerMap.delete(uuid)
      clearTimeout(timer)
    }

    /**
    * 2. Delete the file
    */
    const unlinkUuid = this.unlinkFactory(uuid)
    await unlinkUuid()
  }

  protected unlinkFactory (uuid: string) {
    log.verbose('UniformResourceNameRegistry', 'unlinkFactory(%s)', uuid)

    const file = this.uuidFile(uuid)
    return async () => {
      try {
        await fs.promises.unlink(file)
        log.silly('UniformResourceNameRegistry', 'unlinkFactory() unlink(%s)', file)
      } catch (e) {
        log.warn('UniformResourceNameRegistry', 'unlinkFactory() unlink() rejection:', (e as Error).message)
      }
    }
  }

  destroy () {
    log.verbose('UniformResourceNameRegistry', 'destroy() %s UUIDs left', this.uuidTimerMap.size)

    const Klass = instanceToClass(this, UniformResourceNameRegistry)

    /**
     * Remove process exit listener
     */
    if (Klass.removeProcessExitListenerMap.has(this)) {
      const fn = Klass.removeProcessExitListenerMap.get(this)
      Klass.removeProcessExitListenerMap.delete(this)
      fn && fn()
    }

    /**
     * Clean up all the timers
     */
    const timerList = this.uuidTimerMap.values()
    for (const timer of timerList) {
      clearTimeout(timer)
    }

    /**
     * Clean up all the files
     */
    log.verbose('UniformResourceNameRegistry', 'destroy() fs.rmSync(%s) ...', this.storeDir)
    try {
      /**
       * Huan(202110):
       *  Check for the `this.uuidDir` exist or not
       *    when we are running unit tests, we might instanciate multiple UniformResourceNameRegistry
       *    which will cause the `this.destroy()` to be registered multiple times
       */
      fs.statSync(this.storeDir)

      fs.rmSync(this.storeDir, { recursive: true })
      log.verbose('UniformResourceNameRegistry', 'destroy() fs.rmSync(%s) done', this.storeDir)

    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        log.verbose('UniformResourceNameRegistry', 'destroy() %s not exist', this.storeDir)
        return
      }
      log.warn('UniformResourceNameRegistry', 'destroy() fs.rmSync(%s) exception: %s', (e as Error).message)
    }
  }

}

export { UniformResourceNameRegistry }
