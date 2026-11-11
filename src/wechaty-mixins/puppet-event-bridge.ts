import * as PUPPET from 'wechaty-puppet'
import { log }     from 'wechaty-puppet'
import {
  GError,
}                   from 'gerror'

import type {
  FriendshipInterface,
  ContactSelfInterface,
  RoomInvitationInterface,
  ContactInterface,
  MessageInterface,
  PostInterface,
  RoomInterface,
}                   from '../user-modules/mod.js'
import type {
  WechatyEventListeners,
  WechatyEventName,
}                   from '../schemas/wechaty-events.js'
import { timestampToDate } from '../pure-functions/timestamp-to-date.js'

type PuppetEventBridgeEmit = <EventName extends WechatyEventName> (
  eventName: EventName,
  ...args: Parameters<WechatyEventListeners[EventName]>
) => boolean

interface PuppetEventBridgeDependencies {
  contactFind: (id: string) => Promise<undefined | ContactInterface>
  contactReady: (id: string) => Promise<void>
  contactSelfFind: (id: string) => Promise<undefined | ContactSelfInterface>
  friendshipLoad: (id: string) => FriendshipInterface
  messageFind: (id: string) => Promise<undefined | MessageInterface>
  postFind: (id: string) => Promise<undefined | PostInterface>
  roomFind: (id: string) => Promise<undefined | RoomInterface>
  roomInvitationLoad: (id: string) => RoomInvitationInterface
  roomReady: (id: string) => Promise<void>
  setReady: (state: 'active' | 'inactive') => void
  emit: PuppetEventBridgeEmit
  emitError: (error: GError) => void
}

function registerPuppetEventBridge (
  puppet: PUPPET.impls.PuppetInterface,
  dependencies: PuppetEventBridgeDependencies,
): void {
  const eventNameList: PUPPET.types.PuppetEventName[] = Object.keys(PUPPET.types.PUPPET_EVENT_DICT) as PUPPET.types.PuppetEventName[]
  for (const eventName of eventNameList) {
    log.verbose('PuppetMixin',
      '__setupPuppetEvents() puppet.on(%s) (listenerCount:%s) registering...',
      eventName,
      puppet.listenerCount(eventName),
    )

    switch (eventName) {
      case 'dong':
        puppet.on('dong', payload => {
          dependencies.emit('dong', payload.data)
        })
        break

      case 'error':
        puppet.on('error', payload => {
          /**
           * Huan(202112):
           *  1. remove `payload.data` after it has been sunset (after Dec 31, 2022)
           *  2. throw error if `payload.gerror` is not exists (for enforce puppet strict follow the error event schema)
           */
          dependencies.emitError(GError.from(payload.gerror || payload.data || payload))
        })
        break

      case 'heartbeat':
        puppet.on('heartbeat', payload => {
          /**
           * Use `watchdog` event from Puppet to `heartbeat` Wechaty.
           */
          // TODO: use a throttle queue to prevent beat too fast.
          dependencies.emit('heartbeat', payload.data)
        })
        break

      case 'friendship':
        puppet.on('friendship', async payload => {
          const friendship = dependencies.friendshipLoad(payload.friendshipId)
          try {
            await friendship.ready()
            dependencies.emit('friendship', friendship)
            friendship.contact().emit('friendship', friendship)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'login':
        puppet.on('login', async payload => {
          try {
            const contact = await dependencies.contactSelfFind(payload.contactId)
            if (!contact) {
              throw new Error('no contact found for id: ' + payload.contactId)
            }
            dependencies.emit('login', contact)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'logout':
        puppet.on('logout', async payload => {
          try {
            dependencies.setReady('inactive')
            const contact = await dependencies.contactSelfFind(payload.contactId)
            if (contact) {
              dependencies.emit('logout', contact, payload.data)
            } else {
              log.verbose('PuppetMixin',
                '__setupPuppetEvents() logout event contact self not found for id: %s',
                payload.contactId,
              )
            }
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'message':
        puppet.on('message', async payload => {
          try {
            const msg = await dependencies.messageFind(payload.messageId)
            if (!msg) {
              dependencies.emitError(GError.from('message not found for id: ' + payload.messageId))
              return
            }

            dependencies.emit('message', msg)

            const room     = msg.room()
            const listener = msg.listener()

            if (room) {
              room.emit('message', msg)
            } else if (listener) {
              listener.emit('message', msg)
            } else {
              dependencies.emitError(GError.from('message without room and listener'))
            }
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'post':
        puppet.on('post', async payload => {
          try {
            const post = await dependencies.postFind(payload.postId)
            if (!post) {
              dependencies.emitError(GError.from('post not found for id: ' + payload.postId))
              return
            }

            dependencies.emit('post', post)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'ready':
        puppet.on('ready', () => {
          log.silly('WechatyPuppetMixin', '__setupPuppetEvents() puppet.on(ready)')

          dependencies.emit('ready')
          dependencies.setReady('active')
        })
        break

      case 'room-invite':
        puppet.on('room-invite', async payload => {
          const roomInvitation = dependencies.roomInvitationLoad(payload.roomInvitationId)
          dependencies.emit('room-invite', roomInvitation)
        })
        break

      case 'room-join':
        puppet.on('room-join', async payload => {
          try {
            const room = await dependencies.roomFind(payload.roomId)
            if (!room) {
              throw new Error('no room found for id: ' + payload.roomId)
            }
            await room.sync()

            const validInviteeIdList = payload.inviteeIdList.filter((m) => m)
            const inviteeListAll = await Promise.all(
              validInviteeIdList.map(id => dependencies.contactFind(id)),
            )
            const inviteeList = inviteeListAll.filter(c => !!c) as ContactInterface[]

            const inviter = await dependencies.contactFind(payload.inviterId)
            if (!inviter) {
              throw new Error('no inviter found for id: ' + payload.inviterId)
            }

            const date = timestampToDate(payload.timestamp)

            dependencies.emit('room-join', room, inviteeList, inviter, date)
            room.emit('join', inviteeList, inviter, date)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'room-leave':
        puppet.on('room-leave', async payload => {
          try {
            const room = await dependencies.roomFind(payload.roomId)
            if (!room) {
              throw new Error('no room found for id: ' + payload.roomId)
            }

            /**
             * See: https://github.com/wechaty/wechaty/pull/1833
             */
            await room.sync()

            const leaverListAll = await Promise.all(
              payload.removeeIdList.map(id => dependencies.contactFind(id)),
            )
            const leaverList = leaverListAll.filter(c => !!c) as ContactInterface[]

            const remover = await dependencies.contactFind(payload.removerId)
            if (!remover) {
              throw new Error('no remover found for id: ' + payload.removerId)
            }
            const date = timestampToDate(payload.timestamp)

            dependencies.emit('room-leave', room, leaverList, remover, date)
            room.emit('leave', leaverList, remover, date)

            // issue #254
            if (payload.removeeIdList.includes(puppet.currentUserId)) {
              await puppet.roomPayloadDirty(payload.roomId)
              await puppet.roomMemberPayloadDirty(payload.roomId)
            }
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'room-topic':
        puppet.on('room-topic', async payload => {
          try {
            const room = await dependencies.roomFind(payload.roomId)
            if (!room) {
              throw new Error('no room found for id: ' + payload.roomId)
            }
            await room.sync()

            const changer = await dependencies.contactFind(payload.changerId)
            if (!changer) {
              throw new Error('no changer found for id: ' + payload.changerId)
            }
            const date = timestampToDate(payload.timestamp)

            dependencies.emit('room-topic', room, payload.newTopic, payload.oldTopic, changer, date)
            room.emit('topic', payload.newTopic, payload.oldTopic, changer, date)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'scan':
        puppet.on('scan', async payload => {
          dependencies.setReady('inactive')
          dependencies.emit('scan', payload.qrcode || '', payload.status, payload.data)
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
              case PUPPET.types.Payload.RoomMember:
              case PUPPET.types.Payload.Contact:
                await dependencies.contactReady(payloadId)
                break

              case PUPPET.types.Payload.Room:
                await dependencies.roomReady(payloadId)
                break

              /**
               * Huan(202008): noop for the following
               */
              case PUPPET.types.Payload.Friendship:
                break

              case PUPPET.types.Payload.Message:
                break

              case PUPPET.types.Payload.Unspecified:
              default:
                throw new Error('unknown payload type: ' + payloadType)
            }
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      default: {
        const unsupportedEvent: never = eventName
        throw new Error('eventName ' + unsupportedEvent + ' unsupported!')
      }
    }
  }

  log.verbose('WechatyPuppetMixin', '__setupPuppetEvents() ... done')
}

export {
  registerPuppetEventBridge,
}
