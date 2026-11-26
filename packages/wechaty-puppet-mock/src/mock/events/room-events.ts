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
  WechatyEventTarget,
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

export interface RoomEventEmitterInterface extends WechatyEventTarget {
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

export const RoomEventEmitter = WechatyEventTarget as unknown as new () => RoomEventEmitterInterface
