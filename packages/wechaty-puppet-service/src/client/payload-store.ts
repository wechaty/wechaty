import path from 'path'
import os from 'os'
import fs from 'fs'

import { major, minor } from 'semver'

import {
  log,
  MessagePayload,
  ContactPayload,
  RoomPayload,
  RoomMemberPayload,
}                     from 'wechaty-puppet'

import { FlashStore } from 'flash-store'
import LRU            from 'lru-cache'

import { VERSION } from '../version'

interface PayloadStoreOptions {
  token: string
}

class PayloadStore {

  public message?    : LRU<string, MessagePayload>

  public contact?    : FlashStore<string, ContactPayload>
  public roomMember? : FlashStore<string, RoomMemberPayload>
  public room?       : FlashStore<string, RoomPayload>

  protected storeDir: string

  constructor (private options: PayloadStoreOptions) {
    log.verbose('PayloadStore', 'constructor(%s)', JSON.stringify(options))

    this.storeDir = path.join(
      os.homedir(),
      '.wechaty',
      `wechaty-puppet-service-v${major(VERSION)}.${minor(VERSION)}`,
      `flash-store-v${major(FlashStore.VERSION)}.${minor(FlashStore.VERSION)}`,
      this.options.token,
    )
    log.silly('PayloadStore', 'constructor() storeDir: "%s"', this.storeDir)
  }

  async start (): Promise<void> {
    log.verbose('PayloadStore', 'start()')

    if (this.message) {
      throw new Error('PayloadStore should be stop() before start() again.')
    }

    if (!fs.existsSync(this.storeDir)) {
      fs.mkdirSync(this.storeDir, { recursive: true })
    }

    this.contact    = new FlashStore(path.join(this.storeDir, 'contact-payload'))
    this.roomMember = new FlashStore(path.join(this.storeDir, 'room-member-payload'))
    this.room       = new FlashStore(path.join(this.storeDir, 'room-payload'))

    /**
     * LRU
     */
    const lruOptions: LRU.Options<string, MessagePayload> = {
      dispose (key, val) {
        log.silly('PayloadStore', `constructor() lruOptions.dispose(${key}, ${JSON.stringify(val)})`)
      },
      max    : 1000,  // 1000 messages
      maxAge : 60 * 60 * 1000,  // 1 hour
    }
    this.message = new LRU(lruOptions)
  }

  async stop (): Promise<void> {
    log.verbose('PayloadStore', 'stop()')

    // LRU
    this.message = undefined

    await this.contact?.close()
    await this.roomMember?.close()
    await this.room?.close()

    this.contact    = undefined
    this.roomMember = undefined
    this.room       = undefined
  }

  async destroy (): Promise<void> {
    log.verbose('PayloadStore', 'destroy()')
    if (this.message) {
      throw new Error('Can not destroy() a start()-ed store. Call stop() first')
    }

    await fs.promises.rm(this.storeDir, {
      force: true,
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
