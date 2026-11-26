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
  WechatyEventTarget,
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

export interface ContactEventEmitterInterface extends WechatyEventTarget {
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

export const ContactEventEmitter = WechatyEventTarget as unknown as new () => ContactEventEmitterInterface
