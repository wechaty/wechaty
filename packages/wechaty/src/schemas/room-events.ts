/**
 * Room event emitter and event target interfaces and method declarations.
 */
import {
  EventEmitter,
  type EventIteratorOptions,
} from 'wechaty-puppet'

import type {
  Contact,
  Message,
  Room,
  RoomInvitation,
} from '../user-modules/mod.ts'

export const ROOM_EVENT_DICT = {
  invite  : 'tbw',
  join    : 'tbw',
  leave   : 'tbw',
  message : 'message that received in this room',
  topic   : 'tbw',
} as const

export type RoomEventName = keyof typeof ROOM_EVENT_DICT

export type RoomEventListenerInvite  = (this: Room, inviter: Contact, invitation: RoomInvitation)           => void | Promise<void>
export type RoomEventListenerJoin    = (this: Room, inviteeList: Contact[], inviter: Contact,  date?: Date) => void | Promise<void>
export type RoomEventListenerLeave   = (this: Room, leaverList: Contact[], remover?: Contact, date?: Date)  => void | Promise<void>
export type RoomEventListenerMessage = (this: Room, message: Message, date?: Date)                           => void | Promise<void>
export type RoomEventListenerTopic   = (this: Room, topic: string, oldTopic: string, changer: Contact, date?: Date)  => void | Promise<void>

export interface RoomEventListeners {
  invite  : RoomEventListenerInvite
  join    : RoomEventListenerJoin
  leave   : RoomEventListenerLeave
  message : RoomEventListenerMessage
  topic   : RoomEventListenerTopic
}

export interface RoomEventDetailMap {
  invite  : { inviter: Contact, invitation: RoomInvitation }
  join    : { inviteeList: Contact[], inviter: Contact, date?: Date }
  leave   : { leaverList: Contact[], remover?: Contact, date?: Date }
  message : Message
  topic   : { topic: string, oldTopic: string, changer: Contact, date?: Date }
}

export interface RoomEventEmitterMethods {
  addListener<E extends keyof RoomEventListeners> (event: E, listener: RoomEventListeners[E]): this
  on<E extends keyof RoomEventListeners> (event: E, listener: RoomEventListeners[E]): this
  once<E extends keyof RoomEventListeners> (event: E, listener: RoomEventListeners[E]): this
  prependListener<E extends keyof RoomEventListeners> (event: E, listener: RoomEventListeners[E]): this
  prependOnceListener<E extends keyof RoomEventListeners> (event: E, listener: RoomEventListeners[E]): this

  off<E extends keyof RoomEventListeners> (event: E, listener: RoomEventListeners[E]): this
  removeAllListeners<E extends keyof RoomEventListeners> (event?: E): this
  removeListener<E extends keyof RoomEventListeners> (event: E, listener: RoomEventListeners[E]): this

  emit<E extends keyof RoomEventListeners> (event: E, ...args: Parameters<RoomEventListeners[E]>): boolean
  eventNames (): (keyof RoomEventListeners | string | symbol)[]
  rawListeners<E extends keyof RoomEventListeners> (event: E): Function[]
  listeners<E extends keyof RoomEventListeners> (event: E): Function[]
  listenerCount<E extends keyof RoomEventListeners> (event: E): number

  getMaxListeners (): number
  setMaxListeners (maxListeners: number): this
}

export interface RoomEventTargetInterface {
  addEventListener<E extends RoomEventName>(
    type: E,
    listener: (event: CustomEvent<RoomEventDetailMap[E]>) => void | Promise<void>,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void

  removeEventListener<E extends RoomEventName>(
    type: E,
    listener: (event: CustomEvent<RoomEventDetailMap[E]>) => void | Promise<void>,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void

  dispatchEvent(event: Event): boolean

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

export type RoomEventTarget = RoomEventTargetInterface
export type RoomEventEmitter = RoomEventEmitterMethods & RoomEventTarget & EventEmitter

/**
 * @deprecated Use `RoomEventEmitter` instead. `RoomEventEmitterInterface` is retained for backwards compatibility.
 */
export type RoomEventEmitterInterface = RoomEventEmitter
export const RoomEventEmitter = EventEmitter as unknown as new () => RoomEventEmitter
