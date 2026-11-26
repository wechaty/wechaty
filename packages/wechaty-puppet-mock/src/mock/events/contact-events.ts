/**
 * ContactMock EventTarget schemas and event emitter interface.
 *
 * Why this module exists:
 * Defines strongly-typed EventTarget contracts for `ContactMock`.
 * Replaces legacy `typed-emitter` with standard single-payload `WechatyEvent` interfaces
 * inheriting from `WechatyEventTarget`.
 *
 * Architectural boundaries:
 * Part of `wechaty-puppet-mock`. Runs identically across browser, Deno, Bun, and Node.js.
 *
 * Relationships:
 * - `WechatyEventTarget`: Base EventTarget class extended by `ContactEventEmitter`.
 * - `ContactMock`: User mock class extending `ContactEventEmitter`.
 */
import {
  EventEmitter,
  WechatyEvent,
  type EventIteratorOptions,
}                         from 'wechaty-puppet'

import type {
  ContactMock,
  MessageMock,
}                         from '../user/mod.ts'

export interface ContactEventDetailMap {
  message: MessageMock
}

export type ContactEventName = keyof ContactEventDetailMap
export type ContactCustomEvent<E extends ContactEventName> = WechatyEvent<ContactEventDetailMap[E]>
export type ContactEventTargetListener<E extends ContactEventName> =
  | ((event: ContactCustomEvent<E>) => void | Promise<void>)
  | { handleEvent (event: ContactCustomEvent<E>): void | Promise<void> }

export type ContactMessageEventListener = (this: ContactMock, message: MessageMock, date?: Date) => void | Promise<void>

export interface ContactEvents {
  message: ContactMessageEventListener
}

export interface ContactEventTargetInterface {
  addEventListener<E extends ContactEventName>(
    type: E,
    listener: ContactEventTargetListener<E>,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void

  removeEventListener<E extends ContactEventName>(
    type: E,
    listener: ContactEventTargetListener<E>,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void

  dispatchEvent (event: Event): boolean

  next<E extends ContactEventName>(
    type: E,
    options?: { signal?: AbortSignal },
  ): Promise<ContactEventDetailMap[E]>
  next<T = unknown>(
    type: string,
    options?: { signal?: AbortSignal },
  ): Promise<T>

  events<E extends ContactEventName>(
    type: E,
    options?: EventIteratorOptions,
  ): AsyncIterable<ContactEventDetailMap[E]>
  events<T = unknown>(
    type: string,
    options?: EventIteratorOptions,
  ): AsyncIterable<T>
}

export interface ContactEventEmitterMethods {
  addListener<E extends keyof ContactEvents> (event: E, listener: ContactEvents[E]): this
  on<E extends keyof ContactEvents> (event: E, listener: ContactEvents[E]): this
  once<E extends keyof ContactEvents> (event: E, listener: ContactEvents[E]): this
  prependListener<E extends keyof ContactEvents> (event: E, listener: ContactEvents[E]): this
  prependOnceListener<E extends keyof ContactEvents> (event: E, listener: ContactEvents[E]): this

  off<E extends keyof ContactEvents> (event: E, listener: ContactEvents[E]): this
  removeAllListeners<E extends keyof ContactEvents> (event?: E): this
  removeListener<E extends keyof ContactEvents> (event: E, listener: ContactEvents[E]): this

  emit (event: 'message', message: MessageMock, date?: Date): boolean
  eventNames (): (keyof ContactEvents | string | symbol)[]
  rawListeners<E extends keyof ContactEvents> (event: E): Function[]
  listeners<E extends keyof ContactEvents> (event: E): Function[]
  listenerCount<E extends keyof ContactEvents> (event: E): number

  getMaxListeners (): number
  setMaxListeners (maxListeners: number): this
}

export type ContactEventEmitterInterface = ContactEventEmitterMethods & ContactEventTargetInterface & EventEmitter

export const ContactEventEmitter = EventEmitter as unknown as new () => ContactEventEmitterInterface
