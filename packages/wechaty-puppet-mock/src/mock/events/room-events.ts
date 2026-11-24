/**
 * The typed `message` event emitter that `RoomMock` extends.
 */
import { EventEmitter }   from 'node:events'
// typed-emitter ships CommonJS types, so NodeNext sees its default export
// under `.default`.
import type * as TypedEventEmitter from 'typed-emitter'

import type {
  // ContactMock,
  MessageMock,
  RoomMock,
}                   from '../user/mod.ts'

// export type RoomInviteEventListener  = (this: Room, inviter: Contact, invitation: RoomInvitation)                   => void | Promise<void>
// export type RoomJoinEventListener    = (this: Room, inviteeList: Contact[], inviter: Contact,  date?: Date)         => void | Promise<void>
// export type RoomLeaveEventListener   = (this: Room, leaverList: Contact[], remover?: Contact, date?: Date)          => void | Promise<void>
export type RoomMessageEventListener = (this: RoomMock, message: MessageMock, date?: Date) => void | Promise<void>
// export type RoomTopicEventListener   = (this: Room, topic: string, oldTopic: string, changer: Contact, date?: Date) => void | Promise<void>

interface RoomEvents {
  // invite  : RoomInviteEventListener
  // join    : RoomJoinEventListener,
  // leave   : RoomLeaveEventListener,
  message : RoomMessageEventListener,
  // topic   : RoomTopicEventListener,
}

export const RoomEventEmitter = EventEmitter as any as new () => TypedEventEmitter.default<
  RoomEvents
>
