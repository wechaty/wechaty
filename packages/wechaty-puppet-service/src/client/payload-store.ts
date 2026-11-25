/**
 * `PayloadStore`: a persistent cache (via `flash-store`, backed by LMDB on
 * Node/Deno and IndexedDB in Chromium) of contact, room and room member payloads
 * that `PuppetService` keeps across restarts.
 *
 * Under Node.js and Deno, storage files are placed on disk under
 * `~/.wechaty/wechaty-puppet-service/<token>/v<major>.<minor>/<accountId>/`.
 * In browser environments, storage binds directly to origin-scoped IndexedDB
 * stores named `wechaty-puppet-service-<token>-v<major>.<minor>/<accountId>/<type>`.
 *
 * `PuppetService` starts it on `login` and stops it on `logout` and in
 * `onStop()`; the payloads are only a cache of what the server returns.
 */
/**
 *   Wechaty Open Source Software - https://github.com/wechaty
 *
 *   @copyright 2016 Huan Li <huan@chatie.io>, and
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

import type * as PUPPET from 'wechaty-puppet'

import { FlashStore } from 'flash-store'

import {
  VERSION,
  log,
}             from '../config.ts'

const [versionMajor = '0', versionMinor = '0'] = VERSION.replace(/^v/, '').split('.')

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
  private openedStoreNames = new Set<string>()

  /**
   * The tail of the lifecycle queue: `start()`'s open, `stop()`'s close and
   * `destroy()`'s removal run one after another, in call order. Login and
   * logout drive the store from event listeners that nobody awaits, so these
   * calls overlap; the queue keeps a LevelDB folder from being reopened
   * before its previous close finished. Settles (never rejects) after the
   * last queued step.
   */
  private lifecycle: Promise<void> = Promise.resolve()

  /**
   * Counts `stop()` calls. A queued open compares it with the count its
   * `start()` saw and skips opening when a `stop()` came in between, so a
   * finished `stop()` never leaves stores open.
   */
  private stopCount = 0

  private options: PayloadStoreOptions

  constructor (options: PayloadStoreOptions) {
    this.options = options
    log.verbose('PayloadStore', 'constructor(%s)', JSON.stringify(options))

    const homedir = typeof os?.homedir === 'function' ? os.homedir() : ''
    this.storeDir = homedir
      ? path.join(
          homedir,
          '.wechaty',
          'wechaty-puppet-service',
          this.options.token,
          `v${versionMajor}.${versionMinor}`,
        )
      : `wechaty-puppet-service-${this.options.token}-v${versionMajor}`
    log.silly('PayloadStore', 'constructor() storeDir: "%s"', this.storeDir)
  }

  /**
   * Queues `step` after every earlier lifecycle step. The returned promise
   * reports the step's own outcome; the queue itself keeps going.
   */
  private enqueue (step: () => Promise<void>): Promise<void> {
    const run = this.lifecycle.then(step)
    this.lifecycle = run.catch(() => undefined)
    return run
  }

  /**
   * Opens the stores of `accountId` (the payloads are kept per account).
   * Throws at once when the store is already started. The open waits for
   * earlier lifecycle steps, such as the close of a previous `stop()`, and is
   * skipped when `stop()` is called before it runs.
   */
  async start (accountId: string): Promise<void> {
    log.verbose('PayloadStore', 'start(%s)', accountId)

    if (this.accountId) {
      throw new Error('PayloadStore should be stop() before start() again.')
    }
    this.accountId = accountId
    const stopCount = this.stopCount

    await this.enqueue(async () => {
      if (stopCount !== this.stopCount) {
        log.verbose('PayloadStore', 'start(%s) skipped: stop() was called first', accountId)
        return
      }

      const accountDir = path.join(this.storeDir, accountId)

      if (typeof fs?.existsSync === 'function' && typeof fs?.mkdirSync === 'function') {
        if (!fs.existsSync(accountDir)) {
          fs.mkdirSync(accountDir, { recursive: true })
        }
      }

      const contactPath = path.join(accountDir, 'contact-payload')
      const roomMemberPath = path.join(accountDir, 'room-member-payload')
      const roomPath = path.join(accountDir, 'room-payload')

      this.openedStoreNames.add(contactPath)
      this.openedStoreNames.add(roomMemberPath)
      this.openedStoreNames.add(roomPath)

      // No await from here on: stop() detaches whatever this step has opened,
      // so the three stores must appear together.
      this.contact    = new FlashStore(contactPath)
      this.roomMember = new FlashStore(roomMemberPath)
      this.room       = new FlashStore(roomPath)
    })

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

  /**
   * Detaches the stores at once and cancels a `start()` whose open has not
   * run yet, then resolves when every earlier lifecycle step, including the
   * close of the detached stores, has finished. Safe to call more than once:
   * a call that finds nothing to detach still waits for the closes in
   * flight. `PuppetService` stops the store both from its `logout` listener,
   * which nothing awaits, and from `onStop()`, which relies on this wait.
   * Rejects when closing one of its own stores fails.
   */
  async stop (): Promise<void> {
    log.verbose('PayloadStore', 'stop()')

    this.stopCount++

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

    await this.enqueue(async () => {
      await Promise.all([
        contactStore?.close(),
        roomMemberStore?.close(),
        roomStore?.close(),
      ])
    })
  }

  /**
   * Removes the token's store folder or IndexedDB stores, after earlier lifecycle steps finish.
   * Throws when the store is started.
   */
  async destroy (): Promise<void> {
    log.verbose('PayloadStore', 'destroy()')
    if (this.accountId) {
      throw new Error('Can not destroy() a start()-ed store. Call stop() to stop it first')
    }

    await this.enqueue(async () => {
      if (typeof fs?.promises?.rm === 'function') {
        await fs.promises.rm(this.storeDir, {
          force     : true,
          recursive : true,
        })
      }
      if (typeof indexedDB !== 'undefined' && typeof indexedDB.deleteDatabase === 'function') {
        for (const name of this.openedStoreNames) {
          indexedDB.deleteDatabase(name)
        }
        this.openedStoreNames.clear()
      }
    })
  }

}

export { PayloadStore }
