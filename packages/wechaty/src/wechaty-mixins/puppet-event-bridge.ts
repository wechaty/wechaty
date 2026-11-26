/**
 * Translates puppet events into Wechaty events through the dependencies supplied
 * by `puppet-mixin.ts`. Provider setup, memory, lifecycle timeouts, and the
 * `puppet` event remain owned by the mixin; this module registers
 * persistent event listeners and forwards hydrated single-payload CustomEvents.
 */
import * as PUPPET from 'wechaty-puppet'
import {
  log,
  WechatyEvent,
} from 'wechaty-puppet'
import {
  GError,
}                   from 'gerror'

import type {
  Friendship,
  ContactSelf,
  RoomInvitation,
  Contact,
  Message,
  Post,
  Room,
}                   from '../user-modules/mod.ts'
import type {
  WechatyEventDetailMap,
  WechatyEventListeners,
  WechatyEventName,
}                   from '../schemas/wechaty-events.ts'
import { timestampToDate } from '../pure-functions/timestamp-to-date.ts'

/**
 * Emits a typed Wechaty event; handlers emit at bot level before forwarding to
 * the related room, contact, or friendship where applicable.
 */
type PuppetEventBridgeEmit = <EventName extends WechatyEventName> (
  eventName: EventName,
  ...args: Parameters<WechatyEventListeners[EventName]>
) => boolean

/**
 * Entity operations and bot callbacks the event bridge needs from its owner.
 */
interface PuppetEventBridgeDependencies {
  contactFind: (id: string) => Promise<undefined | Contact>
  contactReady: (id: string) => Promise<void>
  contactSelfFind: (id: string) => Promise<undefined | ContactSelf>
  friendshipLoad: (id: string) => Friendship
  messageFind: (id: string) => Promise<undefined | Message>
  postFind: (id: string) => Promise<undefined | Post>
  roomFind: (id: string) => Promise<undefined | Room>
  roomInvitationLoad: (id: string) => RoomInvitation
  roomReady: (id: string) => Promise<void>
  setReady?: (state: 'active' | 'inactive') => void
  dispatchEvent: (event: Event) => boolean
  emit?: PuppetEventBridgeEmit
  emitError: (error: GError) => void
}

/**
 * Helper to dispatch a single-payload WechatyEvent on the bot and/or forward to legacy emit handler.
 */
function dispatchBridgeEvent<E extends keyof WechatyEventDetailMap> (
  dependencies: PuppetEventBridgeDependencies,
  eventName: E,
  detail: WechatyEventDetailMap[E],
  legacyArgs?: any[],
): void {
  if (dependencies.dispatchEvent) {
    dependencies.dispatchEvent(new WechatyEvent(eventName, { detail }))
  }
  if (dependencies.emit) {
    if (legacyArgs) {
      (dependencies.emit as any)(eventName, ...legacyArgs)
    } else {
      (dependencies.emit as any)(eventName, detail)
    }
  }
}

/**
 * Registers the puppet-to-Wechaty event handlers.
 *
 * Adds listeners for keys in `PUPPET_EVENT_DICT`; `reset` remains intentionally
 * unhandled, and unknown runtime keys throw to preserve startup failure behavior.
 * This function does not deduplicate or remove listeners, so its caller must
 * ensure it is invoked at most once per puppet; those listeners persist across
 * service lifecycle cycles. If registration throws, listeners added before the
 * failure remain attached. Handler failures caught by the bridge are normalized
 * to `GError` and passed to `emitError`.
 *
 * @param puppet - Provider whose events are translated.
 * @param dependencies - Entity lookups, bot emission, readiness, and error callbacks.
 * @throws If listener registration fails or the dictionary contains an unknown event.
 */
function registerPuppetEventBridge (
  puppet: PUPPET.Puppet,
  dependencies: PuppetEventBridgeDependencies,
): void {
  const eventNameList: PUPPET.types.PuppetEventName[] = Object.keys(PUPPET.types.PUPPET_EVENT_DICT) as PUPPET.types.PuppetEventName[]
  for (const eventName of eventNameList) {
    log.verbose('PuppetEventBridge',
      'registerPuppetEventBridge() puppet.addEventListener(%s) registering...',
      eventName,
    )

    const addListener = (handler: (payload: any) => void | Promise<void>) => {
      puppet.addEventListener(eventName, ((event: Event) => {
        const payload = (event as any).detail !== undefined ? (event as any).detail : event
        void handler(payload)
      }) as EventListener)
    }

    switch (eventName) {
      case 'dong':
        addListener((payload: PUPPET.payloads.EventDong) => {
          dispatchBridgeEvent(dependencies, 'dong', payload.data)
        })
        break

      case 'error':
        addListener((payload: PUPPET.payloads.EventError) => {
          /**
           * Huan(202112):
           *  1. remove `payload.data` after it has been sunset (after Dec 31, 2022)
           *  2. throw error if `payload.gerror` is not exists (for enforce puppet strict follow the error event schema)
           */
          dependencies.emitError(GError.from(payload.gerror || (payload as any).data || payload))
        })
        break

      case 'heartbeat':
        addListener((payload: PUPPET.payloads.EventHeartbeat) => {
          /**
           * Use `watchdog` event from Puppet to `heartbeat` Wechaty.
           */
          // TODO: use a throttle queue to prevent beat too fast.
          dispatchBridgeEvent(dependencies, 'heartbeat', payload.data)
        })
        break

      case 'friendship':
        addListener(async (payload: PUPPET.payloads.EventFriendship) => {
          const friendship = dependencies.friendshipLoad(payload.friendshipId)
          try {
            await friendship.ready()
            dispatchBridgeEvent(dependencies, 'friendship', friendship)
            friendship.contact().emit('friendship', friendship)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'login':
        addListener(async (payload: PUPPET.payloads.EventLogin) => {
          try {
            const contact = await dependencies.contactSelfFind(payload.contactId)
            if (!contact) {
              throw new Error('no contact found for id: ' + payload.contactId)
            }
            dispatchBridgeEvent(dependencies, 'login', contact)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'logout':
        addListener(async (payload: PUPPET.payloads.EventLogout) => {
          try {
            dependencies.setReady?.('inactive')
            const contact = await dependencies.contactSelfFind(payload.contactId)
            if (contact) {
              dispatchBridgeEvent(dependencies, 'logout', { contact, data: payload.data, reason: payload.data }, [ contact, payload.data ])
            } else {
              log.verbose('PuppetEventBridge',
                'registerPuppetEventBridge() logout event contact self not found for id: %s',
                payload.contactId,
              )
            }
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'message':
        addListener(async (payload: PUPPET.payloads.EventMessage) => {
          try {
            const msg = await dependencies.messageFind(payload.messageId)
            if (!msg) {
              dependencies.emitError(GError.from('message not found for id: ' + payload.messageId))
              return
            }

            dispatchBridgeEvent(dependencies, 'message', msg)

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
        addListener(async (payload: PUPPET.payloads.EventPost) => {
          try {
            const post = await dependencies.postFind(payload.postId)
            if (!post) {
              dependencies.emitError(GError.from('post not found for id: ' + payload.postId))
              return
            }

            dispatchBridgeEvent(dependencies, 'post', post)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'ready':
        addListener(() => {
          log.silly('PuppetEventBridge', 'registerPuppetEventBridge() puppet ready')

          dispatchBridgeEvent(dependencies, 'ready', null)
          dependencies.setReady?.('active')
        })
        break

      case 'room-invite':
        addListener(async (payload: PUPPET.payloads.EventRoomInvite) => {
          const roomInvitation = dependencies.roomInvitationLoad(payload.roomInvitationId)
          dispatchBridgeEvent(dependencies, 'room-invite', roomInvitation)
        })
        break

      case 'room-join':
        addListener(async (payload: PUPPET.payloads.EventRoomJoin) => {
          try {
            const room = await dependencies.roomFind(payload.roomId)
            if (!room) {
              throw new Error('no room found for id: ' + payload.roomId)
            }
            await room.sync()

            const validInviteeIdList = payload.inviteeIdList.filter((m: string) => m)
            const inviteeListAll = await Promise.all(
              validInviteeIdList.map(id => dependencies.contactFind(id)),
            )
            const inviteeList = inviteeListAll.filter(c => !!c) as Contact[]

            const inviter = await dependencies.contactFind(payload.inviterId)
            if (!inviter) {
              throw new Error('no inviter found for id: ' + payload.inviterId)
            }

            const date = timestampToDate(payload.timestamp)

            dispatchBridgeEvent(dependencies, 'room-join', { room, inviteeList, inviter, date }, [ room, inviteeList, inviter, date ])
            room.emit('join', inviteeList, inviter, date)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'room-leave':
        addListener(async (payload: PUPPET.payloads.EventRoomLeave) => {
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
              payload.removeeIdList.map((id: string) => dependencies.contactFind(id)),
            )
            const leaverList = leaverListAll.filter(c => !!c) as Contact[]

            const remover = await dependencies.contactFind(payload.removerId)
            if (!remover) {
              throw new Error('no remover found for id: ' + payload.removerId)
            }
            const date = timestampToDate(payload.timestamp)

            dispatchBridgeEvent(dependencies, 'room-leave', { room, leaverList, remover, date }, [ room, leaverList, remover, date ])
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
        addListener(async (payload: PUPPET.payloads.EventRoomTopic) => {
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

            dispatchBridgeEvent(dependencies, 'room-topic', { room, newTopic: payload.newTopic, oldTopic: payload.oldTopic, changer, date }, [ room, payload.newTopic, payload.oldTopic, changer, date ])
            room.emit('topic', payload.newTopic, payload.oldTopic, changer, date)
          } catch (e) {
            dependencies.emitError(GError.from(e))
          }
        })
        break

      case 'scan':
        addListener(async (payload: PUPPET.payloads.EventScan) => {
          dependencies.setReady?.('inactive')
          const scanDetail = { qrcode: payload.qrcode || '', status: payload.status, data: payload.data }
          dispatchBridgeEvent(dependencies, 'scan', scanDetail, [ payload.qrcode || '', payload.status, payload.data ])
        })
        break

      case 'reset':
        // Do not propagate `reset` event from puppet
        break

      case 'dirty':
        /**
         * https://github.com/wechaty/wechaty-puppet-service/issues/43
         */
        addListener(async ({ payloadType, payloadId }: PUPPET.payloads.EventDirty) => {
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

  log.verbose('PuppetEventBridge', 'registerPuppetEventBridge() ... done')
}

export type {
  PuppetEventBridgeDependencies,
}
export {
  registerPuppetEventBridge,
}
