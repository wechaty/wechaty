/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 *   @ignore
 */
import {
  // config,
  Raven,
  Sayable,
  log,
}                       from '../config'
import PuppetAccessory  from '../puppet-accessory'

import Contact          from './contact'
import Message          from './message'

export const ROOM_EVENT_DICT = {
  join: 'tbw',
  leave: 'tbw',
  topic: 'tbw',
}
export type RoomEventName = keyof typeof ROOM_EVENT_DICT

export interface RoomMemberQueryFilter {
  name?:         string,
  roomAlias?:    string,
  contactAlias?: string,
}

export interface RoomQueryFilter {
  topic: string | RegExp,
}

/**
 * All wechat rooms(groups) will be encapsulated as a Room.
 *
 * `Room` is `Sayable`,
 * [Examples/Room-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/room-bot.ts}
 */
export abstract class Room extends PuppetAccessory implements Sayable {

  protected static readonly pool = new Map<string, Room>()

  /**
   * Create a new room.
   *
   * @static
   * @param {Contact[]} contactList
   * @param {string} [topic]
   * @returns {Promise<Room>}
   * @example <caption>Creat a room with 'lijiarui' and 'juxiaomi', the room topic is 'ding - created'</caption>
   * const helperContactA = await Contact.find({ name: 'lijiarui' })  // change 'lijiarui' to any contact in your wechat
   * const helperContactB = await Contact.find({ name: 'juxiaomi' })  // change 'juxiaomi' to any contact in your wechat
   * const contactList = [helperContactA, helperContactB]
   * console.log('Bot', 'contactList: %s', contactList.join(','))
   * const room = await Room.create(contactList, 'ding')
   * console.log('Bot', 'createDingRoom() new ding room created: %s', room)
   * await room.topic('ding - created')
   * await room.say('ding - created')
   */
  public static async create(contactList: Contact[], topic?: string): Promise<Room> {
    log.verbose('Room', 'create(%s, %s)', contactList.join(','), topic)

    if (!contactList || !Array.isArray(contactList)) {
      throw new Error('contactList not found')
    }

    try {
      const room = await this.puppet.roomCreate(contactList, topic)
      return room
    } catch (e) {
      log.error('Room', 'create() exception: %s', e && e.stack || e.message || e)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * Find room by topic, return all the matched room
   *
   * @static
   * @param {RoomQueryFilter} [query]
   * @returns {Promise<Room[]>}
   * @example
   * const roomList = await Room.findAll()                    // get the room list of the bot
   * const roomList = await Room.findAll({name: 'wechaty'})   // find all of the rooms with name 'wechaty'
   */
  public static async findAll<T extends typeof Room>(
    this  : T,
    query : RoomQueryFilter = { topic: /.*/ },
  ): Promise<T['prototype'][]> {
    log.verbose('Room', 'findAll({ topic: %s })', query.topic)

    if (!query.topic) {
      throw new Error('topicFilter not found')
    }

    try {
      const roomList = await this.puppet.roomFindAll(query)
      await Promise.all(roomList.map(room => room.ready()))

      return roomList

    } catch (e) {
      log.verbose('Room', 'findAll() rejected: %s', e.message)
      Raven.captureException(e)
      return [] as Room[] // fail safe
    }
  }

  /**
   * Try to find a room by filter: {topic: string | RegExp}. If get many, return the first one.
   *
   * @param {RoomQueryFilter} query
   * @returns {Promise<Room | null>} If can find the room, return Room, or return null
   */
  public static async find<T extends typeof Room>(
    this  : T,
    query : RoomQueryFilter,
  ): Promise<T['prototype'] | null> {
    log.verbose('Room', 'find({ topic: %s })', query.topic)

    const roomList = await this.findAll(query)
    if (!roomList || roomList.length < 1) {
      return null
    } else if (roomList.length > 1) {
      log.warn('Room', 'find() got more than one result, return the 1st one.')
    }
    return roomList[0]
  }

  /**
   * @private
   * About the Generic: https://stackoverflow.com/q/43003970/1123955
   */
  public static load<T extends typeof Room>(this: T, id: string): T['prototype'] {
    if (!id) {
      throw new Error('Room.load() no id')
    }

    const existingRoom = this.pool.get(id)
    if (existingRoom) {
      return existingRoom
    }

    const newRoom = new (this as any)(id)
    this.pool.set(id, newRoom)
    return newRoom
  }

  /**
   * @private
   */
  constructor(
    public id: string,
  ) {
    super()
    log.silly('Room', `constructor(${id})`)
  }

  /**
   * @private
   */
  public toString()    { return `@Room<${this.topic()}>` }

  /**
   * @private
   */
  public abstract async ready(): Promise<Room>

  public abstract say(message: Message)                 : Promise<void>
  public abstract say(text: string)                     : Promise<void>
  public abstract say(text: string, replyTo: Contact)   : Promise<void>
  public abstract say(text: string, replyTo: Contact[]) : Promise<void>
  public abstract say(text: never, ...args: never[])    : Promise<never>
  /**
   * Send message inside Room, if set [replyTo], wechaty will mention the contact as well.
   *
   * @param {(string | MediaMessage)} textOrMessage - Send `text` or `media file` inside Room.
   * @param {(Contact | Contact[])} [replyTo] - Optional parameter, send content inside Room, and mention @replyTo contact or contactList.
   * @returns {Promise<boolean>}
   * If bot send message successfully, it will return true. If the bot failed to send for blocking or any other reason, it will return false
   *
   * @example <caption>Send text inside Room</caption>
   * const room = await Room.find({name: 'wechaty'})        // change 'wechaty' to any of your room in wechat
   * await room.say('Hello world!')
   *
   * @example <caption>Send media file inside Room</caption>
   * const room = await Room.find({name: 'wechaty'})        // change 'wechaty' to any of your room in wechat
   * await room.say(new MediaMessage('/test.jpg'))          // put the filePath you want to send here
   *
   * @example <caption>Send text inside Room, and mention @replyTo contact</caption>
   * const contact = await Contact.find({name: 'lijiarui'}) // change 'lijiarui' to any of the room member
   * const room = await Room.find({name: 'wechaty'})        // change 'wechaty' to any of your room in wechat
   * await room.say('Hello world!', contact)
   */
  public abstract say(textOrMessage: string | Message, replyTo?: Contact|Contact[]): Promise<void>

  public emit(event: 'leave', leaver:       Contact[],  remover?: Contact)                    : boolean
  public emit(event: 'join' , inviteeList:  Contact[] , inviter:  Contact)                    : boolean
  public emit(event: 'topic', topic:        string,     oldTopic: string,   changer: Contact) : boolean
  public emit(event: never, ...args: never[]): never

  public emit(
    event:   RoomEventName,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }

  public on(event: 'leave', listener: (this: Room, leaver:      Contact,    remover?: Contact) => void)                 : this
  public on(event: 'join' , listener: (this: Room, inviteeList: Contact[] , inviter:  Contact) => void)                 : this
  public on(event: 'topic', listener: (this: Room, topic:       string,     oldTopic: string, changer: Contact) => void): this
  public on(event: never,   ...args: never[]): never

   /**
    * @desc       Room Class Event Type
    * @typedef    RoomEventName
    * @property   {string}  join  - Emit when anyone join any room.
    * @property   {string}  topic - Get topic event, emitted when someone change room topic.
    * @property   {string}  leave - Emit when anyone leave the room.<br>
    *                               If someone leaves the room by themselves, wechat will not notice other people in the room, so the bot will never get the "leave" event.
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
   * const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
   * if (room) {
   *   room.on('join', (room: Room, inviteeList: Contact[], inviter: Contact) => {
   *     const nameList = inviteeList.map(c => c.name()).join(',')
   *     console.log(`Room ${room.topic()} got new member ${nameList}, invited by ${inviter}`)
   *   })
   * }
   *
   * @example <caption>Event:leave </caption>
   * const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
   * if (room) {
   *   room.on('leave', (room: Room, leaverList: Contact[]) => {
   *     const nameList = leaverList.map(c => c.name()).join(',')
   *     console.log(`Room ${room.topic()} lost member ${nameList}`)
   *   })
   * }
   *
   * @example <caption>Event:topic </caption>
   * const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
   * if (room) {
   *   room.on('topic', (room: Room, topic: string, oldTopic: string, changer: Contact) => {
   *     console.log(`Room ${room.topic()} topic changed from ${oldTopic} to ${topic} by ${changer.name()}`)
   *   })
   * }
   *
   */
  public on(event: RoomEventName, listener: (...args: any[]) => any): this {
    log.verbose('Room', 'on(%s, %s)', event, typeof listener)

    super.on(event, listener) // Room is `Sayable`
    return this
  }

  /**
   * Add contact in a room
   *
   * @param {Contact} contact
   * @returns {Promise<number>}
   * @example
   * const contact = await Contact.find({name: 'lijiarui'}) // change 'lijiarui' to any contact in your wechat
   * const room = await Room.find({topic: 'wechat'})        // change 'wechat' to any room topic in your wechat
   * if (room) {
   *   const result = await room.add(contact)
   *   if (result) {
   *     console.log(`add ${contact.name()} to ${room.topic()} successfully! `)
   *   } else{
   *     console.log(`failed to add ${contact.name()} to ${room.topic()}! `)
   *   }
   * }
   */
  public abstract async add(contact: Contact): Promise<void>

  /**
   * Delete a contact from the room
   * It works only when the bot is the owner of the room
   * @param {Contact} contact
   * @returns {Promise<number>}
   * @example
   * const room = await Room.find({topic: 'wechat'})          // change 'wechat' to any room topic in your wechat
   * const contact = await Contact.find({name: 'lijiarui'})   // change 'lijiarui' to any room member in the room you just set
   * if (room) {
   *   const result = await room.del(contact)
   *   if (result) {
   *     console.log(`remove ${contact.name()} from ${room.topic()} successfully! `)
   *   } else{
   *     console.log(`failed to remove ${contact.name()} from ${room.topic()}! `)
   *   }
   * }
   */
  public abstract async del(contact: Contact): Promise<void>

  /**
   * @private
   */
  public abstract quit(): Promise<void>

  public abstract topic(): string
  public abstract topic(newTopic: string): Promise<void>

  /**
   * SET/GET topic from the room
   *
   * @param {string} [newTopic] If set this para, it will change room topic.
   * @returns {(string | void)}
   *
   * @example <caption>When you say anything in a room, it will get room topic. </caption>
   * const bot = Wechaty.instance()
   * bot
   * .on('message', async m => {
   *   const room = m.room()
   *   if (room) {
   *     const topic = room.topic()
   *     console.log(`room topic is : ${topic}`)
   *   }
   * })
   *
   * @example <caption>When you say anything in a room, it will change room topic. </caption>
   * const bot = Wechaty.instance()
   * bot
   * .on('message', async m => {
   *   const room = m.room()
   *   if (room) {
   *     const oldTopic = room.topic()
   *     room.topic('change topic to wechaty!')
   *     console.log(`room topic change from ${oldTopic} to ${room.topic()}`)
   *   }
   * })
   */
  public abstract topic(newTopic?: string): string | Promise<void>

  /**
   * Return contact's roomAlias in the room, the same as roomAlias
   * @param {Contact} contact
   * @returns {string | null} - If a contact has an alias in room, return string, otherwise return null
   * @example
   * const bot = Wechaty.instance()
   * bot
   * .on('message', async m => {
   *   const room = m.room()
   *   const contact = m.from()
   *   if (room) {
   *     const alias = room.alias(contact)
   *     console.log(`${contact.name()} alias is ${alias}`)
   *   }
   * })
   */
  public abstract alias(contact: Contact): string | null

  /**
   * Same as function alias
   * @param {Contact} contact
   * @returns {(string | null)}
   */
  public abstract roomAlias(contact: Contact): string | null

  /**
   * Check if the room has member `contact`.
   *
   * @param {Contact} contact
   * @returns {boolean} Return `true` if has contact, else return `false`.
   * @example <caption>Check whether 'lijiarui' is in the room 'wechaty'</caption>
   * const contact = await Contact.find({name: 'lijiarui'})   // change 'lijiarui' to any of contact in your wechat
   * const room = await Room.find({topic: 'wechaty'})         // change 'wechaty' to any of the room in your wechat
   * if (contact && room) {
   *   if (room.has(contact)) {
   *     console.log(`${contact.name()} is in the room ${room.topic()}!`)
   *   } else {
   *     console.log(`${contact.name()} is not in the room ${room.topic()} !`)
   *   }
   * }
   */
  public abstract has(contact: Contact): boolean

  public abstract memberAll(filter: RoomMemberQueryFilter): Contact[]
  public abstract memberAll(name: string): Contact[]

  /**
   * The way to search member by Room.member()
   *
   * @typedef    MemberQueryFilter
   * @property   {string} name            -Find the contact by wechat name in a room, equal to `Contact.name()`.
   * @property   {string} roomAlias       -Find the contact by alias set by the bot for others in a room.
   * @property   {string} contactAlias    -Find the contact by alias set by the contact out of a room, equal to `Contact.alias()`.
   * [More Detail]{@link https://github.com/Chatie/wechaty/issues/365}
   */

  /**
   * Find all contacts in a room
   *
   * #### definition
   * - `name`                 the name-string set by user-self, should be called name, equal to `Contact.name()`
   * - `roomAlias`            the name-string set by user-self in the room, should be called roomAlias
   * - `contactAlias`         the name-string set by bot for others, should be called alias, equal to `Contact.alias()`
   * @param {(RoomMemberQueryFilter | string)} queryArg -When use memberAll(name:string), return all matched members, including name, roomAlias, contactAlias
   * @returns {Contact[]}
   * @memberof Room
   */
  public abstract memberAll(queryArg: RoomMemberQueryFilter | string): Contact[]

  public abstract member(name: string): Contact | null
  public abstract member(filter: RoomMemberQueryFilter): Contact | null

  /**
   * Find all contacts in a room, if get many, return the first one.
   *
   * @param {(RoomMemberQueryFilter | string)} queryArg -When use member(name:string), return all matched members, including name, roomAlias, contactAlias
   * @returns {(Contact | null)}
   *
   * @example <caption>Find member by name</caption>
   * const room = await Room.find({topic: 'wechaty'})           // change 'wechaty' to any room name in your wechat
   * if (room) {
   *   const member = room.member('lijiarui')                   // change 'lijiarui' to any room member in your wechat
   *   if (member) {
   *     console.log(`${room.topic()} got the member: ${member.name()}`)
   *   } else {
   *     console.log(`cannot get member in room: ${room.topic()}`)
   *   }
   * }
   *
   * @example <caption>Find member by MemberQueryFilter</caption>
   * const room = await Room.find({topic: 'wechaty'})          // change 'wechaty' to any room name in your wechat
   * if (room) {
   *   const member = room.member({name: 'lijiarui'})          // change 'lijiarui' to any room member in your wechat
   *   if (member) {
   *     console.log(`${room.topic()} got the member: ${member.name()}`)
   *   } else {
   *     console.log(`cannot get member in room: ${room.topic()}`)
   *   }
   * }
   */
  public abstract member(queryArg: RoomMemberQueryFilter | string): Contact | null

  /**
   * Get all room member from the room
   *
   * @returns {Contact[]}
   */
  public abstract memberList(): Contact[]

  /**
   * Force reload data for Room
   *
   * @returns {Promise<void>}
   */
  public abstract async refresh(): Promise<void>

  /**
   * @private
   * Get room's owner from the room.
   * Not recommend, because cannot always get the owner
   * @returns {(Contact | null)}
   */
  public abstract owner(): Contact | null

}

export default Room
