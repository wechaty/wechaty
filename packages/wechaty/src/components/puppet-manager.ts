/**
 * Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 * @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Puppet lifecycle, provider resolution, and event bridge manager for Wechaty bot instances.
 *
 * Why this module exists:
 * Encapsulates puppet resolution, memory multiplexing, persistent event bridging,
 * and start/stop/ready lifecycle coordination, replacing the legacy `puppetMixin`.
 *
 * Architectural boundaries:
 * Owned by `Wechaty`. Internal to `packages/wechaty/src/components/`.
 */
import * as PUPPET from 'wechaty-puppet'
import { log, WechatyEvent } from 'wechaty-puppet'
import type { LifecycleWaitOptions } from 'scopelet'

import { config } from '../config.ts'
import { NO_PUPPET_MESSAGE } from '../puppet-config.ts'
import type { ContactImpl, RoomImpl } from '../user-modules/mod.ts'
import { registerPuppetEventBridge } from '../wechaty-mixins/puppet-event-bridge.ts'
import type { WechatyOptions } from '../schemas/wechaty-options.ts'
import type { Wechaty } from '../wechaty/wechaty.ts'

const PUPPET_MEMORY_NAME = 'puppet'

export class PuppetManager {

  readonly #wechaty: Wechaty
  readonly #options: WechatyOptions

  #puppet?: PUPPET.Puppet
  #initialized = false
  readonly #puppetInitResolvers: Array<(puppet: PUPPET.Puppet) => void> = []
  readonly #lastPuppetErrors = new Set<unknown>()

  constructor (wechaty: Wechaty, options: WechatyOptions) {
    this.#wechaty = wechaty
    this.#options = options
  }

  get hasPuppet (): boolean {
    return !!this.#puppet
  }

  get puppet (): PUPPET.Puppet {
    if (!this.#puppet) {
      throw new Error('NOPUPPET')
    }
    return this.#puppet
  }

  get isInitialized (): boolean {
    return this.#initialized
  }

  /**
   * Retrieves the current puppet instance or awaits its initialization.
   * If a signal is provided and aborts before initialization completes,
   * the returned promise rejects with the abort reason and unregisters the waiter.
   *
   * @param signal - Optional AbortSignal to cancel waiting.
   * @returns Promise resolving to the initialized Puppet.
   */
  getPuppetOrWait (signal?: AbortSignal): Promise<PUPPET.Puppet> {
    if (this.#puppet) {
      return Promise.resolve(this.#puppet)
    }
    return new Promise<PUPPET.Puppet>((resolve, reject) => {
      if (signal?.aborted) {
        return reject(signal.reason)
      }
      const resolver = (puppet: PUPPET.Puppet) => {
        signal?.removeEventListener('abort', onAbort)
        resolve(puppet)
      }
      const onAbort = () => {
        const idx = this.#puppetInitResolvers.indexOf(resolver)
        if (idx >= 0) {
          this.#puppetInitResolvers.splice(idx, 1)
        }
        reject(signal!.reason)
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      this.#puppetInitResolvers.push(resolver)
    })
  }

  async ready (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('PuppetManager', 'ready()')
    const puppet = await this.getPuppetOrWait(options?.signal)
    return puppet.ready(options)
  }

  async init (): Promise<void> {
    log.verbose('PuppetManager', 'init()')
    if (this.#initialized) {
      log.verbose('PuppetManager', 'init() skipped: already initialized.')
      return
    }

    const puppet = this.#options.puppet || config.systemPuppetName()
    if (!puppet) {
      throw new Error(NO_PUPPET_MESSAGE)
    }

    log.verbose('PuppetManager', 'init() instantiating puppet instance ...')
    const puppetInstance = await PUPPET.helpers.resolvePuppet({
      puppet,
      puppetOptions: 'puppetOptions' in this.#options
        ? this.#options.puppetOptions
        : undefined,
    })
    log.verbose('PuppetManager', 'init() instantiating puppet instance ... done')

    // Multiplex memory card for puppet
    log.verbose('PuppetManager', 'init() setting memory ...')
    const puppetMemory = this.#wechaty.memory.multiplex(PUPPET_MEMORY_NAME)
    puppetInstance.setMemory(puppetMemory)
    log.verbose('PuppetManager', 'init() setting memory ... done')

    // Register event bridge
    log.verbose('PuppetManager', 'init() setting up events ...')
    this.#setupPuppetEvents(puppetInstance)
    log.verbose('PuppetManager', 'init() setting up events ... done')

    // Dispatch puppet event
    log.verbose('PuppetManager', 'init() emitting "puppet" event ...')
    this.#wechaty.dispatchEvent(new WechatyEvent('puppet', { detail: puppetInstance }))
    log.verbose('PuppetManager', 'init() emitting "puppet" event ... done')

    this.#puppet = puppetInstance
    this.#initialized = true
    this.#puppetInitResolvers.forEach(resolve => resolve(puppetInstance))
    this.#puppetInitResolvers.length = 0
  }

  async start (): Promise<void> {
    log.verbose('PuppetManager', 'start()')
    await this.puppet.start()
  }

  async stop (): Promise<void> {
    log.verbose('PuppetManager', 'stop()')
    if (!this.#puppet) {
      log.verbose('PuppetManager', 'stop() skipped: no puppet instantiated.')
      return
    }
    await this.#puppet.stop()
  }

  recordPuppetError (error: unknown): void {
    this.#lastPuppetErrors.add(error)
    if (error && typeof error === 'object') {
      if ('cause' in error && (error as any).cause) {
        this.#lastPuppetErrors.add((error as any).cause)
      }
      if ('message' in error && (error as Error).message) {
        this.#lastPuppetErrors.add((error as Error).message)
      }
    }
    while (this.#lastPuppetErrors.size > 20) {
      const first = this.#lastPuppetErrors.values().next().value
      this.#lastPuppetErrors.delete(first)
    }
  }

  hasEmittedPuppetError (error: unknown): boolean {
    if (this.#lastPuppetErrors.has(error)) {
      return true
    }
    if (error && typeof error === 'object') {
      if ('cause' in error && this.#lastPuppetErrors.has((error as any).cause)) {
        return true
      }
      if ('message' in error && this.#lastPuppetErrors.has((error as Error).message)) {
        return true
      }
    }
    return false
  }

  #setupPuppetEvents (puppet: PUPPET.Puppet): void {
    registerPuppetEventBridge(puppet, {
      contactFind: id => this.#wechaty.Contact.find({ id }),
      contactReady: async id => {
        const contact = await this.#wechaty.Contact.find({ id }) as unknown as undefined | ContactImpl
        await contact?.ready(true)
      },
      contactSelfFind: id => this.#wechaty.ContactSelf.find({ id }),
      friendshipLoad: id => this.#wechaty.Friendship.load(id),
      messageFind: id => this.#wechaty.Message.find({ id }),
      postFind: id => this.#wechaty.Post.find({ id }),
      roomFind: id => this.#wechaty.Room.find({ id }),
      roomInvitationLoad: id => this.#wechaty.RoomInvitation.load(id),
      roomReady: async id => {
        const room = await this.#wechaty.Room.find({ id }) as unknown as undefined | RoomImpl
        await room?.ready(true)
      },
      dispatchEvent: this.#wechaty.dispatchEvent.bind(this.#wechaty),
      emitError: error => this.#wechaty.emitError(error),
      recordPuppetError: error => this.recordPuppetError(error),
    })
  }

}
