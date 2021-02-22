import { EventEmitter }   from 'events'
import TypedEventEmitter  from 'typed-emitter'

import {
  Contact,
  Message,
  Room,
  RoomInvitation,
}                   from '../user/mod'

export const ROOM_EVENT_DICT = {
  invite  : 'tbw',
  join    : 'tbw',
  leave   : 'tbw',
  message : 'message that received in this room',
  topic   : 'tbw',
}
export type RoomEventName = keyof typeof ROOM_EVENT_DICT

/**
 * @desc       Room Class Event Type
 * @typedef    RoomEventName
 * @property   {string}  join  - Emit when anyone join any room.
 * @property   {string}  topic - Get topic event, emitted when someone change room topic.
 * @property   {string}  leave - Emit when anyone leave the room.<br>
 *                               If someone leaves the room by themselves, WeChat will not notice other people in the room, so the bot will never get the "leave" event.
 */

/**
 * @desc       Room Class Event Function
 * @typedef    RoomEventFunction
 * @property   {Function} room-join       - (this: Room, inviteeList: Contact[] , inviter: Contact)  => void
 * @property   {Function} room-topic      - (this: Room, topic: string, oldTopic: string, changer: Contact) => void
 * @property   {Function} room-leave      - (this: Room, leaver: Contact) => void
 */

/**
 * @listens Room
 * @param   {RoomEventName}      event      - Emit WechatyEvent
 * @param   {RoomEventFunction}  listener   - Depends on the WechatyEvent
 * @return  {this}                          - this for chain
 *
 * @example <caption>Event:join </caption>
 * const bot = new Wechaty()
 * await bot.start()
 * // after logged in...
 * const room = await bot.Room.find({topic: 'topic of your room'}) // change `event-room` to any room topic in your WeChat
 * if (room) {
 *   room.on('join', (room, inviteeList, inviter) => {
 *     const nameList = inviteeList.map(c => c.name()).join(',')
 *     console.log(`Room got new member ${nameList}, invited by ${inviter}`)
 *   })
 * }
 *
 * @example <caption>Event:leave </caption>
 * const bot = new Wechaty()
 * await bot.start()
 * // after logged in...
 * const room = await bot.Room.find({topic: 'topic of your room'}) // change `event-room` to any room topic in your WeChat
 * if (room) {
 *   room.on('leave', (room, leaverList) => {
 *     const nameList = leaverList.map(c => c.name()).join(',')
 *     console.log(`Room lost member ${nameList}`)
 *   })
 * }
 *
 * @example <caption>Event:message </caption>
 * const bot = new Wechaty()
 * await bot.start()
 * // after logged in...
 * const room = await bot.Room.find({topic: 'topic of your room'}) // change `event-room` to any room topic in your WeChat
 * if (room) {
 *   room.on('message', (message) => {
 *     console.log(`Room received new message: ${message}`)
 *   })
 * }
 *
 * @example <caption>Event:topic </caption>
 * const bot = new Wechaty()
 * await bot.start()
 * // after logged in...
 * const room = await bot.Room.find({topic: 'topic of your room'}) // change `event-room` to any room topic in your WeChat
 * if (room) {
 *   room.on('topic', (room, topic, oldTopic, changer) => {
 *     console.log(`Room topic changed from ${oldTopic} to ${topic} by ${changer.name()}`)
 *   })
 * }
 *
 * @example <caption>Event:invite </caption>
 * const bot = new Wechaty()
 * await bot.start()
 * // after logged in...
 * const room = await bot.Room.find({topic: 'topic of your room'}) // change `event-room` to any room topic in your WeChat
 * if (room) {
 *   room.on('invite', roomInvitation => roomInvitation.accept())
 * }
 *
 */

export type RoomInviteEventListener  = (this: Room, inviter: Contact, invitation: RoomInvitation)                   => void
export type RoomJoinEventListener    = (this: Room, inviteeList: Contact[], inviter: Contact,  date?: Date)         => void
export type RoomLeaveEventListener   = (this: Room, leaverList: Contact[], remover?: Contact, date?: Date)          => void
export type RoomMessageEventListener = (this: Room, message: Message, date?: Date)                                  => void
export type RoomTopicEventListener   = (this: Room, topic: string, oldTopic: string, changer: Contact, date?: Date) => void

interface RoomEvents {
  invite  : RoomInviteEventListener
  join    : RoomJoinEventListener,
  leave   : RoomLeaveEventListener,
  message : RoomMessageEventListener,
  topic   : RoomTopicEventListener,
}

export const RoomEventEmitter = EventEmitter as new () => TypedEventEmitter<
  RoomEvents
>
