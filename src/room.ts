/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
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
 */
import { EventEmitter } from 'events'

import {
  config,
  Raven,
  Sayable,
  log,
}                     from './config'
import Contact        from './contact'
import {
  Message,
  MediaMessage,
}                     from './message'
import UtilLib        from './util-lib'

interface RoomObj {
  id:               string,
  encryId:          string,
  topic:            string,
  ownerUin:         number,
  memberList:       Contact[],
  nameMap:          Map<string, string>,
  roomAliasMap:     Map<string, string>,
  contactAliasMap:  Map<string, string>,
}

type NameType = 'name' | 'alias' | 'roomAlias' | 'contactAlias'

export interface RoomRawMember {
  UserName:     string,
  NickName:     string,
  DisplayName:  string,
}

export interface RoomRawObj {
  UserName:         string,
  EncryChatRoomId:  string,
  NickName:         string,
  OwnerUin:         number,
  ChatRoomOwner:    string,
  MemberList?:      RoomRawMember[],
}

export type RoomEventName = 'join'
                          | 'leave'
                          | 'topic'
                          | 'EVENT_PARAM_ERROR'

export interface RoomQueryFilter {
  topic: string | RegExp,
}

export interface MemberQueryFilter {
  name?:         string,
  alias?:        string,
  roomAlias?:    string,
  contactAlias?: string,
}

/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 * Add/Del/Topic: https://github.com/wechaty/wechaty/issues/32
 *
 */
export class Room extends EventEmitter implements Sayable {
  private static pool = new Map<string, Room>()

  private dirtyObj: RoomObj | null // when refresh, use this to save dirty data for query
  private obj:      RoomObj | null
  private rawObj:   RoomRawObj

  /**
   * @private
   */
  constructor(public id: string) {
    super()
    log.silly('Room', `constructor(${id})`)
  }

  /**
   * @private
   */
  public toString()    { return this.id }

  /**
   * @private
   */
  public toStringEx()  { return `Room(${this.obj && this.obj.topic}[${this.id}])` }

  /**
   * @private
   */
  public isReady(): boolean {
    return !!(this.obj && this.obj.memberList && this.obj.memberList.length)
  }

  /**
   * Force reload data for Room
   *
   * @returns {Promise<void>}
   */
  public async refresh(): Promise<void> {
    if (this.isReady()) {
      this.dirtyObj = this.obj
    }
    this.obj = null
    await this.ready()
    return
  }

  /**
   * @private
   */
  private async readyAllMembers(memberList: RoomRawMember[]): Promise<void> {
    for (const member of memberList) {
      const contact = Contact.load(member.UserName)
      await contact.ready()
    }
    return
  }

  /**
   * @private
   */
  public async ready(contactGetter?: (id: string) => Promise<any>): Promise<Room> {
    log.silly('Room', 'ready(%s)', contactGetter ? contactGetter.constructor.name : '')
    if (!this.id) {
      const e = new Error('ready() on a un-inited Room')
      log.warn('Room', e.message)
      throw e
    } else if (this.isReady()) {
      return this
    } else if (this.obj && this.obj.id) {
      log.warn('Room', 'ready() has obj.id but memberList empty in room %s. reloading', this.obj.topic)
    }

    if (!contactGetter) {
      contactGetter = config.puppetInstance()
                            .getContact.bind(config.puppetInstance())
    }
    if (!contactGetter) {
      throw new Error('no contactGetter')
    }

    try {
      const data = await contactGetter(this.id)
      log.silly('Room', `contactGetter(${this.id}) resolved`)
      this.rawObj = data
      await this.readyAllMembers(this.rawObj.MemberList || [])
      this.obj    = this.parse(this.rawObj)
      if (!this.obj) {
        throw new Error('no this.obj set after contactGetter')
      }
      await Promise.all(this.obj.memberList.map(c => c.ready(contactGetter)))

      return this

    } catch (e) {
      log.error('Room', 'contactGetter(%s) exception: %s', this.id, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * Get room leave event, emitted when bot remove someone from the room or someone remove the bot from the room.
   * If both personA and personB are not the bot itselt, the event cannot be fired if personA remove personB from the room
   * `this` is Sayable for all listeners.
   * Which means there will be a this.say() the method inside listener call,
   * you can use it sending a message to filehelper, just for logging/reporting usage for your convenience.
   * @param {'leave'} event
   * @param {(this: Room, leaver: Contact) => void} listener
   * @returns {this}
   * @example
   * ```ts
   *  const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
   *  if (room) {
   *    room.on('leave', (room: Room, leaverList: Contact[]) => {
   *      const nameList = leaverList.map(c => c.name()).join(',')
   *      console.log(`Room ${room.topic()} lost member ${nameList}`)
   *    })
   *  }
   * ```
   */
  public on(event: 'leave', listener: (this: Room, leaver: Contact) => void): this

  /**
   * Get room join event, emitted when someone join the room
   * `this` is Sayable for all listeners.
   * Which means there will be a this.say() the method inside listener call,
   * you can use it sending a message to filehelper, just for logging/reporting usage for your convenience.
   *
   * @param {'join'} event
   * @param {(this: Room, inviteeList: Contact[] , inviter: Contact)  => void} listener
   * @returns {this}
   * @example
   * ```ts
   *  const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
   *  if (room) {
   *    room.on('join', (room: Room, inviteeList: Contact[], inviter: Contact) => {
   *      const nameList = inviteeList.map(c => c.name()).join(',')
   *      console.log(`Room ${room.topic()} got new member ${nameList}, invited by ${inviter}`)
   *    })
   *  }
   */
  public on(event: 'join' , listener: (this: Room, inviteeList: Contact[] , inviter: Contact)  => void): this

  /**
   * Get topic event, emitted when someone change room topic
   * `this` is Sayable for all listeners.
   * Which means there will be a this.say() the method inside listener call,
   * you can use it sending a message to filehelper, just for logging/reporting usage for your convenience.
   *
   * @param {'topic'} event
   * @param {(this: Room, topic: string, oldTopic: string, changer: Contact) => void} listener
   * @returns {this}
   * @example
   * ```ts
   *  const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
   *  if (room) {
   *    room.on('topic', (room: Room, topic: string, oldTopic: string, changer: Contact) => {
   *      console.log(`Room ${room.topic()} topic changed from ${oldTopic} to ${topic} by ${changer.name()}`)
   *    })
   *  }
   */
  public on(event: 'topic', listener: (this: Room, topic: string, oldTopic: string, changer: Contact) => void): this

  /**
   * @private
   */
  public on(event: 'EVENT_PARAM_ERROR', listener: () => void): this

  /**
   * @private
   */
  public on(event: RoomEventName, listener: (...args: any[]) => any): this {
    log.verbose('Room', 'on(%s, %s)', event, typeof listener)

    super.on(event, listener) // Room is `Sayable`
    return this
  }

  /**
   * Send media file inside Room
   *
   * @param {MediaMessage} mediaMessage
   * @example
   * ```ts
   * // change 'wechaty' to any of your room in wechat
   * const room = await Room.find({name: 'wechaty'})
   * // put the filePath you want to send here
   * await room.say(new MediaMessage('/test.jpg'))
   * ```
   */
  public say(mediaMessage: MediaMessage)

  /**
   * Say content inside Room
   *
   * @param {string} content
   * @example
   * ```ts
   * // change 'wechaty' to any of your room in wechat
   * const room = await Room.find({name: 'wechaty'})
   * await room.say('Hello world!')
   * ```
   */
  public say(content: string)

  /**
   * Say content inside Room, and mention @replyTo contact.
   *
   * @param {string} content
   * @param {Contact} replyTo
   * @example
   * ```ts
   * // change 'lijiarui' to any of the room member
   * const contact = await Contact.find({name: 'lijiarui'})
   * // change 'wechaty' to any of your room in wechat
   * const room = await Room.find({name: 'wechaty'})
   * await room.say('Hello world!', contact)
   * ```
   */
  public say(content: string, replyTo: Contact)

  /**
   * Say content inside Room, and mention @replyTo contactList.
   *
   * @param {string} content
   * @param {Contact[]} replyTo
   */
  public say(content: string, replyTo: Contact[])

  public say(textOrMedia: string | MediaMessage, replyTo?: Contact|Contact[]): Promise<boolean> {
    const content = textOrMedia instanceof MediaMessage ? textOrMedia.filename() : textOrMedia
    log.verbose('Room', 'say(%s, %s)',
                        content,
                        Array.isArray(replyTo)
                        ? replyTo.map(c => c.name()).join(', ')
                        : replyTo ? replyTo.name() : '',
    )

    let m
    if (typeof textOrMedia === 'string') {
      m = new Message()

      const replyToList: Contact[] = [].concat(replyTo as any || [])

      if (replyToList.length > 0) {
        const AT_SEPRATOR = String.fromCharCode(8197)
        const mentionList = replyToList.map(c => '@' + c.name()).join(AT_SEPRATOR)
        m.content(mentionList + ' ' + content)
      } else {
        m.content(content)
      }
      // m.to(replyToList[0])
    } else
      m = textOrMedia

    m.room(this)

    return config.puppetInstance()
                  .send(m)
  }

  /**
   * @private
   */
  public get(prop): string { return (this.obj && this.obj[prop]) || (this.dirtyObj && this.dirtyObj[prop]) }

  /**
   * @private
   */
  private parse(rawObj: RoomRawObj): RoomObj | null {
    if (!rawObj) {
      log.warn('Room', 'parse() on a empty rawObj?')
      return null
    }

    const memberList = (rawObj.MemberList || [])
                        .map(m => Contact.load(m.UserName))

    const nameMap    = this.parseMap('name', rawObj.MemberList)
    const roomAliasMap   = this.parseMap('roomAlias', rawObj.MemberList)
    const contactAliasMap   = this.parseMap('contactAlias', rawObj.MemberList)

    return {
      id:         rawObj.UserName,
      encryId:    rawObj.EncryChatRoomId, // ???
      topic:      rawObj.NickName,
      ownerUin:   rawObj.OwnerUin,
      memberList,
      nameMap,
      roomAliasMap,
      contactAliasMap,
    }
  }

  /**
   * @private
   */
  private parseMap(parseContent: NameType, memberList?: RoomRawMember[]): Map<string, string> {
    const mapList: Map<string, string> = new Map<string, string>()
    if (memberList && memberList.map) {
      memberList.forEach(member => {
        let tmpName: string
        const contact = Contact.load(member.UserName)
        switch (parseContent) {
          case 'name':
            tmpName = contact.name()
            break
          case 'roomAlias':
            tmpName = member.DisplayName
            break
          case 'contactAlias':
            tmpName = contact.alias() || ''
            break
          default:
            throw new Error('parseMap failed, member not found')
        }
        /**
         * ISSUE #64 emoji need to be striped
         * ISSUE #104 never use remark name because sys group message will never use that
         * @rui: Wrong for 'never use remark name because sys group message will never use that', see more in the latest comment in #104
         * @rui: webwx's NickName here return contactAlias, if not set contactAlias, return name
         * @rui: 2017-7-2 webwx's NickName just ruturn name, no contactAlias
         */
        mapList[member.UserName] = UtilLib.stripEmoji(tmpName)
      })
    }
    return mapList
  }

  /**
   * @private
   */
  public dumpRaw() {
    console.error('======= dump raw Room =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }

  /**
   * @private
   */
  public dump() {
    console.error('======= dump Room =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj && this.obj[k]}`))
  }

  /**
   * Add contact in a room
   *
   * @param {Contact} contact
   * @returns {Promise<number>}
   * @example
   * ```ts
   * const contact = await Contact.find({name: 'lijiarui'}) // change 'lijiarui' to any contact in your wechat
   * const room = await Room.find({topic: 'wechat'}) // change 'wechat' to any room topic in your wechat
   * if (room) {
   *   const result = await room.add(contact)
   *   if (result) {
   *     console.log(`add ${contact.name()} to ${room.topic()} successfully! `)
   *   } else{
   *     console.log(`failed to add ${contact.name()} to ${room.topic()}! `)
   *   }
   * }
   * ```
   */
  public async add(contact: Contact): Promise<number> {
    log.verbose('Room', 'add(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }

    const n = config.puppetInstance()
                      .roomAdd(this, contact)
    return n
  }

  /**
   * Delete a contact from the room
   * It works only when the bot is the owner of the room
   * @param {Contact} contact
   * @returns {Promise<number>}
   * @example
   * ```ts
   * // change 'wechat' to any room topic in your wechat
   * const room = await Room.find({topic: 'wechat'})
   * // change 'lijiarui' to any room member in the room you just set
   * const contact = await Contact.find({name: 'lijiarui'})
   * if (room) {
   *   const result = await room.del(contact)
   *   if (result) {
   *     console.log(`remove ${contact.name()} from ${room.topic()} successfully! `)
   *   } else{
   *     console.log(`failed to remove ${contact.name()} from ${room.topic()}! `)
   *   }
   * }
   * ```
   */
  public async del(contact: Contact): Promise<number> {
    log.verbose('Room', 'del(%s)', contact.name())

    if (!contact) {
      throw new Error('contact not found')
    }
    const n = await config.puppetInstance()
                            .roomDel(this, contact)
                            .then(_ => this.delLocal(contact))
    return n
  }

  /**
   * @private
   */
  private delLocal(contact: Contact): number {
    log.verbose('Room', 'delLocal(%s)', contact)

    const memberList = this.obj && this.obj.memberList
    if (!memberList || memberList.length === 0) {
      return 0 // already in refreshing
    }

    let i
    for (i = 0; i < memberList.length; i++) {
      if (memberList[i].id === contact.id) {
        break
      }
    }
    if (i < memberList.length) {
      memberList.splice(i, 1)
      return 1
    }
    return 0
  }

  /**
   * @private
   */
  public quit() {
    throw new Error('wx web not implement yet')
    // WechatyBro.glue.chatroomFactory.quit("@@1c066dfcab4ef467cd0a8da8bec90880035aa46526c44f504a83172a9086a5f7"
  }

  /**
   * Get topic from the room
   *
   * @returns {string}
   * @example
   * ```ts
   * // when you say anything in a room, it will get room topic.
   * const bot = Wechaty.instance()
   * bot
   * .on('message', async m => {
   *   const room = m.room()
   *   if (room) {
   *     const topic = room.topic()
   *     console.log(`room topic is : ${topic}`)
   *   }
   * })
   * ```
   */
  public topic(): string

  /**
   * Set topic for the room
   *
   * @param {string} newTopic
   * @example
   * ```ts
   * // when you say anything in a room, it will change room topic.
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
   * ```
   */
  public topic(newTopic: string): void

  public topic(newTopic?: string): string | void {
    if (!this.isReady()) {
      log.warn('Room', 'topic() room not ready')
    }

    if (newTopic) {
      log.verbose('Room', 'topic(%s)', newTopic)
      config.puppetInstance()
            .roomTopic(this, newTopic)
            .catch(e => {
              log.warn('Room', 'topic(newTopic=%s) exception: %s',
                                newTopic, e && e.message || e,
                      )
              Raven.captureException(e)
            })
      if (!this.obj) {
        this.obj = <RoomObj>{}
      }
      Object.assign(this.obj, { topic: newTopic })
      return
    }
    return UtilLib.plainText(this.obj ? this.obj.topic : '')
  }

  /**
   * should be deprecated
   * @deprecated
   */
  public nick(contact: Contact): string | null {
    log.warn('Room', 'nick(Contact) DEPRECATED, use alias(Contact) instead.')
    return this.alias(contact)
  }

  /**
   * return contact's roomAlias in the room, the same as roomAlias
   * @param {Contact} contact
   * @returns {string | null}
   * If a contact has an alias in room, return string, otherwise return null
   * @example
   * ```ts
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
   * ```
   */
  public alias(contact: Contact): string | null {
    return this.roomAlias(contact)
  }

  /**
   * Same as function alias
   *
   * @param {Contact} contact
   * @returns {(string | null)}
   */
  public roomAlias(contact: Contact): string | null {
    if (!this.obj || !this.obj.roomAliasMap) {
      return null
    }
    return this.obj.roomAliasMap[contact.id] || null
  }

  /**
   * Check if the room has member `contact`.
   *
   * @param {Contact} contact
   * @returns {boolean} Return `true` if has contact, else return `false`.
   * @example
   * ```ts
   * // check whether 'lijiarui' is in the room 'wechaty'
   * // change 'lijiarui' to any of contact in your wechat
   * const contact = await Contact.find({name: 'lijiarui'})
   * // change 'wechaty' to any of the room in your wechat
   * const room = await Room.find({topic: 'wechaty'})
   * if (contact && room) {
   *   if (room.has(contact)) {
   *     console.log(`${contact.name()} is in the room ${room.topic()}!`)
   *   } else {
   *     console.log(`${contact.name()} is not in the room ${room.topic()} !`)
   *   }
   * }
   * ```
   */
  public has(contact: Contact): boolean {
    if (!this.obj || !this.obj.memberList) {
      return false
    }
    return this.obj.memberList
                    .filter(c => c.id === contact.id)
                    .length > 0
  }

  /**
   * Get room's owner from the room.
   * Not recommend, because cannot always get the owner
   * @returns {(Contact | null)}
   */
  public owner(): Contact | null {
    const ownerUin = this.obj && this.obj.ownerUin

    const user = config.puppetInstance()
                      .user

    if (user && user.get('uin') === ownerUin) {
      return user
    }

    if (this.rawObj.ChatRoomOwner) {
      return Contact.load(this.rawObj.ChatRoomOwner)
    }

    log.info('Room', 'owner() is limited by Tencent API, sometimes work sometimes not')
    return null
  }

  /**
   * find member by MemberQueryFilter
   * MemberQueryFilter can be:
   *    { name: string|Regex }
   *    { alias: string|Regex }
   *    { roomAlias: string|Regex }
   *    { contactAlias: string|Regex }
   * @param {MemberQueryFilter} filter
   * @returns {Contact[]}
   */
  public memberAll(filter: MemberQueryFilter): Contact[]

  /**
   * find member by name | roomAlias(alias) | contactAlias.
   * when use memberAll(name:string), return all matched members, including name, roomAlias, contactAlias
   * @param {string} name
   * @returns {Contact[]}
   */
  public memberAll(name: string): Contact[]

  public memberAll(queryArg: MemberQueryFilter | string): Contact[] {
    if (typeof queryArg === 'string') {
      //
      // use the following `return` statement to do this job.
      //

      // const nameList = this.memberAll({name: queryArg})
      // const roomAliasList = this.memberAll({roomAlias: queryArg})
      // const contactAliasList = this.memberAll({contactAlias: queryArg})

      // if (nameList) {
      //   contactList = contactList.concat(nameList)
      // }
      // if (roomAliasList) {
      //   contactList = contactList.concat(roomAliasList)
      // }
      // if (contactAliasList) {
      //   contactList = contactList.concat(contactAliasList)
      // }

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
                      Object.keys(queryArg)
                            .map(k => `${k}: ${queryArg[k]}`)
                            .join(', '),
            )

    if (Object.keys(queryArg).length !== 1) {
      throw new Error('Room member find queryArg only support one key. multi key support is not availble now.')
    }

    if (!this.obj || !this.obj.memberList) {
      log.warn('Room', 'member() not ready')
      return []
    }
    const filterKey            = Object.keys(queryArg)[0]
    /**
     * ISSUE #64 emoji need to be striped
     */
    const filterValue: string  = UtilLib.stripEmoji(UtilLib.plainText(queryArg[filterKey]))

    const keyMap = {
      contactAlias: 'contactAliasMap',
      name:         'nameMap',
      alias:        'roomAliasMap',
      roomAlias:    'roomAliasMap',
    }

    const filterMapName = keyMap[filterKey]
    if (!filterMapName) {
      throw new Error('unsupport filter key: ' + filterKey)
    }

    if (!filterValue) {
      throw new Error('filterValue not found')
    }

    const filterMap = this.obj[filterMapName]
    const idList = Object.keys(filterMap)
                          .filter(id => filterMap[id] === filterValue)

    log.silly('Room', 'memberAll() check %s from %s: %s', filterValue, filterKey, JSON.stringify(filterMap))

    if (idList.length) {
      return idList.map(id => Contact.load(id))
    } else {
      return []
    }
  }

  /**
   * Find member by name | roomAlias(alias) | contactAlias.
   * If got many, returns the first
   * @param {string} name
   * @returns {(Contact | null)}
   * @example
   * ```ts
   * // change 'wechaty' to any room name in your wechat
   * const room = await Room.find({topic: 'wechaty'})
   * if (room) {
   *   // change 'lijiarui' to any room member in your wechat
   *   const member = room.member('lijiarui')
   *   if (member) {
   *     console.log(`${room.topic()} got the member: ${member.name()}`)
   *   } else {
   *     console.log(`cannot get member in room: ${room.topic()}`)
   *   }
   * }
   * ```
   */
  public member(name: string): Contact | null

  /**
   * Find member by MemberQueryFilter
   * interface MemberQueryFilter:
   *    { name: string|Regex }
   *    { alias: string|Regex }
   *    { roomAlias: string|Regex }
   *    { contactAlias: string|Regex }
   * @param {string} name
   * @returns {(Contact | null)}
   * @example
   * ```ts
   * // change 'wechaty' to any room name in your wechat
   * const room = await Room.find({topic: 'wechaty'})
   * if (room) {
   *   // change 'lijiarui' to any room member in your wechat
   *   const member = room.member({name: 'lijiarui'})
   *   if (member) {
   *     console.log(`${room.topic()} got the member: ${member.name()}`)
   *   } else {
   *     console.log(`cannot get member in room: ${room.topic()}`)
   *   }
   * }
   * ```
   */
  public member(filter: MemberQueryFilter): Contact | null

  public member(queryArg: MemberQueryFilter | string): Contact | null {
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

    if (!this.obj || !this.obj.memberList || this.obj.memberList.length < 1) {
      log.warn('Room', 'memberList() not ready')
      log.verbose('Room', 'memberList() trying call refresh() to update')
      this.refresh().then(() => {
        log.verbose('Room', 'memberList() refresh() done')
      })
      return []
    }
    return this.obj.memberList
  }

  /**
   * Create a new room.
   *
   * @static
   * @param {Contact[]} contactList
   * @param {string} [topic]
   * @returns {Promise<Room>}
   * @example
   * ```ts
   * // creat a room with 'lijiarui' and 'juxiaomi', the room topic is 'ding - created'
   * // change 'lijiarui' to any contact in your wechat
   * const helperContactA = await Contact.find({ name: 'lijiarui' })
   * // change 'juxiaomi' to any contact in your wechat
   * const helperContactB = await Contact.find({ name: 'juxiaomi' })
   * const contactList = [helperContactA, helperContactB]
   * console.log('Bot', 'contactList: %s', contactList.join(','))
   * const room = await Room.create(contactList, 'ding')
   * console.log('Bot', 'createDingRoom() new ding room created: %s', room)
   * await room.topic('ding - created')
   * await room.say('ding - created')
   * ```
   */
  public static create(contactList: Contact[], topic?: string): Promise<Room> {
    log.verbose('Room', 'create(%s, %s)', contactList.join(','), topic)

    if (!contactList || !Array.isArray(contactList)) {
      throw new Error('contactList not found')
    }

    return config.puppetInstance()
                  .roomCreate(contactList, topic)
                  .catch(e => {
                    log.error('Room', 'create() exception: %s', e && e.stack || e.message || e)
                    Raven.captureException(e)
                    throw e
                  })
  }

  /**
   * Find room by topic, return all the matched room
   *
   * @static
   * @param {RoomQueryFilter} [query]
   * @returns {Promise<Room[]>}
   * @example
   * ```ts
   * // get the room list of the bot
   * const roomList = await Room.findAll()
   * // find all of the rooms with name 'wechaty'
   * const roomList = await Room.findAll({name: 'wechaty'})
   * ```
   */
  public static async findAll(query?: RoomQueryFilter): Promise<Room[]> {
    if (!query) {
      query = { topic: /.*/ }
    }
    log.verbose('Room', 'findAll({ topic: %s })', query.topic)

    let topicFilter = query.topic

    if (!topicFilter) {
      throw new Error('topicFilter not found')
    }

    let filterFunction: string

    if (topicFilter instanceof RegExp) {
      filterFunction = `(function (c) { return ${topicFilter.toString()}.test(c) })`
    } else if (typeof topicFilter === 'string') {
      topicFilter = topicFilter.replace(/'/g, '\\\'')
      filterFunction = `(function (c) { return c === '${topicFilter}' })`
    } else {
      throw new Error('unsupport topic type')
    }

    const roomList = await config.puppetInstance()
                                  .roomFind(filterFunction)
                                  .catch(e => {
                                    log.verbose('Room', 'findAll() rejected: %s', e.message)
                                    Raven.captureException(e)
                                    return [] // fail safe
                                  })

    for (let i = 0; i < roomList.length; i++) {
      await roomList[i].ready()
    }

    return roomList
  }

  /**
   * try to find a room by filter: {topic: string | RegExp}
   * @param {RoomQueryFilter} query
   * @returns {Promise<Room | null>} If can find the room, return Room, or return null
   */
  public static async find(query: RoomQueryFilter): Promise<Room | null> {
    log.verbose('Room', 'find({ topic: %s })', query.topic)

    const roomList = await Room.findAll(query)
    if (!roomList || roomList.length < 1) {
      return null
    } else if (roomList.length > 1) {
      log.warn('Room', 'find() got more than one result, return the 1st one.')
    }
    return roomList[0]
  }

  /**
   * @private
   */
  public static load(id: string): Room {
    if (!id) {
      throw new Error('Room.load() no id')
    }

    if (id in Room.pool) {
      return Room.pool[id]
    }
    return Room.pool[id] = new Room(id)
  }

}

export default Room
