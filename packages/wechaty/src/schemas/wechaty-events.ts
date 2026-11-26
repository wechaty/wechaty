/**
 * Wechaty event schemas, detail maps, and event target interfaces.
 */
import {
  type EventIteratorOptions,
  EventEmitter,
} from 'wechaty-puppet'
import type { GError } from 'gerror'
import * as PUPPET from 'wechaty-puppet'

import type {
  Friendship,
  ContactSelf,
  Room,
  RoomInvitation,
  Contact,
  Message,
  Post,
} from '../user-modules/mod.ts'

const WECHATY_EVENT_DICT = {
  ...PUPPET.types.CHAT_EVENT_DICT,
  dong      : 'Should be emitted after we call `Wechaty.ding()`',
  error     : "Will be emitted when there's an Error occurred.",
  heartbeat : 'Will be emitted periodically after the Wechaty started. If not, means that the Wechaty had died.',
  puppet    : 'Will be emitted when the puppet has been set.',
  ready     : 'All underlined data source are ready for use.',
  start     : 'Will be emitted after the Wechaty had been started.',
  stop      : 'Will be emitted after the Wechaty had been stopped.',
} as const

type WechatyEventName = keyof typeof WECHATY_EVENT_DICT

/**
 * Wechaty Event Listener Interfaces (legacy compatibility signatures)
 */
type WechatyEventListenerDong       = (data?: string)                                                                                   => void | Promise<void>
type WechatyEventListenerError      = (error: GError)                                                                                   => void | Promise<void>
type WechatyEventListenerFriendship = (friendship: Friendship)                                                                          => void | Promise<void>
type WechatyEventListenerHeartbeat  = (data: any)                                                                                       => void | Promise<void>
type WechatyEventListenerLogin      = (user: ContactSelf)                                                                               => void | Promise<void>
type WechatyEventListenerLogout     = (user: ContactSelf, reason?: string)                                                              => void | Promise<void>
type WechatyEventListenerMessage    = (message: Message)                                                                                => void | Promise<void>
type WechatyEventListenerPost       = (post: Post)                                                                                      => void | Promise<void>
type WechatyEventListenerPuppet     = (puppet: PUPPET.Puppet)                                                                           => void | Promise<void>
type WechatyEventListenerReady      = ()                                                                                                => void | Promise<void>
type WechatyEventListenerRoomInvite = (roomInvitation: RoomInvitation)                                                                 => void | Promise<void>
type WechatyEventListenerRoomJoin   = (room: Room, inviteeList: Contact[], inviter: Contact,  date?: Date)                               => void | Promise<void>
type WechatyEventListenerRoomLeave  = (room: Room, leaverList: Contact[],  remover?: Contact, date?: Date)                                => void | Promise<void>
type WechatyEventListenerRoomTopic  = (room: Room, newTopic: string, oldTopic: string, changer: Contact, date?: Date)                  => void | Promise<void>
type WechatyEventListenerScan       = (qrcode: string, status: PUPPET.types.ScanStatus, data?: string)                                   => void | Promise<void>
type WechatyEventListenerStartStop  = ()                                                                                                => void | Promise<void>

interface WechatyEventListeners {
  'room-invite' : WechatyEventListenerRoomInvite
  'room-join'   : WechatyEventListenerRoomJoin
  'room-leave'  : WechatyEventListenerRoomLeave
  'room-topic'  : WechatyEventListenerRoomTopic
  dong          : WechatyEventListenerDong
  error         : WechatyEventListenerError
  friendship    : WechatyEventListenerFriendship
  heartbeat     : WechatyEventListenerHeartbeat
  login         : WechatyEventListenerLogin
  logout        : WechatyEventListenerLogout
  message       : WechatyEventListenerMessage
  post          : WechatyEventListenerPost
  puppet        : WechatyEventListenerPuppet
  ready         : WechatyEventListenerReady
  scan          : WechatyEventListenerScan
  start         : WechatyEventListenerStartStop
  stop          : WechatyEventListenerStartStop
}

/**
 * Single-payload Event Detail Map for all Wechaty events in EventTarget.
 */
interface WechatyEventDetailMap {
  dong          : string | undefined
  error         : GError
  friendship    : Friendship
  heartbeat     : any
  login         : ContactSelf
  logout        : { contact: ContactSelf, data?: string, reason?: string }
  message       : Message
  post          : Post
  puppet        : PUPPET.Puppet
  ready         : undefined | null
  reset         : string | undefined | null
  'room-invite' : RoomInvitation
  'room-join'   : { room: Room, inviteeList: Contact[], inviter: Contact, date?: Date }
  'room-leave'  : { room: Room, leaverList: Contact[], remover?: Contact, date?: Date }
  'room-topic'  : { room: Room, newTopic: string, oldTopic: string, changer: Contact, date?: Date }
  scan          : { qrcode: string, status: PUPPET.types.ScanStatus, data?: string }
  start         : undefined | null
  stop          : undefined | null
}

type WechatyCustomEvent<E extends keyof WechatyEventDetailMap> =
  CustomEvent<WechatyEventDetailMap[E]>

type WechatyEventTargetListener<E extends keyof WechatyEventDetailMap> =
  | ((event: WechatyCustomEvent<E>) => void | Promise<void>)
  | { handleEvent (event: WechatyCustomEvent<E>): void | Promise<void> }

interface WechatyEventTarget {
  addEventListener<E extends keyof WechatyEventDetailMap>(
    type: E,
    listener: (event: WechatyCustomEvent<E>) => void | Promise<void>,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void

  removeEventListener<E extends keyof WechatyEventDetailMap>(
    type: E,
    listener: (event: WechatyCustomEvent<E>) => void | Promise<void>,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void

  dispatchEvent(event: Event): boolean

  next<E extends keyof WechatyEventDetailMap>(
    type: E,
    options?: { signal?: AbortSignal },
  ): Promise<WechatyEventDetailMap[E]>
  next<T = unknown>(
    type: string,
    options?: { signal?: AbortSignal },
  ): Promise<T>

  events<E extends keyof WechatyEventDetailMap>(
    type: E,
    options?: EventIteratorOptions,
  ): AsyncIterable<WechatyEventDetailMap[E]>
  events<T = unknown>(
    type: string,
    options?: EventIteratorOptions,
  ): AsyncIterable<T>
}

interface WechatyEventEmitterMethods {
  addListener<E extends keyof WechatyEventListeners> (event: E, listener: WechatyEventListeners[E]): this
  on<E extends keyof WechatyEventListeners> (event: E, listener: WechatyEventListeners[E]): this
  once<E extends keyof WechatyEventListeners> (event: E, listener: WechatyEventListeners[E]): this
  prependListener<E extends keyof WechatyEventListeners> (event: E, listener: WechatyEventListeners[E]): this
  prependOnceListener<E extends keyof WechatyEventListeners> (event: E, listener: WechatyEventListeners[E]): this

  off<E extends keyof WechatyEventListeners> (event: E, listener: WechatyEventListeners[E]): this
  removeAllListeners<E extends keyof WechatyEventListeners> (event?: E): this
  removeListener<E extends keyof WechatyEventListeners> (event: E, listener: WechatyEventListeners[E]): this

  emit<E extends keyof WechatyEventListeners> (event: E, ...args: Parameters<WechatyEventListeners[E]>): boolean
  emit (event: string | symbol, ...args: any[]): boolean
  eventNames (): (keyof WechatyEventListeners | string | symbol)[]
  rawListeners<E extends keyof WechatyEventListeners> (event: E): Function[]
  listeners<E extends keyof WechatyEventListeners> (event: E): Function[]
  listenerCount<E extends keyof WechatyEventListeners> (event: E): number

  getMaxListeners (): number
  setMaxListeners (maxListeners: number): this
}

/**
 * @deprecated Use `WechatyEventTarget` instead. `WechatyEventTargetInterface` is retained for backwards compatibility.
 */
type WechatyEventTargetInterface = WechatyEventTarget

type WechatyEventEmitter = WechatyEventEmitterMethods & WechatyEventTarget

/**
 * @deprecated Use `WechatyEventEmitter` instead. `WechatyEventEmitterInterface` is retained for backwards compatibility.
 */
type WechatyEventEmitterInterface = WechatyEventEmitter

/**
 * Alias for `WechatyEventEmitter` instance type.
 */
type WechatyEventEmitterInstance = WechatyEventEmitter

const WechatyEventEmitter = EventEmitter as unknown as new () => WechatyEventEmitter

export type {
  WechatyEventName,
  WechatyEventListeners,
  WechatyEventDetailMap,
  WechatyCustomEvent,
  WechatyEventTargetListener,
  WechatyEventTarget,
  WechatyEventTargetInterface,
  WechatyEventEmitterMethods,
  WechatyEventEmitterInterface,
  WechatyEventEmitterInstance,

  WechatyEventListenerDong,
  WechatyEventListenerError,
  WechatyEventListenerFriendship,
  WechatyEventListenerHeartbeat,
  WechatyEventListenerLogin,
  WechatyEventListenerLogout,
  WechatyEventListenerMessage,
  WechatyEventListenerPost,
  WechatyEventListenerPuppet,
  WechatyEventListenerReady,
  WechatyEventListenerRoomInvite,
  WechatyEventListenerRoomJoin,
  WechatyEventListenerRoomLeave,
  WechatyEventListenerRoomTopic,
  WechatyEventListenerScan,
  WechatyEventListenerStartStop,
}
export {
  WECHATY_EVENT_DICT,
  WechatyEventEmitter,
}
