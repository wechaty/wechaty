/**
 * Room event emitter and event target interfaces and method declarations.
 */
import {
  EventEmitter,
  type EventIteratorOptions,
  type WechatyEventTarget,
} from 'wechaty-puppet'

import type {
  ContactInterface,
  MessageInterface,
  RoomInterface,
  RoomInvitationInterface,
} from '../user-modules/mod.ts'

export const ROOM_EVENT_DICT = {
  invite  : 'tbw',
  join    : 'tbw',
  leave   : 'tbw',
  message : 'message that received in this room',
  topic   : 'tbw',
} as const

export type RoomEventName = keyof typeof ROOM_EVENT_DICT

export type RoomEventListenerInvite  = (this: RoomInterface, inviter: ContactInterface, invitation: RoomInvitationInterface)           => void | Promise<void>
export type RoomEventListenerJoin    = (this: RoomInterface, inviteeList: ContactInterface[], inviter: ContactInterface,  date?: Date) => void | Promise<void>
export type RoomEventListenerLeave   = (this: RoomInterface, leaverList: ContactInterface[], remover?: ContactInterface, date?: Date)  => void | Promise<void>
export type RoomEventListenerMessage = (this: RoomInterface, message: MessageInterface, date?: Date)                                   => void | Promise<void>
export type RoomEventListenerTopic   = (this: RoomInterface, topic: string, oldTopic: string, changer: ContactInterface, date?: Date)  => void | Promise<void>

export interface RoomEventListeners {
  invite  : RoomEventListenerInvite
  join    : RoomEventListenerJoin
  leave   : RoomEventListenerLeave
  message : RoomEventListenerMessage
  topic   : RoomEventListenerTopic
}

export interface RoomEventDetailMap {
  invite  : { inviter: ContactInterface, invitation: RoomInvitationInterface }
  join    : { inviteeList: ContactInterface[], inviter: ContactInterface, date?: Date }
  leave   : { leaverList: ContactInterface[], remover?: ContactInterface, date?: Date }
  message : MessageInterface
  topic   : { topic: string, oldTopic: string, changer: ContactInterface, date?: Date }
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

export type RoomEventEmitterInterface = RoomEventEmitterMethods & RoomEventTargetInterface & WechatyEventTarget
export const RoomEventEmitter = EventEmitter as unknown as new () => RoomEventEmitterInterface
