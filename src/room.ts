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
import * as util from 'util'

import {
  FileBox,
}                   from 'file-box'
import {
  instanceToClass,
}                   from 'clone-class'

import {
  // config,
  Raven,
  Sayable,
  log,
}                       from './config'
import PuppetAccessory  from './puppet-accessory'

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

export interface RoomPayload {
  // id:               string,
  // encryId:          string,
  topic:            string,
  memberList:       Contact[],
  owner?:           Contact,

  nameMap:          Map<string, string>,
  roomAliasMap:     Map<string, string>,
  contactAliasMap:  Map<string, string>,
  // [index: string]:  Map<string, string> | string | number | PuppeteerContact[],
}

/**
 * All wechat rooms(groups) will be encapsulated as a Room.
 *
 * `Room` is `Sayable`,
 * [Examples/Room-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/room-bot.ts}
 */
export class Room extends PuppetAccessory implements Sayable {

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
      throw new Error('no id')
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
   *
   *
   * Instance Properties
   *
   *
   */
  protected payload?: RoomPayload

  /**
   * @private
   */
  constructor(
    public readonly id: string,
  ) {
    super()
    log.silly('Room', `constructor(${id})`)

    // tslint:disable-next-line:variable-name
    const MyClass = instanceToClass(this, Room)

    if (MyClass === Room) {
      throw new Error('Room class can not be instanciated directly! See: https://github.com/Chatie/wechaty/issues/1217')
    }

    if (!this.puppet) {
      throw new Error('Room class can not be instanciated without a puppet!')
    }

  }

  /**
   * @private
   */
  public toString() {
    const identity = this.topic() || this.id
    return `Room<${identity}>`
  }

  public *[Symbol.iterator](): IterableIterator<Contact> {
    const memberList = this.memberList()
    for (const contact of memberList) {
      yield contact
    }
  }

  /**
   * @private
   */
  public async ready(): Promise<void> {
    log.silly('Room', 'ready()')

    if (this.isReady()) {
      return
    }

    const payload = await this.puppet.roomPayload(this.id)
    await Promise.all(
      payload.memberList.map(
        contact => contact.ready(),
      ),
    )
    log.silly('Room', 'ready() this.payload="%s"',
                                util.inspect(payload),
              )

    this.payload = payload
  }

  /**
   * @private
   */
  public isReady(): boolean {
    return !!(this.payload && this.payload.memberList && this.payload.memberList.length)
  }

  public say(text: string)                     : Promise<void>
  public say(text: string, mention: Contact)   : Promise<void>
  public say(text: string, mention: Contact[]) : Promise<void>
  public say(file: FileBox)                    : Promise<void>
  public say(text: never, ...args: never[])    : never

  /**
   * Send message inside Room, if set [replyTo], wechaty will mention the contact as well.
   *
   * @param {(string | MediaMessage)} textOrFile - Send `text` or `media file` inside Room.
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
  public async say(
    textOrFile : string | FileBox,
    mention?      : Contact | Contact[],
  ): Promise<void> {
    log.verbose('Room', 'say(%s, %s)',
                                  textOrFile,
                                  Array.isArray(mention)
                                  ? mention.map(c => c.name()).join(', ')
                                  : mention ? mention.name() : '',
                )
    let msg: Message
    let text: string

    const replyToList: Contact[] = [].concat(mention as any || [])

    if (typeof textOrFile === 'string') {

      if (replyToList.length > 0) {
        const AT_SEPRATOR = String.fromCharCode(8197)
        const mentionList = replyToList.map(c => '@' + c.name()).join(AT_SEPRATOR)
        text = mentionList + ' ' + textOrFile
      } else {
        text = textOrFile
      }
      msg = this.puppet.Message.createMO({
        room : this,
        to   : replyToList[0],   // FIXME: is this right?
        text,
      })
    } else if (textOrFile instanceof FileBox) {
      msg = this.puppet.Message.createMO({
        room: this,
        to: replyToList[0],
        file: textOrFile,
      })
    } else {
      throw new Error('arg unsupported')
    }

    await this.puppet.messageSend(msg)
  }

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
  public async add(contact: Contact): Promise<void> {
    log.verbose('Room', 'add(%s)', contact)
    await this.puppet.roomAdd(this, contact)
  }

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
  public async del(contact: Contact): Promise<void> {
    log.verbose('Room', 'del(%s)', contact)
    await this.puppet.roomDel(this, contact)
    this.delLocal(contact)
  }

  private delLocal(contact: Contact): void {
    log.verbose('Room', 'delLocal(%s)', contact)

    const memberList = this.payload && this.payload.memberList
    if (memberList && memberList.length > 0) {
      for (let i = 0; i < memberList.length; i++) {
        if (memberList[i].id === contact.id) {
          memberList.splice(i, 1)
          break
        }
      }
    }
  }

  /**
   * @private
   */
  public async quit(): Promise<void> {
    log.verbose('Room', 'quit() %s', this)
    await this.puppet.roomQuit(this)
  }

  public topic()                : string
  public topic(newTopic: string): Promise<void>

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
  public topic(newTopic?: string): string | Promise<void> {
    log.verbose('Room', 'topic(%s)', newTopic ? newTopic : '')
    if (!this.isReady()) {
      log.warn('Room', 'topic() room not ready')
    }

    if (typeof newTopic === 'undefined') {
      return this.payload && this.payload.topic || ''
    }

    const future = this.puppet
        .roomTopic(this, newTopic)
        .then(() => {
          this.payload = {
            ...this.payload || {} as RoomPayload,
            topic: newTopic,
          }
        })
        .catch(e => {
          log.warn('Room', 'topic(newTopic=%s) exception: %s',
                            newTopic, e && e.message || e,
                  )
          Raven.captureException(e)
        })

    return future
  }

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
  public alias(contact: Contact): null | string {
    return this.roomAlias(contact)
  }

  /**
   * Same as function alias
   * @param {Contact} contact
   * @returns {(string | null)}
   */
  public roomAlias(contact: Contact): null | string {
    if (!this.payload || !this.payload.roomAliasMap) {
      return null
    }
    return this.payload.roomAliasMap.get(contact.id) || null
  }

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
  public has(contact: Contact): boolean {
    if (!this.payload || !this.payload.memberList) {
      return false
    }
    return this.payload.memberList
                        .filter(c => c.id === contact.id)
                        .length > 0
  }

  public memberAll(filter: RoomMemberQueryFilter): Contact[]
  public memberAll(name: string): Contact[]

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
  public memberAll(queryArg: RoomMemberQueryFilter | string): Contact[] {
    if (typeof queryArg === 'string') {
      // TODO: filter the duplicated result
      return ([] as Contact[]).concat(
        this.memberAll({name:         queryArg}),
        this.memberAll({roomAlias:    queryArg}),
        this.memberAll({contactAlias: queryArg}),
      )
    }

    /**
     * We got filter parameter
     */
    log.silly('Room', 'memberAll({ %s })',
                                JSON.stringify(queryArg),
                      // Object.keys(queryArg)
                      //       .map((k: keyof RoomMemberQueryFilter) => `${k}: ${queryArg[k]}`)
                      //       .join(', '),
              )

    if (Object.keys(queryArg).length !== 1) {
      throw new Error('Room member find queryArg only support one key. multi key support is not availble now.')
    }

    if (!this.payload || !this.payload.memberList) {
      log.warn('Room', 'member() not ready')
      return []
    }
    const filterKey = Object.keys(queryArg)[0] as keyof RoomMemberQueryFilter
    /**
     * ISSUE #64 emoji need to be striped
     */
    const filterValue: string | undefined = /* Misc.stripEmoji(Misc.plainText( */ queryArg[filterKey] // ))
    if (!filterValue) {
      throw new Error('filterValue not found')
    }

    const keyMap = {
      contactAlias: 'contactAliasMap',
      name:         'nameMap',
      alias:        'roomAliasMap',
      roomAlias:    'roomAliasMap',
    }

    const filterMapName = keyMap[filterKey] as keyof RoomPayload
    if (!filterMapName) {
      throw new Error('unsupport filter key: ' + filterKey)
    }

    const filterMap = this.payload[filterMapName] as Map<string, string>
    const idList = Array.from(filterMap.keys())
                          .filter(id => filterMap.get(id) === filterValue)

    log.silly('Room', 'memberAll() check %s from %s: %s', filterValue, filterKey, JSON.stringify(filterMap))

    if (idList.length) {
      return idList.map(id => this.puppet.Contact.load(id))
    } else {
      return []
    }
  }

  public member(name  : string)               : null | Contact
  public member(filter: RoomMemberQueryFilter): null | Contact

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
  public member(
    queryArg: string | RoomMemberQueryFilter,
  ): null | Contact {
    log.verbose('Room', 'member(%s)', JSON.stringify(queryArg))

    let memberList: Contact[]
    // ISSUE #622
    // error TS2345: Argument of type 'string | MemberQueryFilter' is not assignable to parameter of type 'MemberQueryFilter' #622
    if (typeof queryArg === 'string') {
      memberList =  this.memberAll(queryArg)
    } else {
      memberList =  this.memberAll(queryArg)
    }

    if (!memberList || !memberList.length) {
      return null
    }

    if (memberList.length > 1) {
      log.warn('Room', 'member(%s) get %d contacts, use the first one by default', JSON.stringify(queryArg), memberList.length)
    }
    return memberList[0]
  }

  /**
   * Get all room member from the room
   *
   * @returns {Contact[]}
   */
  public memberList(): Contact[] {
    log.verbose('Room', 'memberList')

    if (!this.payload || !this.payload.memberList || this.payload.memberList.length < 1) {
      log.warn('Room', 'memberList() not ready')
      log.verbose('Room', 'memberList() trying call refresh() to update')
      this.sync().then(() => {
        log.verbose('Room', 'memberList() refresh() done')
      })
      return []
    }
    return this.payload.memberList
  }

  /**
   * Force reload data for Room
   * @deprecated use sync() instead
   * @returns {Promise<void>}
   */
  public async refresh(): Promise<void> {
    return this.sync()
  }

  /**
   * Sync data for Room
   *
   * @returns {Promise<void>}
   */
  public async sync(): Promise<void> {
    // TODO: make it work with the old dirty payload when in re-syncing...

    // if (this.isReady()) {
    //   this.dirtyObj = this.payload
    // }
    this.payload = undefined
    await this.ready()
  }

  /**
   * @private
   * Get room's owner from the room.
   * Not recommend, because cannot always get the owner
   * @returns {(Contact | null)}
   */
  public owner(): Contact | null {
    log.info('Room', 'owner()')

    return this.payload && this.payload.owner || null
  }

}

export default Room
