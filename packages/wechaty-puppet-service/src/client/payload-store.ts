import path from 'path'
import os from 'os'
import fs from 'fs'

import semverPkg from 'semver'

import {
  log,
  // MessagePayload,
  ContactPayload,
  RoomPayload,
  RoomMemberPayload,
}                     from 'wechaty-puppet'

import { FlashStore } from 'flash-store'
// import LRU            from 'lru-cache'

import { VERSION } from '../config.js'

const { major, minor } = semverPkg

interface PayloadStoreOptions {
  token: string
}

class PayloadStore {

  // public message?    : LRU<string, MessagePayload>

  public contact?    : FlashStore<string, ContactPayload>
  public roomMember? : FlashStore<string, RoomMemberPayload>
  public room?       : FlashStore<string, RoomPayload>

  protected storeDir:   string
  protected accountId?: string

  constructor (private options: PayloadStoreOptions) {
    log.verbose('PayloadStore', 'constructor(%s)', JSON.stringify(options))

    this.storeDir = path.join(
      os.homedir(),
      '.wechaty',
      'wechaty-puppet-service',
      this.options.token,
      `v${major(VERSION)}.${minor(VERSION)}`,
    )
    log.silly('PayloadStore', 'constructor() storeDir: "%s"', this.storeDir)
  }

  /**
   * When starting the store, we need to know the accountId
   *  so that we can save the payloads under a specific account folder.
   */
  async start (accountId: string): Promise<void> {
    log.verbose('PayloadStore', 'start(%s)', accountId)

    if (this.accountId) {
      throw new Error('PayloadStore should be stop() before start() again.')
    }
    this.accountId = accountId

    const accountDir = path.join(this.storeDir, accountId)

    if (!fs.existsSync(accountDir)) {
      fs.mkdirSync(accountDir, { recursive: true })
    }

    this.contact    = new FlashStore(path.join(accountDir, 'contact-payload'))
    this.roomMember = new FlashStore(path.join(accountDir, 'room-member-payload'))
    this.room       = new FlashStore(path.join(accountDir, 'room-payload'))

    /**
     * LRU
     *
     * Huan(202108): the Wechaty Puppet has LRU cache already,
     *  there's no need to do it again.
     *
     * We can focus on providing a persistent store for the performance.
     */
    // const lruOptions: LRU.Options<string, MessagePayload> = {
    //   dispose (key, val) {
    //     log.silly('PayloadStore', `constructor() lruOptions.dispose(${key}, ${JSON.stringify(val)})`)
    //   },
    //   max    : 1000,  // 1000 messages
    //   maxAge : 60 * 60 * 1000,  // 1 hour
    // }
    // this.message = new LRU(lruOptions)
  }

  async stop (): Promise<void> {
    log.verbose('PayloadStore', 'stop()')

    const contactStore    = this.contact
    const roomMemberStore = this.roomMember
    const roomStore       = this.room
    /**
      * Huan(202108): we must set all the instances of the store to underfined
      *   in the current event loop as soon as possible
      *   to prevent the future store calls.
      */
    this.contact    = undefined
    this.roomMember = undefined
    this.room       = undefined

    // LRU
    // this.message    = undefined

    // clear accountId
    this.accountId  = undefined

    await contactStore?.close()
    await roomMemberStore?.close()
    await roomStore?.close()
  }

  async destroy (): Promise<void> {
    log.verbose('PayloadStore', 'destroy()')
    if (this.accountId) {
      throw new Error('Can not destroy() a start()-ed store. Call stop() to stop it first')
    }

    /**
     * Huan(202108): `fs.rm` was introduced from Node.js v14.14
     *  https://nodejs.org/api/fs.html#fs_fspromises_rm_path_options
     */
    await fs.promises.rmdir(this.storeDir, {
      // force: true,
      recursive: true,
    })
  }

  roomMemberId (
    roomId: string,
    memberId: string,
  ): string {
    return roomId + '-' + memberId
  }

}

export { PayloadStore }
