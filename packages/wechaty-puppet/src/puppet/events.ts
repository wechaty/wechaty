/**
 * Puppet EventTarget schemas and event interfaces.
 *
 * Why this module exists:
 * Defines strongly-typed schemas and event contracts for `wechaty-puppet`.
 * Replaces legacy multi-argument function signatures and `typed-emitter` with
 * standard single-payload `WechatyEvent` interfaces adhering to WinterTC EventTarget.
 *
 * Architectural boundaries:
 * Part of `wechaty-puppet` core event architecture. Must not import `node:events`,
 * `typed-emitter`, or any runtime globals. Runs identically across browser, Deno, Bun, and Node.js.
 *
 * Relationships:
 * - `WechatyEventTarget`: Base EventTarget implementation providing `addEventListener`, `next`, and `events`.
 * - `WechatyEvent`: Standard CustomEvent envelope carrying immutable `detail` payloads.
 * - `PuppetSkeleton`: Extends `PuppetEventEmitter` typed by `PuppetEventEmitterInterface`.
 */

import {
  WechatyEventTarget,
  WechatyEvent,
  EventEmitter,
}                                 from '../events/event-target.ts'
import type {
  EventIteratorOptions,
}                                 from '../events/event-target.ts'

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

/**
 * Single-payload map binding every puppet event name to its structured detail payload.
 */
export interface PuppetEventDetailMap {
  dirty          : EventDirtyPayload
  dong           : EventDongPayload
  error          : EventErrorPayload
  friendship     : EventFriendshipPayload
  heartbeat      : EventHeartbeatPayload
  login          : EventLoginPayload
  logout         : EventLogoutPayload
  message        : EventMessagePayload
  post           : EventPostPayload
  ready          : EventReadyPayload
  reset          : EventResetPayload
  'room-invite'  : EventRoomInvitePayload
  'room-join'    : EventRoomJoinPayload
  'room-leave'   : EventRoomLeavePayload
  'room-topic'   : EventRoomTopicPayload
  'room-announce': EventRoomAnnouncePayload
  scan           : EventScanPayload
  start          : undefined
  stop           : undefined
}

/**
 * Union of all valid puppet event names.
 */
export type PuppetEventName = keyof PuppetEventDetailMap

/**
 * Resolves the detail payload type for a given puppet event name.
 */
export type PuppetEventDetail<E extends PuppetEventName> = PuppetEventDetailMap[E]

/**
 * Strongly-typed WechatyEvent for a given puppet event name.
 */
export type PuppetCustomEvent<E extends PuppetEventName> = WechatyEvent<PuppetEventDetailMap[E]>

/**
 * EventTarget listener callback or object for a typed puppet event.
 */
export type PuppetEventTargetListener<E extends PuppetEventName> =
  | ((event: PuppetCustomEvent<E>) => void | Promise<void>)
  | { handleEvent (event: PuppetCustomEvent<E>): void | Promise<void> }

export type PuppetDirtyListener        = (payload: EventDirtyPayload)        => void | Promise<void>
export type PuppetDongListener         = (payload: EventDongPayload)         => void | Promise<void>
export type PuppetErrorListener        = (payload: EventErrorPayload)        => void | Promise<void>
export type PuppetFriendshipListener   = (payload: EventFriendshipPayload)   => void | Promise<void>
export type PuppetHeartbeatListener    = (payload: EventHeartbeatPayload)    => void | Promise<void>
export type PuppetLoginListener        = (payload: EventLoginPayload)        => void | Promise<void>
export type PuppetLogoutListener       = (payload: EventLogoutPayload)       => void | Promise<void>
export type PuppetMessageListener      = (payload: EventMessagePayload)      => void | Promise<void>
export type PuppetPostListener         = (payload: EventPostPayload)         => void | Promise<void>
export type PuppetReadyListener        = (payload: EventReadyPayload)        => void | Promise<void>
export type PuppetResetListener        = (payload: EventResetPayload)        => void | Promise<void>
export type PuppetRoomInviteListener   = (payload: EventRoomInvitePayload)   => void | Promise<void>
export type PuppetRoomJoinListener     = (payload: EventRoomJoinPayload)     => void | Promise<void>
export type PuppetRoomLeaveListener    = (payload: EventRoomLeavePayload)    => void | Promise<void>
export type PuppetRoomTopicListener    = (payload: EventRoomTopicPayload)    => void | Promise<void>
export type PuppetRoomAnnounceListener = (payload: EventRoomAnnouncePayload) => void | Promise<void>
export type PuppetScanListener         = (payload: EventScanPayload)         => void | Promise<void>
export type PuppetStartListener        = () => void | Promise<void>
export type PuppetStopListener         = () => void | Promise<void>

/**
 * Legacy mapping interface retained for backwards-compatible type references.
 * Prefer `PuppetEventDetailMap` and `PuppetCustomEvent`.
 */
export interface PuppetEventListener {
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
  start          : PuppetStartListener
  stop           : PuppetStopListener
}

/**
 * WinterTC EventTarget interface contract for puppet instances.
 */
export interface PuppetEventTargetInterface {
  /**
   * Registers a typed event listener using standard DOM/WinterTC EventTarget semantics.
   *
   * @param type - Name of the puppet event.
   * @param listener - Callback receiving the CustomEvent with `event.detail`.
   * @param options - Standard AddEventListenerOptions (e.g. `{ signal, once }`).
   */
  addEventListener<E extends PuppetEventName>(
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
   * Removes a typed event listener previously registered with `addEventListener`.
   *
   * @param type - Name of the puppet event.
   * @param listener - Callback to remove.
   * @param options - Standard EventListenerOptions.
   */
  removeEventListener<E extends PuppetEventName>(
    type: E,
    listener: PuppetEventTargetListener<E>,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void

  /**
   * Dispatches a WinterTC Event or WechatyEvent to all registered listeners.
   *
   * @param event - Event instance to dispatch.
   * @returns Boolean indicating whether preventDefault was not invoked.
   */
  dispatchEvent (event: Event): boolean

  /**
   * Resolves the next occurrence of a typed puppet event as a single promise.
   *
   * @param type - Name of the puppet event to await.
   * @param options - Optional signal to cancel waiting.
   * @returns Promise resolving to `event.detail`.
   */
  next<E extends PuppetEventName>(
    type: E,
    options?: { signal?: AbortSignal },
  ): Promise<PuppetEventDetailMap[E]>
  next<T = unknown>(
    type: string,
    options?: { signal?: AbortSignal },
  ): Promise<T>

  /**
   * Returns an async iterable yielding typed event details for AI agent loops.
   *
   * @param type - Name of the puppet event stream.
   * @param options - Backpressure, highWaterMark, and signal options.
   * @returns AsyncIterable yielding `event.detail`.
   */
  events<E extends PuppetEventName>(
    type: E,
    options?: EventIteratorOptions,
  ): AsyncIterable<PuppetEventDetailMap[E]>
  events<T = unknown>(
    type: string,
    options?: EventIteratorOptions,
  ): AsyncIterable<T>
}

/**
 * Pure TypeScript single-payload emitter methods replacing legacy `typed-emitter`.
 */
export interface PuppetEventEmitterMethods {
  addListener<E extends keyof PuppetEventListener> (event: E, listener: PuppetEventListener[E]): this
  on<E extends keyof PuppetEventListener> (event: E, listener: PuppetEventListener[E]): this
  once<E extends keyof PuppetEventListener> (event: E, listener: PuppetEventListener[E]): this
  prependListener<E extends keyof PuppetEventListener> (event: E, listener: PuppetEventListener[E]): this
  prependOnceListener<E extends keyof PuppetEventListener> (event: E, listener: PuppetEventListener[E]): this

  off<E extends keyof PuppetEventListener> (event: E, listener: PuppetEventListener[E]): this
  removeAllListeners<E extends keyof PuppetEventListener> (event?: E): this
  removeListener<E extends keyof PuppetEventListener> (event: E, listener: PuppetEventListener[E]): this

  emit<E extends keyof PuppetEventListener> (
    event: E,
    ...args: [PuppetEventDetailMap[E]] extends [undefined] ? [] : [PuppetEventDetailMap[E]]
  ): boolean
  eventNames (): (keyof PuppetEventListener | string | symbol)[]
  rawListeners<E extends keyof PuppetEventListener> (event: E): Function[]
  listeners<E extends keyof PuppetEventListener> (event: E): Function[]
  listenerCount<E extends keyof PuppetEventListener> (event: E): number

  getMaxListeners (): number
  setMaxListeners (maxListeners: number): this
}

/**
 * Combined interface for PuppetEventEmitter implementing typed EventTarget, WechatyEventTarget,
 * and strongly-typed single-payload emitter methods without third-party dependencies.
 */
export type PuppetEventEmitterInterface = PuppetEventEmitterMethods & PuppetEventTargetInterface & WechatyEventTarget

export const PuppetEventEmitter = WechatyEventTarget as unknown as new () => PuppetEventEmitterInterface

export {
  WechatyEventTarget,
  WechatyEvent,
  EventEmitter,
}
