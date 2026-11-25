/**
 * `PayloadStore`: a persistent cache (via `flash-store`) of contact, room and
 * room member payloads that `PuppetService` keeps across restarts, separate
 * for each token, package `<major>.<minor>` and account. It owns the order of
 * opening, closing and removing the stores; `#payload-storage` decides where
 * they live: LMDB folders under
 * `~/.wechaty/wechaty-puppet-service/<token>/v<major>.<minor>/<accountId>/`
 * on Node.js, Deno and Bun, IndexedDB databases in a browser.
 *
 * `PuppetService` starts it on `login` and stops it on `logout` and in
 * `onStop()`; the payloads are only a cache of what the server returns.
 * This module is web-platform code: keep `node:*` out of it.
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
import type * as PUPPET from 'wechaty-puppet'

import { payloadStorage } from '#payload-storage'
import { FlashStore } from 'flash-store'

import {
  VERSION,
  log,
}             from '../config.ts'

/** A new minor version may change the payload shape, so it starts a new cache. */
const CACHE_VERSION = 'v' + VERSION.split('.', 2).join('.')

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

  protected storageRoot: string
  protected accountId?:  string

  /**
   * The tail of the lifecycle queue: `start()`'s open, `stop()`'s close and
   * `destroy()`'s removal run one after another, in call order. Login and
   * logout drive the store from event listeners that nobody awaits, so these
   * calls overlap; the queue keeps a storage backend from being reopened
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

    this.storageRoot = payloadStorage.root(this.options.token, CACHE_VERSION)
    log.silly('PayloadStore', 'constructor() storageRoot: "%s"', this.storageRoot)
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
   * skipped when `stop()` is called before it runs. The three stores open
   * together or not at all: when one fails to open this rejects and leaves
   * the store stopped, so `start()` can be called again.
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

      const opened: { close (): Promise<void> }[] = []
      const open = <T>(storeName: string): FlashStore<string, T> => {
        const store = new FlashStore<string, T>(
          payloadStorage.storePath(this.storageRoot, accountId, storeName),
        )
        opened.push(store)
        return store
      }

      try {
        // No await in here: stop() detaches whatever this step has opened,
        // so the three stores must appear together.
        const contact    = open<PUPPET.payloads.Contact>('contact-payload')
        const roomMember = open<StoreRoomMemberPayload>('room-member-payload')
        const room       = open<PUPPET.payloads.Room>('room-payload')

        this.contact    = contact
        this.roomMember = roomMember
        this.room       = room
      } catch (e) {
        // Opening is synchronous, so no stop() ran since the check above and
        // the account is still the one of this start().
        this.accountId = undefined
        await Promise.allSettled(opened.map(store => store.close()))
        throw e
      }
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
   * Rejects when closing one of its own stores fails, after the others closed.
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
      // Not Promise.all(): the next lifecycle step may reopen these stores, so
      // one failed close must not let it overtake the closes still running.
      const results = await Promise.allSettled([
        contactStore?.close(),
        roomMemberStore?.close(),
        roomStore?.close(),
      ])
      const failure = results.find(result => result.status === 'rejected')
      if (failure) {
        throw failure.reason
      }
    })
  }

  /**
   * Removes the cached payloads of every account of the token, after earlier
   * lifecycle steps finish, no matter which instance stored them. Throws when
   * the store is started, and rejects when something could not be removed;
   * it can then be called again.
   */
  async destroy (): Promise<void> {
    log.verbose('PayloadStore', 'destroy()')
    if (this.accountId) {
      throw new Error('Can not destroy() a start()-ed store. Call stop() to stop it first')
    }

    await this.enqueue(() => payloadStorage.remove(this.storageRoot))
  }

}

export { PayloadStore }
