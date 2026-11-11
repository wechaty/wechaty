import * as PUPPET      from 'wechaty-puppet'
import { log }          from 'wechaty-puppet'
import {
  timeoutPromise,
  TimeoutPromiseGError,
}                       from 'gerror'

import { StateSwitch }  from 'state-switch'
import type {
  StateSwitchInterface,
}                       from 'state-switch'

import { config }               from '../config.js'
import type {
  ContactImpl,
  RoomImpl,
}                               from '../user-modules/mod.js'

import { registerPuppetEventBridge } from './puppet-event-bridge.js'

import type {
  WechatifyUserModuleMixin,
}                               from './wechatify-user-module-mixin.js'

import type { GErrorMixin } from './gerror-mixin.js'
import type { IoMixin }     from './io-mixin.js'

const PUPPET_MEMORY_NAME = 'puppet'

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

    __puppet?: PUPPET.impls.PuppetInterface

    get puppet (): PUPPET.impls.PuppetInterface {
      if (!this.__puppet) {

        throw new Error('NOPUPPET')
      }
      return this.__puppet
    }

    readonly __readyState : StateSwitchInterface

    __puppetMixinInited = false

    constructor (...args: any[]) {
      log.verbose('WechatyPuppetMixin', 'construct()')
      super(...args)

      this.__readyState = new StateSwitch('WechatyReady', { log })
    }

    override async start (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'start()')

      log.verbose('WechatyPuppetMixin', 'start() super.start() ...')
      await super.start()
      log.verbose('WechatyPuppetMixin', 'start() super.start() ... done')

      try {
        /**
         * reset the `wechaty.ready()` state
         *  if it was previous set to `active`
         */
        if (this.__readyState.active()) {
          this.__readyState.inactive(true)
        }

        try {
          log.verbose('WechatyPuppetMixin', 'start() starting puppet ...')
          await timeoutPromise(
            this.puppet.start(),
            15 * 1000,  // 15 seconds timeout
          )
          log.verbose('WechatyPuppetMixin', 'start() starting puppet ... done')
        } catch (e) {
          if (e instanceof TimeoutPromiseGError) {
            /**
             * Huan(202111):
             *
             *  We should throw the Timeout error when the puppet.start() can not be finished in time.
             *  However, we need to compatible with some buggy puppet implementations which will not resolve the promise.
             *
             * TODO: throw the Timeout error when the puppet.start() can not be finished in time.
             *
             * e.g. after resolve @issue https://github.com/padlocal/wechaty-puppet-padlocal/issues/116
             */
            log.warn('WechatyPuppetMixin', 'start() starting puppet ... timeout')
            log.warn('WechatyPuppetMixin', 'start() puppet info: %s', this.puppet)
          } else {
            throw e
          }
        }

      } catch (e) {
        this.emitError(e)
      }
    }

    override async stop (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'stop()')

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

    async ready (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'ready()')
      await this.__readyState.stable('active')
      log.silly('WechatyPuppetMixin', 'ready() this.readyState.stable(on) resolved')
    }

    override async init (): Promise<void> {
      log.verbose('WechatyPuppetMixin', 'init()')
      await super.init()

      if (this.__puppetMixinInited) {
        log.verbose('WechatyPuppetMixin', 'init() skipped because this puppet has already been inited before.')
        return
      }
      this.__puppetMixinInited = true

      log.verbose('WechatyPuppetMixin', 'init() instanciating puppet instance ...')
      const puppetInstance = await PUPPET.helpers.resolvePuppet({
        puppet: this.__options.puppet || config.systemPuppetName(),
        puppetOptions: 'puppetOptions' in this.__options
          ? this.__options.puppetOptions
          : undefined,
      })
      log.verbose('WechatyPuppetMixin', 'init() instanciating puppet instance ... done')

      /**
       * Plug the Memory Card to Puppet
       */
      log.verbose('WechatyPuppetMixin', 'init() setting memory ...')
      const puppetMemory = this.memory.multiplex(PUPPET_MEMORY_NAME)
      puppetInstance.setMemory(puppetMemory)
      log.verbose('WechatyPuppetMixin', 'init() setting memory ... done')

      /**
       * Propagate Puppet Events to Wechaty
       */
      log.verbose('WechatyPuppetMixin', 'init() setting up events ...')
      this.__setupPuppetEvents(puppetInstance)
      log.verbose('WechatyPuppetMixin', 'init() setting up events ... done')

      /**
        * Private Event
        *   - Huan(202005): emit puppet when set
        *   - Huan(202110): @see https://github.com/wechaty/redux/blob/16af0ae01f72e37f0ee286b49fa5ccf69850323d/src/wechaty-redux.ts#L82-L98
        */
      log.verbose('WechatyPuppetMixin', 'init() emitting "puppet" event ...')
      ;(this.emit as any)('puppet', puppetInstance)
      log.verbose('WechatyPuppetMixin', 'init() emitting "puppet" event ... done')

      this.__puppet = puppetInstance
    }

    __setupPuppetEvents (puppet: PUPPET.impls.PuppetInterface): void {
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
        setReady: state => {
          if (state === 'active') {
            this.__readyState.active(true)
          } else {
            this.__readyState.inactive(true)
          }
        },
        emit: this.emit.bind(this),
        emitError: error => this.emitError(error),
      })

    }

  }

  return PuppetMixin
}

type PuppetMixin = ReturnType<typeof puppetMixin>

type ProtectedPropertyPuppetMixin =
  | '__puppet'
  | '__readyState'
  | '__setupPuppetEvents'

export type {
  PuppetMixin,
  ProtectedPropertyPuppetMixin,
}
export {
  puppetMixin,
}
