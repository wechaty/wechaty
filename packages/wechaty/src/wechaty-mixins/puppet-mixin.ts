/**
 * `puppetMixin`: owns the bot's puppet. `init()` resolves it from the
 * options or `WECHATY_PUPPET` (2.0 has no default puppet and throws
 * `NO_PUPPET_MESSAGE` without one), plugs in the bot's memory and bridges the
 * puppet's events to the bot. `start()`, `stop()` and `ready()` follow
 * the puppet's lifecycle and readiness.
 */
import * as PUPPET      from 'wechaty-puppet'
import { log, WechatyEvent } from 'wechaty-puppet'
import type { LifecycleWaitOptions } from 'scopelet'
import {
  GError,
  timeoutPromise,
  TimeoutPromiseGError,
}                       from 'gerror'

import { config }               from '../config.ts'
import { NO_PUPPET_MESSAGE }    from '../puppet-config.ts'
import type {
  ContactImpl,
  RoomImpl,
}                               from '../user-modules/mod.ts'

import { registerPuppetEventBridge } from './puppet-event-bridge.ts'

import type {
  WechatifyUserModuleMixin,
}                               from './wechatify-user-module-mixin.ts'

import type { GErrorMixin } from './gerror-mixin.ts'
import type { IoMixin }     from './io-mixin.ts'

const PUPPET_MEMORY_NAME = 'puppet'
const puppetInitResolversMap = new WeakMap<object, Array<(puppet: PUPPET.Puppet) => void>>()
const lastPuppetErrorsMap = new WeakMap<object, Set<unknown>>()

function getPuppetErrors (target: object): Set<unknown> {
  let errors = lastPuppetErrorsMap.get(target)
  if (!errors) {
    errors = new Set<unknown>()
    lastPuppetErrorsMap.set(target, errors)
  }
  return errors
}

function getResolvers (target: object): Array<(puppet: PUPPET.Puppet) => void> {
  let list = puppetInitResolversMap.get(target)
  if (!list) {
    list = []
    puppetInitResolversMap.set(target, list)
  }
  return list
}

/**
 * Huan(202111): the `wechaty-redux` plugin need to be installed before
 *  the puppet started
 *
 * Plugins that subscribe to the `puppet` event must register their listeners
 *  before the first `init()` emits it. `pluginMixin` is composed outside
 *  `puppetMixin` and has no lifecycle hooks, so the mixin order does not
 *  affect this.
 *
 * Huan(20211128): `puppetMixin` must extend `IoMixin`
 *  because the Io need the puppet instance to be ready when it starts
 */
const puppetMixin = <MixinBase extends WechatifyUserModuleMixin & GErrorMixin & IoMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyPuppetMixin', 'puppetMixin(%s)', mixinBase.name)

  abstract class PuppetMixin extends mixinBase {

    __puppet?: PUPPET.Puppet

    get puppet (): PUPPET.Puppet {
      if (!this.__puppet) {
        throw new Error('NOPUPPET')
      }
      return this.__puppet
    }

    readonly __readyState = {
      active: () => this.__puppet?.readyIndicator.value() === true,
      inactive: () => !this.__puppet || this.__puppet.readyIndicator.value() === false,
      stable: async (expected?: 'active' | 'inactive') => {
        if (expected === 'inactive') {
          if (!this.__puppet || !this.__puppet.readyIndicator.value()) {
            return
          }
          await this.__puppet.whenState(st => st.kind === 'stopped' || st.kind === 'failed')
        } else {
          await this.ready()
        }
      },
    }

    __puppetMixinInited = false

    constructor (...args: any[]) {
      log.verbose('WechatyPuppetMixin', 'construct()')
      super(...args)
    }

    override async start (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'start()')

      log.verbose('WechatyPuppetMixin', 'start() super.start() ...')
      await super.start()
      log.verbose('WechatyPuppetMixin', 'start() super.start() ... done')

      try {
        try {
          log.verbose('WechatyPuppetMixin', 'start() starting puppet ...')
          await timeoutPromise(
            this.puppet.start(),
            15 * 1000,  // 15 seconds timeout
          )
          log.verbose('WechatyPuppetMixin', 'start() starting puppet ... done')
        } catch (e) {
          if (e instanceof TimeoutPromiseGError) {
            log.warn('WechatyPuppetMixin', 'start() starting puppet ... timeout')
            log.warn('WechatyPuppetMixin', 'start() puppet info: %s', this.puppet)
          } else {
            throw e
          }
        }

      } catch (e) {
        const gerror = GError.from(e)
        if (gerror !== e && gerror.cause === undefined) {
          gerror.cause = e
        }
        throw gerror
      }
    }

    override async stop (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'stop()')

      if (!this.__puppet) {
        log.verbose('WechatyPuppetMixin', 'stop() skipped: no puppet initialized')
        await super.stop()
        return
      }

      try {
        log.verbose('WechatyPuppetMixin', 'stop() stopping puppet ...')
        await timeoutPromise(
          this.puppet.stop(),
          15 * 1000,  // 15 seconds timeout
        )
        log.verbose('WechatyPuppetMixin', 'stop() stopping puppet ... done')
      } catch (e) {
        if (e instanceof TimeoutPromiseGError) {
          log.warn('WechatyPuppetMixin', 'stop() stopping puppet ... timeout')
          log.warn('WechatyPuppetMixin', 'stop() puppet info: %s', this.puppet)
        }
        this.emitError(e)
      }

      log.verbose('WechatyPuppetMixin', 'stop() super.stop() ...')
      await super.stop()
      log.verbose('WechatyPuppetMixin', 'stop() super.stop() ... done')
    }

    __getPuppetOrWait (signal?: AbortSignal): Promise<PUPPET.Puppet> {
      if (this.__puppet) {
        return Promise.resolve(this.__puppet)
      }
      return new Promise<PUPPET.Puppet>((resolve, reject) => {
        if (signal?.aborted) {
          return reject(signal.reason)
        }
        const resolvers = getResolvers(this)
        const resolver = (puppet: PUPPET.Puppet) => {
          signal?.removeEventListener('abort', onAbort)
          resolve(puppet)
        }
        const onAbort = () => {
          const idx = resolvers.indexOf(resolver)
          if (idx >= 0) {
            resolvers.splice(idx, 1)
          }
          reject(signal!.reason)
        }
        signal?.addEventListener('abort', onAbort, { once: true })
        resolvers.push(resolver)
      })
    }

    async ready (options?: LifecycleWaitOptions): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'ready()')
      const puppet = await this.__getPuppetOrWait(options?.signal)
      return puppet.ready(options)
    }

    /**
     * Resolves the puppet from the options, or else from `WECHATY_PUPPET`,
     * and wires it to the bot. Throws `NO_PUPPET_MESSAGE` when neither names
     * one (2.0 has no default puppet); that check runs before the mixin
     * marks itself initialized, so a later `start()` can succeed once a
     * puppet is set.
     */
    override async init (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'init()')

      await super.init()

      if (this.__puppetMixinInited) {
        log.verbose('WechatyPuppetMixin', 'init() skipped: already initialized.')
        return
      }

      log.verbose('WechatyPuppetMixin', 'init() initializing %s ...', this.__options.puppet)

      const puppet = this.__options.puppet || config.systemPuppetName()
      if (!puppet) {
        throw new Error(NO_PUPPET_MESSAGE)
      }

      log.verbose('WechatyPuppetMixin', 'init() instanciate puppet instance ...')
      const puppetInstance = await PUPPET.helpers.resolvePuppet({
        puppet,
        puppetOptions: 'puppetOptions' in this.__options
          ? this.__options.puppetOptions
          : undefined,
      })
      log.verbose('WechatyPuppetMixin', 'init() instanciate puppet instance ... done')

      /**
       * Plug the Memory Card to Puppet
       */
      log.verbose('WechatyPuppetMixin', 'init() setting memory ...')
      const puppetMemory = this.memory.multiplex(PUPPET_MEMORY_NAME)
      puppetInstance.setMemory(puppetMemory)
      log.verbose('WechatyPuppetMixin', 'init() setting memory ... done')

      /**
       * Setup the events for the Puppet
       */
      log.verbose('WechatyPuppetMixin', 'init() setting up events ...')
      this.__setupPuppetEvents(puppetInstance)
      log.verbose('WechatyPuppetMixin', 'init() setting up events ... done')

      /**
       * Emit `puppet` event before assigning public getter
       */
      log.verbose('WechatyPuppetMixin', 'init() emitting "puppet" event ...')
      this.dispatchEvent(new WechatyEvent('puppet', { detail: puppetInstance }))
      log.verbose('WechatyPuppetMixin', 'init() emitting "puppet" event ... done')

      this.__puppet = puppetInstance
      this.__puppetMixinInited = true
      const resolvers = getResolvers(this)
      resolvers.forEach(resolve => resolve(puppetInstance))
      resolvers.length = 0

      log.verbose('WechatyPuppetMixin', 'init() done')
    }

    __recordPuppetError (error: unknown): void {
      const set = getPuppetErrors(this)
      set.add(error)
      if (error && typeof error === 'object') {
        if ('cause' in error && (error as any).cause) {
          set.add((error as any).cause)
        }
        if ('message' in error && (error as Error).message) {
          set.add((error as Error).message)
        }
      }
      while (set.size > 20) {
        const first = set.values().next().value
        set.delete(first)
      }
    }

    __hasEmittedPuppetError (error: unknown): boolean {
      const set = getPuppetErrors(this)
      if (set.has(error)) {
        return true
      }
      if (error && typeof error === 'object') {
        if ('cause' in error && set.has((error as any).cause)) {
          return true
        }
        if ('message' in error && set.has((error as Error).message)) {
          return true
        }
      }
      return false
    }

    __setupPuppetEvents (puppet: PUPPET.Puppet): void {
      log.verbose('WechatyPuppetMixin', '__setupPuppetEvents(%s)', puppet)

      registerPuppetEventBridge(puppet, {
        contactFind: id => this.Contact.find({ id }),
        contactReady: async id => {
          const contact = await this.Contact.find({ id }) as unknown as undefined | ContactImpl
          await contact?.ready(true)
        },
        contactSelfFind: id => this.ContactSelf.find({ id }),
        friendshipLoad: id => this.Friendship.load(id),
        messageFind: id => this.Message.find({ id }),
        postFind: id => this.Post.find({ id }),
        roomFind: id => this.Room.find({ id }),
        roomInvitationLoad: id => this.RoomInvitation.load(id),
        roomReady: async id => {
          const room = await this.Room.find({ id }) as unknown as undefined | RoomImpl
          await room?.ready(true)
        },
        dispatchEvent: this.dispatchEvent.bind(this),
        emitError: error => this.emitError(error),
        recordPuppetError: error => this.__recordPuppetError(error),
      })
    }

  }

  return PuppetMixin
}

type PuppetMixin = ReturnType<typeof puppetMixin>

type ProtectedPropertyPuppetMixin =
  | '__hasEmittedPuppetError'
  | '__puppet'
  | '__puppetMixinInited'
  | '__readyState'
  | '__recordPuppetError'
  | '__setupPuppetEvents'
  | 'puppet'
  | 'ready'

export type {
  PuppetMixin,
  ProtectedPropertyPuppetMixin,
}
export {
  puppetMixin,
}
