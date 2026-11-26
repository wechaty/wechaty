/**
 * The puppet's typed event emitter: every event name with its listener
 * signature, and `PuppetEventEmitter`, the class `PuppetSkeleton` extends.
 */
import { WechatyEventTarget, EventEmitter } from '../events/event-target.ts'
// typed-emitter ships CommonJS types, so NodeNext sees its default export
// under `.default`, as in wechaty's own event schemas.
import type * as TypedEventEmitter from 'typed-emitter'

import type {
  EventDirtyPayload,
  EventDongPayload,
  EventErrorPayload,
  EventFriendshipPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventPostPayload,
  EventResetPayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  EventRoomTopicPayload,
  EventRoomInvitePayload,
  EventScanPayload,
  EventReadyPayload,
  EventHeartbeatPayload,
  EventRoomAnnouncePayload,
}                                 from '../schemas/event.ts'

export type PuppetDirtyListener        = (payload: EventDirtyPayload)       => void | Promise<void>
export type PuppetDongListener         = (payload: EventDongPayload)        => void | Promise<void>
export type PuppetErrorListener        = (payload: EventErrorPayload)       => void | Promise<void>
export type PuppetFriendshipListener   = (payload: EventFriendshipPayload)  => void | Promise<void>
export type PuppetHeartbeatListener    = (payload: EventHeartbeatPayload)   => void | Promise<void>
export type PuppetLoginListener        = (payload: EventLoginPayload)       => void | Promise<void>
export type PuppetLogoutListener       = (payload: EventLogoutPayload)      => void | Promise<void>
export type PuppetMessageListener      = (payload: EventMessagePayload)     => void | Promise<void>
export type PuppetPostListener         = (payload: EventPostPayload)        => void | Promise<void>
export type PuppetReadyListener        = (payload: EventReadyPayload)       => void | Promise<void>
export type PuppetResetListener        = (payload: EventResetPayload)       => void | Promise<void>
export type PuppetRoomInviteListener   = (payload: EventRoomInvitePayload)  => void | Promise<void>
export type PuppetRoomJoinListener     = (payload: EventRoomJoinPayload)    => void | Promise<void>
export type PuppetRoomLeaveListener    = (payload: EventRoomLeavePayload)   => void | Promise<void>
export type PuppetRoomTopicListener    = (payload: EventRoomTopicPayload)   => void | Promise<void>
export type PuppetRoomAnnounceListener = (payload: EventRoomAnnouncePayload)=> void | Promise<void>
export type PuppetScanListener         = (payload: EventScanPayload)        => void | Promise<void>

export type PuppetStartListener        = () => void | Promise<void>
export type PuppetStopListener         = () => void | Promise<void>

interface PuppetEventListener {
  dirty          : PuppetDirtyListener
  dong           : PuppetDongListener
  error          : PuppetErrorListener
  friendship     : PuppetFriendshipListener
  heartbeat      : PuppetHeartbeatListener
  login          : PuppetLoginListener
  logout         : PuppetLogoutListener
  message        : PuppetMessageListener
  post           : PuppetPostListener
  ready          : PuppetReadyListener
  reset          : PuppetResetListener
  'room-invite'  : PuppetRoomInviteListener
  'room-join'    : PuppetRoomJoinListener
  'room-leave'   : PuppetRoomLeaveListener
  'room-topic'   : PuppetRoomTopicListener
  'room-announce': PuppetRoomAnnounceListener
  scan           : PuppetScanListener
  start          : PuppetStartListener,
  stop           : PuppetStopListener,
}

type PuppetEventDetail<E extends keyof PuppetEventListener> =
  Parameters<PuppetEventListener[E]>[0] extends undefined
    ? undefined | null
    : Parameters<PuppetEventListener[E]>[0]

type PuppetCustomEvent<E extends keyof PuppetEventListener> =
  CustomEvent<PuppetEventDetail<E>>

type PuppetEventTargetListener<E extends keyof PuppetEventListener> =
  | ((event: PuppetCustomEvent<E>) => void | Promise<void>)
  | { handleEvent (event: PuppetCustomEvent<E>): void | Promise<void> }

interface PuppetEventTargetInterface {
  /**
   * Registers an event listener on the puppet instance using the standard WinterTC EventTarget interface.
   *
   * @param type - Name of the puppet event.
   * @param listener - Callback receiving the CustomEvent with `event.detail`.
   * @param options - Standard AddEventListenerOptions, including native `{ signal, once }`.
   */
  addEventListener<E extends keyof PuppetEventListener>(
    type: E,
    listener: PuppetEventTargetListener<E>,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void

  /**
   * Removes an event listener previously registered with `addEventListener`.
   *
   * @param type - Name of the puppet event.
   * @param listener - Callback to remove.
   * @param options - Standard EventListenerOptions.
   */
  removeEventListener<E extends keyof PuppetEventListener>(
    type: E,
    listener: PuppetEventTargetListener<E>,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void

  dispatchEvent (event: Event): boolean
}

type PuppetEventEmitterInterface = TypedEventEmitter.default<PuppetEventListener> & PuppetEventTargetInterface & WechatyEventTarget

const PuppetEventEmitter = WechatyEventTarget as unknown as new () => PuppetEventEmitterInterface

type PuppetEventName = keyof PuppetEventListener

export type {
  PuppetEventListener,
  PuppetEventName,
  PuppetEventDetail,
  PuppetCustomEvent,
  PuppetEventTargetListener,
  PuppetEventTargetInterface,
  PuppetEventEmitterInterface,
}
export {
  WechatyEventTarget,
  EventEmitter,
  PuppetEventEmitter,
}
