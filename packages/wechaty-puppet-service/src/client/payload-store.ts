/**
 *   Wechaty Open Source Software - https://github.com/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import path from 'path'
import os from 'os'
import fs from 'fs'

import semverPkg from 'semver'

import type * as PUPPET from 'wechaty-puppet'

import { FlashStore } from 'flash-store'

import {
  VERSION,
  log,
}             from '../config.js'

const { major, minor } = semverPkg

interface PayloadStoreOptions {
  token: string
}

interface StoreRoomMemberPayload {
  [roomMemberContactId: string]: PUPPET.payloads.RoomMember
}

class PayloadStore {

  // public message?    : LRU<string, MessagePayload>

  public contact?    : FlashStore<string, PUPPET.payloads.Contact>
  public roomMember? : FlashStore<string, StoreRoomMemberPayload>
  public room?       : FlashStore<string, PUPPET.payloads.Room>

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

}

export { PayloadStore }
