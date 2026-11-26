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
import {
  GError,
  timeoutPromise,
  TimeoutPromiseGError,
} from 'gerror'
import { StateSwitch, type StateSwitchInterface } from 'state-switch'

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
  readonly #readyState: StateSwitchInterface

  #puppet?: PUPPET.Puppet
  #initialized = false

  constructor (wechaty: Wechaty, options: WechatyOptions) {
    this.#wechaty = wechaty
    this.#options = options
    this.#readyState = new StateSwitch('WechatyReady', { log })
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

  async ready (): Promise<void> {
    log.verbose('PuppetManager', 'ready()')
    await this.#readyState.stable('active')
    log.silly('PuppetManager', 'ready() this.readyState.stable(active) resolved')
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
  }

  async start (): Promise<void> {
    log.verbose('PuppetManager', 'start()')

    if (this.#readyState.active()) {
      this.#readyState.inactive(true)
    }

    try {
      log.verbose('PuppetManager', 'start() starting puppet ...')
      await timeoutPromise(
        this.puppet.start(),
        15 * 1000,
      )
      log.verbose('PuppetManager', 'start() starting puppet ... done')
    } catch (e) {
      if (e instanceof TimeoutPromiseGError) {
        log.warn('PuppetManager', 'start() starting puppet ... timeout')
        log.warn('PuppetManager', 'start() puppet info: %s', this.puppet)
      } else {
        throw GError.from(e)
      }
    }
  }

  async stop (): Promise<void> {
    log.verbose('PuppetManager', 'stop()')
    if (!this.#puppet) {
      log.verbose('PuppetManager', 'stop() skipped: no puppet instantiated.')
      return
    }
    try {
      log.verbose('PuppetManager', 'stop() stopping puppet ...')
      await timeoutPromise(
        this.#puppet.stop(),
        15 * 1000,
      )
      log.verbose('PuppetManager', 'stop() stopping puppet ... done')
    } catch (e) {
      if (e instanceof TimeoutPromiseGError) {
        log.warn('PuppetManager', 'stop() stopping puppet ... timeout')
        log.warn('PuppetManager', 'stop() puppet info: %s', this.#puppet)
      } else {
        log.error('PuppetManager', 'stop() exception: %s', (e as Error).message)
        this.#wechaty.emitError(e)
      }
    }
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
      setReady: state => {
        if (state === 'active') {
          this.#readyState.active(true)
        } else {
          this.#readyState.inactive(true)
        }
      },
      dispatchEvent: this.#wechaty.dispatchEvent.bind(this.#wechaty),
      emitError: error => this.#wechaty.emitError(error),
    })
  }

}
