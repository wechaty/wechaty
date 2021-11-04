import { log }              from 'wechaty-puppet'
import * as PUPPET      from 'wechaty-puppet'
import { GError } from 'gerror'

import { StateSwitch } from 'state-switch'
import type { StateSwitchInterface } from 'state-switch'

import { timestampToDate } from '../pure-functions/timestamp-to-date.js'
import type { ContactInterface } from '../user-modules/contact.js'
import type {
  WechatifyUserModuleMixin,
}                             from './wechatify-user-module-mixin.js'
import {
  PuppetManager,
}                       from '../puppet-management/mod.js'

import { config } from '../config.js'

const PUPPET_MEMORY_NAME = 'puppet'

const puppetEventBridgeMixin = <MixinBase extends WechatifyUserModuleMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyPuppetEventBridgeMixin', 'puppetEventBridgeMixin(%s)', mixinBase.name)

  abstract class PuppeEventBridgetMixin extends mixinBase {

    /**
     * @protected
     */
    _puppet?: PUPPET.impl.Puppet

    get puppet (): PUPPET.impl.Puppet {
      if (!this._puppet) {
        throw new Error('NOPUPPET')
      }
      return this._puppet
    }

    /**
     * @protected
     */
    readonly _readyState : StateSwitchInterface

    constructor (...args: any[]) {
      log.verbose('WechatyPuppetEventBridgeMixin', 'construct()')
      super(...args)

      this._readyState = new StateSwitch('WechatyReady', { log })
    }

    override async start (): Promise<void> {
      log.verbose('WechatyPuppetEventBridgeMixin', 'start()')
      await super.start()

      /**
       * reset the `wechaty.ready()` state
       *  if it was previous set to `active`
       */
      if (this._readyState.active()) {
        this._readyState.inactive(true)
      }

      await this._initPuppetInstance()
    }

    async ready (): Promise<void> {
      log.verbose('WechatyPuppetEventBridgeMixin', 'ready()')
      await this._readyState.stable('active')
      log.silly('WechatyPuppetEventBridgeMixin', 'ready() this.readyState.stable(on) resolved')
    }

    /**
     * @protected
     */
    async _initPuppetInstance (): Promise<void> {
      log.verbose('WechatyPuppetEventBridgeMixin', '_initPuppetInstance() %s', this._options.puppet || '')

      if (this._puppet) {
        log.verbose('WechatyPuppetEventBridgeMixin', '_initPuppetInstance() initialized already: skip')
        return
      }

      log.verbose('WechatyPuppetEventBridgeMixin', '_initPuppetInstance() instanciating puppet instance ...')
      const puppet       = this._options.puppet || config.systemPuppetName()
      const puppetMemory = this.memory.multiplex(PUPPET_MEMORY_NAME)

      const puppetInstance = await PuppetManager.resolve({
        puppet,
        puppetOptions : this._options.puppetOptions,
        // wechaty       : this,
      })
      log.verbose('WechatyPuppetEventBridgeMixin', '_initPuppetInstance() instanciating puppet instance ... done')

      /**
       * Plug the Memory Card to Puppet
       */
      puppetInstance.setMemory(puppetMemory)

      // Huan(202110) for developing Post
      // this._puppet = puppetInstance
      this._puppet = puppetInstance as any  // FIXME: remove any

      this._setupPuppetEventBridge(puppetInstance)
      // this._wechatifyUserModules()

      /**
        * Private Event
        *   - Huan(202005): emit puppet when set
        *   - Huan(202110): what's the purpose of this? (who is using this?)
        */
      ;(this.emit as any)('puppet', puppetInstance)
    }

    /**
     * @protected
     */
    _setupPuppetEventBridge (puppet: PUPPET.impl.Puppet) {
      log.verbose('WechatyPuppetEventBridgeMixin', '_setupPuppetEventBridge(%s)', puppet)

      const eventNameList: PUPPET.type.PuppetEventName[] = Object.keys(PUPPET.type.PUPPET_EVENT_DICT) as PUPPET.type.PuppetEventName[]
      for (const eventName of eventNameList) {
        log.verbose('PuppetEventBridgeMixin',
          '_setupPuppetEventBridge() puppet.on(%s) (listenerCount:%s) registering...',
          eventName,
          puppet.listenerCount(eventName),
        )

        switch (eventName) {
          case 'dong':
            puppet.on('dong', payload => {
              this.emit('dong', payload.data)
            })
            break

          case 'error':
            puppet.on('error', payload => {
              this.emit('error', GError.from(payload))
            })
            break

          case 'heartbeat':
            puppet.on('heartbeat', payload => {
              /**
               * Use `watchdog` event from Puppet to `heartbeat` Wechaty.
               */
              // TODO: use a throttle queue to prevent beat too fast.
              this.emit('heartbeat', payload.data)
            })
            break

          case 'friendship':
            puppet.on('friendship', async payload => {
              const friendship = this.Friendship.load(payload.friendshipId)
              try {
                await friendship.ready()
                this.emit('friendship', friendship)
                friendship.contact().emit('friendship', friendship)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'login':
            puppet.on('login', async payload => {
              try {
                const contact = await this.ContactSelf.find({ id: payload.contactId })
                if (!contact) {
                  throw new Error('no contact found for id: ' + payload.contactId)
                }
                this.emit('login', contact)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'logout':
            puppet.on('logout', async payload => {
              try {
                this._readyState.inactive(true)
                const contact = await this.ContactSelf.find({ id: payload.contactId })
                if (contact) {
                  this.emit('logout', contact, payload.data)
                } else {
                  log.verbose('PuppetEventBridgeMixin',
                    '_setupPuppetEventBridge() logout event contact self not found for id: %s',
                    payload.contactId,
                  )
                }
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'message':
            puppet.on('message', async payload => {
              try {
                const msg = await this.Message.find({ id: payload.messageId })
                if (!msg) {
                  throw new Error('message not found for id: ' + payload.messageId)
                }
                this.emit('message', msg)

                const room     = msg.room()
                const listener = msg.listener()

                if (room) {
                  room.emit('message', msg)
                } else if (listener) {
                  listener.emit('message', msg)
                } else {
                  this.emit('error', GError.from('message without room and listener'))
                }
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'ready':
            puppet.on('ready', () => {
              log.silly('WechatyPuppetEventBridgeMixin', '_setupPuppetEventBridge() puppet.on(ready)')

              this.emit('ready')
              this._readyState.active(true)
            })
            break

          case 'room-invite':
            puppet.on('room-invite', async payload => {
              const roomInvitation = this.RoomInvitation.load(payload.roomInvitationId)
              this.emit('room-invite', roomInvitation)
            })
            break

          case 'room-join':
            puppet.on('room-join', async payload => {
              try {
                const room = await this.Room.find({ id: payload.roomId })
                if (!room) {
                  throw new Error('no room found for id: ' + payload.roomId)
                }
                await room.sync()

                const inviteeListAll = await Promise.all(
                  payload.inviteeIdList.map(id => this.Contact.find({ id })),
                )
                const inviteeList = inviteeListAll.filter(c => !!c) as ContactInterface[]

                const inviter = await this.Contact.find({ id: payload.inviterId })
                if (!inviter) {
                  throw new Error('no inviter found for id: ' + payload.inviterId)
                }

                const date = timestampToDate(payload.timestamp)

                this.emit('room-join', room, inviteeList, inviter, date)
                room.emit('join', inviteeList, inviter, date)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'room-leave':
            puppet.on('room-leave', async payload => {
              try {
                const room = await this.Room.find({ id: payload.roomId })
                if (!room) {
                  throw new Error('no room found for id: ' + payload.roomId)
                }

                /**
                 * See: https://github.com/wechaty/wechaty/pull/1833
                 */
                await room.sync()

                const leaverListAll = await Promise.all(
                  payload.removeeIdList.map(id => this.Contact.find({ id })),
                )
                const leaverList = leaverListAll.filter(c => !!c) as ContactInterface[]

                const remover = await this.Contact.find({ id: payload.removerId })
                if (!remover) {
                  throw new Error('no remover found for id: ' + payload.removerId)
                }
                const date = timestampToDate(payload.timestamp)

                this.emit('room-leave', room, leaverList, remover, date)
                room.emit('leave', leaverList, remover, date)

                // issue #254
                if (payload.removeeIdList.includes(puppet.currentUserId)) {
                  await puppet.dirtyPayload(PUPPET.type.Payload.Room, payload.roomId)
                  await puppet.dirtyPayload(PUPPET.type.Payload.RoomMember, payload.roomId)
                }
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'room-topic':
            puppet.on('room-topic', async payload => {
              try {
                const room = await this.Room.find({ id: payload.roomId })
                if (!room) {
                  throw new Error('no room found for id: ' + payload.roomId)
                }
                await room.sync()

                const changer = await this.Contact.find({ id: payload.changerId })
                if (!changer) {
                  throw new Error('no changer found for id: ' + payload.changerId)
                }
                const date = timestampToDate(payload.timestamp)

                this.emit('room-topic', room, payload.newTopic, payload.oldTopic, changer, date)
                room.emit('topic', payload.newTopic, payload.oldTopic, changer, date)
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          case 'scan':
            puppet.on('scan', async payload => {
              this._readyState.inactive(true)
              this.emit('scan', payload.qrcode || '', payload.status, payload.data)
            })
            break

          case 'reset':
            // Do not propagation `reset` event from puppet
            break

          case 'dirty':
            /**
             * https://github.com/wechaty/wechaty-puppet-service/issues/43
             */
            puppet.on('dirty', async ({ payloadType, payloadId }) => {
              try {
                switch (payloadType) {
                  case PUPPET.type.Payload.RoomMember:
                  case PUPPET.type.Payload.Contact:
                    await (await this.Contact.find({ id: payloadId }))?.sync()
                    break
                  case PUPPET.type.Payload.Room:
                    await (await this.Room.find({ id: payloadId }))?.sync()
                    break

                  /**
                   * Huan(202008): noop for the following
                   */
                  case PUPPET.type.Payload.Friendship:
                    // Friendship has no payload
                    break
                  case PUPPET.type.Payload.Message:
                    // Message does not need to dirty (?)
                    break

                  case PUPPET.type.Payload.Unknown:
                  default:
                    throw new Error('unknown payload type: ' + payloadType)
                }
              } catch (e) {
                this.emit('error', GError.from(e))
              }
            })
            break

          default:
            /**
             * Check: The eventName here should have the type `never`
             */
            throw new Error('eventName ' + eventName + ' unsupported!')

        }
      }

      log.verbose('WechatyPuppetEventBridgeMixin', '_setupPuppetEventBridge() ... done')
    }

  }

  return PuppeEventBridgetMixin
}

type PuppetEventBridgeMixin = ReturnType<typeof puppetEventBridgeMixin>

type ProtectedPropertyPuppetEventBridgeMixin =
  | '_initPuppetInstance'
  | '_puppet'
  | '_readyState'
  | '_setupPuppetEventBridge'

export type {
  PuppetEventBridgeMixin,
  ProtectedPropertyPuppetEventBridgeMixin,
}
export {
  puppetEventBridgeMixin,
}
