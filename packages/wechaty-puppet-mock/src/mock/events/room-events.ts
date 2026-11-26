/**
 * RoomMock EventTarget schemas and event emitter interface.
 *
 * Why this module exists:
 * Defines strongly-typed EventTarget contracts for `RoomMock`.
 * Replaces legacy `typed-emitter` with standard single-payload `WechatyEvent` interfaces
 * inheriting from `WechatyEventTarget`.
 *
 * Architectural boundaries:
 * Part of `wechaty-puppet-mock`. Runs identically across browser, Deno, Bun, and Node.js.
 *
 * Relationships:
 * - `WechatyEventTarget`: Base EventTarget class extended by `RoomEventEmitter`.
 * - `RoomMock`: Room mock class extending `RoomEventEmitter`.
 */
import {
  EventEmitter,
  WechatyEvent,
  type EventIteratorOptions,
}                         from 'wechaty-puppet'

import type {
  MessageMock,
  RoomMock,
}                         from '../user/mod.ts'

export interface RoomEventDetailMap {
  message: MessageMock
}

export type RoomEventName = keyof RoomEventDetailMap
export type RoomCustomEvent<E extends RoomEventName> = WechatyEvent<RoomEventDetailMap[E]>
export type RoomEventTargetListener<E extends RoomEventName> =
  | ((event: RoomCustomEvent<E>) => void | Promise<void>)
  | { handleEvent (event: RoomCustomEvent<E>): void | Promise<void> }

export type RoomMessageEventListener = (this: RoomMock, message: MessageMock, date?: Date) => void | Promise<void>

export interface RoomEvents {
  message: RoomMessageEventListener
}

export interface RoomEventTargetInterface {
  addEventListener<E extends RoomEventName>(
    type: E,
    listener: RoomEventTargetListener<E>,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void

  removeEventListener<E extends RoomEventName>(
    type: E,
    listener: RoomEventTargetListener<E>,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void

  dispatchEvent (event: Event): boolean

  next<E extends RoomEventName>(
    type: E,
    options?: { signal?: AbortSignal },
  ): Promise<RoomEventDetailMap[E]>
  next<T = unknown>(
    type: string,
    options?: { signal?: AbortSignal },
  ): Promise<T>

  events<E extends RoomEventName>(
    type: E,
    options?: EventIteratorOptions,
  ): AsyncIterable<RoomEventDetailMap[E]>
  events<T = unknown>(
    type: string,
    options?: EventIteratorOptions,
  ): AsyncIterable<T>
}

export interface RoomEventEmitterMethods {
  addListener<E extends keyof RoomEvents> (event: E, listener: RoomEvents[E]): this
  on<E extends keyof RoomEvents> (event: E, listener: RoomEvents[E]): this
  once<E extends keyof RoomEvents> (event: E, listener: RoomEvents[E]): this
  prependListener<E extends keyof RoomEvents> (event: E, listener: RoomEvents[E]): this
  prependOnceListener<E extends keyof RoomEvents> (event: E, listener: RoomEvents[E]): this

  off<E extends keyof RoomEvents> (event: E, listener: RoomEvents[E]): this
  removeAllListeners<E extends keyof RoomEvents> (event?: E): this
  removeListener<E extends keyof RoomEvents> (event: E, listener: RoomEvents[E]): this

  emit (event: 'message', message: MessageMock, date?: Date): boolean
  eventNames (): (keyof RoomEvents | string | symbol)[]
  rawListeners<E extends keyof RoomEvents> (event: E): Function[]
  listeners<E extends keyof RoomEvents> (event: E): Function[]
  listenerCount<E extends keyof RoomEvents> (event: E): number

  getMaxListeners (): number
  setMaxListeners (maxListeners: number): this
}

export type RoomEventEmitterInterface = RoomEventEmitterMethods & RoomEventTargetInterface & EventEmitter

export const RoomEventEmitter = EventEmitter as unknown as new () => RoomEventEmitterInterface
