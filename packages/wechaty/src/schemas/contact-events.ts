/**
 * Contact event emitter and event target interfaces and method declarations.
 */
import {
  EventEmitter,
  type EventIteratorOptions,
  type WechatyEventTarget,
} from 'wechaty-puppet'

import type {
  ContactInterface,
  FriendshipInterface,
  MessageInterface,
} from '../user-modules/mod.ts'

export type ContactEventListenerMessage    = (this: ContactInterface, message: MessageInterface, date?: Date)  => void | Promise<void>
export type ContactEventListenerFriendship = (friendship: FriendshipInterface)                                 => void | Promise<void>

export interface ContactEventListeners {
  friendship : ContactEventListenerFriendship
  message    : ContactEventListenerMessage
}

export interface ContactEventDetailMap {
  friendship : FriendshipInterface
  message    : MessageInterface
}

export type ContactEventName = keyof ContactEventDetailMap

export interface ContactEventEmitterMethods {
  addListener<E extends keyof ContactEventListeners> (event: E, listener: ContactEventListeners[E]): this
  on<E extends keyof ContactEventListeners> (event: E, listener: ContactEventListeners[E]): this
  once<E extends keyof ContactEventListeners> (event: E, listener: ContactEventListeners[E]): this
  prependListener<E extends keyof ContactEventListeners> (event: E, listener: ContactEventListeners[E]): this
  prependOnceListener<E extends keyof ContactEventListeners> (event: E, listener: ContactEventListeners[E]): this

  off<E extends keyof ContactEventListeners> (event: E, listener: ContactEventListeners[E]): this
  removeAllListeners<E extends keyof ContactEventListeners> (event?: E): this
  removeListener<E extends keyof ContactEventListeners> (event: E, listener: ContactEventListeners[E]): this

  emit<E extends keyof ContactEventListeners> (event: E, ...args: Parameters<ContactEventListeners[E]>): boolean
  eventNames (): (keyof ContactEventListeners | string | symbol)[]
  rawListeners<E extends keyof ContactEventListeners> (event: E): Function[]
  listeners<E extends keyof ContactEventListeners> (event: E): Function[]
  listenerCount<E extends keyof ContactEventListeners> (event: E): number

  getMaxListeners (): number
  setMaxListeners (maxListeners: number): this
}

export interface ContactEventTargetInterface {
  addEventListener<E extends ContactEventName>(
    type: E,
    listener: (event: CustomEvent<ContactEventDetailMap[E]>) => void | Promise<void>,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void

  removeEventListener<E extends ContactEventName>(
    type: E,
    listener: (event: CustomEvent<ContactEventDetailMap[E]>) => void | Promise<void>,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void

  dispatchEvent(event: Event): boolean

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

export type ContactEventEmitterInterface = ContactEventEmitterMethods & ContactEventTargetInterface & WechatyEventTarget
export const ContactEventEmitter = EventEmitter as unknown as new () => ContactEventEmitterInterface
