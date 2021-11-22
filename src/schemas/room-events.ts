import { EventEmitter }   from 'events'
import type TypedEventEmitter  from 'typed-emitter'

import type {
  ContactInterface,
  MessageInterface,
  RoomInterface,
  RoomInvitationInterface,
}                   from '../user-modules/mod.js'

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

type RoomEventListenerInvite  = (this: RoomInterface, inviter: ContactInterface, invitation: RoomInvitationInterface)           => void | Promise<void>
type RoomEventListenerJoin    = (this: RoomInterface, inviteeList: ContactInterface[], inviter: ContactInterface,  date?: Date) => void | Promise<void>
type RoomEventListenerLeave   = (this: RoomInterface, leaverList: ContactInterface[], remover?: ContactInterface, date?: Date)  => void | Promise<void>
type RoomEventListenerMessage = (this: RoomInterface, message: MessageInterface, date?: Date)                                   => void | Promise<void>
type RoomEventListenerTopic   = (this: RoomInterface, topic: string, oldTopic: string, changer: ContactInterface, date?: Date)  => void | Promise<void>

interface RoomEventListeners {
  invite  : RoomEventListenerInvite
  join    : RoomEventListenerJoin
  leave   : RoomEventListenerLeave
  message : RoomEventListenerMessage
  topic   : RoomEventListenerTopic
}

const RoomEventEmitter = EventEmitter as any as new () => TypedEventEmitter<
  RoomEventListeners
>

export type {
  RoomEventListeners,
  RoomEventListenerInvite,
  RoomEventListenerJoin,
  RoomEventListenerLeave,
  RoomEventListenerMessage,
  RoomEventListenerTopic,
}
export {
  RoomEventEmitter,
}
