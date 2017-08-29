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
 * Licenst: Apache-2.0
 * https://github.com/chatie/wechaty
 *
 * Add/Del/Topic: https://github.com/chatie/wechaty/issues/32
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
  /**
   * try to get a room idendify room ID
   * @returns {string} return a room ID (notice: the room ID might be different each login time)
   * @memberof Room
   */
  public toString()    { return this.id }

  /**
   * try to get a room topic with room id format {Room:topic[ID]}
   * @returns {string} return a room topic with room ID
   * @memberof Room
   */
  public toStringEx()  { return `Room(${this.obj && this.obj.topic}[${this.id}])` }

  /**
   * check the room is ready for member or has already created, if fail to connect the room
   * will cause some problem for using
   * @returns {boolean} return true is the room is ready, otherwise false
   * @memberof Room
   */
  public isReady(): boolean {
    return !!(this.obj && this.obj.memberList && this.obj.memberList.length)
  }

  /**
   * Force reload data for room info include the member list and some delay cause
   * info not being updated
   * * @example
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) await Room.refresh()
   * @returns {Promise<void>}
   * @memberof Room
   */
  public async refresh(): Promise<void> {
    if (this.isReady()) {
      this.dirtyObj = this.obj
    }
    this.obj = null
    await this.ready()
    return
  }

  private async readyAllMembers(memberList: RoomRawMember[]): Promise<void> {
    for (const member of memberList) {
      const contact = Contact.load(member.UserName)
      await contact.ready()
    }
    return
  }
  /**
   * @todo Don't know what is this function for. by William
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
   * room leave event will post out a notice when room has member being the bot remove
   * (only work the bot is the room owner)
   *
   * @param {'leave'} event
   * @param {(this: Room, leaver: Contact) => void} listener
   * @returns {this}
   * @memberof Room
   */
  public on(event: 'leave', listener: (this: Room, leaver: Contact) => void): this

  /**
   * room join event will post out a notice when room has new member
   * (only work the bot is the room owner)
   * @param {'join'} event
   * @param {(this: Room, inviteeList: Contact[] , inviter: Contact)  => void} listener
   * @returns {this}
   * @memberof Room
   */
  public on(event: 'join' , listener: (this: Room, inviteeList: Contact[] , inviter: Contact)  => void): this

  /**
   * room topic name change event will post out a notice when the room topic being changed
   * @param {'topic'} event
   * @param {(this: Room, topic: string, oldTopic: string, changer: Contact) => void} listener
   * @returns {this}
   * @memberof Room
   */
  public on(event: 'topic', listener: (this: Room, topic: string, oldTopic: string, changer: Contact) => void): this
  /**
   * @todo Don't know what is this function for. by William
   */
  public on(event: 'EVENT_PARAM_ERROR', listener: () => void): this
  /**
   * @todo Don't know what is this function for. by William
   */
  public on(event: RoomEventName, listener: (...args: any[]) => any): this {
    log.verbose('Room', 'on(%s, %s)', event, typeof listener)

    super.on(event, listener) // Room is `Sayable`
    return this
  }

  public say(mediaMessage: MediaMessage)
  public say(content: string)
  public say(content: string, replyTo: Contact)
  public say(content: string, replyTo: Contact[])

  /**
   * room is sayable, room can say content or send MediaMessage such as file or picture to the room.
   * If you set replyTo, then say() will mention them as well.("@replyTo content")
   * @param {(string | MediaMessage)} textOrMedia
   * @param {(Contact|Contact[])} [replyTo] (optional)
   * @returns {Promise<boolean>} return true if saying successful, otherwise false.
   * @example
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) await room.say("test")
   * @memberof Room
   */
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
   * @todo Don't know what is this function for. by William
   */
  public get(prop): string { return (this.obj && this.obj[prop]) || (this.dirtyObj && this.dirtyObj[prop]) }
  /**
   * @todo Don't know what is this function for. by William
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
   * @todo Don't know what is this function for. by William
   */
  public dumpRaw() {
    console.error('======= dump raw Room =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }
  /**
   * @todo Don't know what is this function for. by William
   */
  public dump() {
    console.error('======= dump Room =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj && this.obj[k]}`))
  }

  /**
   * Add contact in a room (Promise)
   * @example
   * const friend = message.get('from')
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) room.add(friend)
   * @param {Contact} contact
   * @returns {Promise<number>}
   * @memberof Room
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
   * @param {Contact} contact
   * @returns {Promise<number>}
   * @example
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) room.del(friend)
   * @memberof Room
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

  public quit() {
    throw new Error('wx web not implement yet')
    // WechatyBro.glue.chatroomFactory.quit("@@1c066dfcab4ef467cd0a8da8bec90880035aa46526c44f504a83172a9086a5f7"
  }

  /**
   * get the room topic name
   * @returns {string}
   * @example
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) roomName = await room.topic()
   * @memberof Room
   */
  public topic(): string

  /**
   * Set the room topic name
   * (notice over 100 people only the room onwer can set the room topic)
   * @param {string} newTopic
   * @example
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) await room.topic("new Group Name")
   * @memberof Room
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
   * @returns {string | null} If a contact has an alias in room, return string, otherwise return null
   * @example
   * const friend = message.get('from')
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) roomAlias = await room.aliax(friend)   //get friend alias in the room
   */
  public alias(contact: Contact): string | null {
    return this.roomAlias(contact)
  }

  /**
   * @todo This function should be private by William
   */
  public roomAlias(contact: Contact): string | null {
    if (!this.obj || !this.obj.roomAliasMap) {
      return null
    }
    return this.obj.roomAliasMap[contact.id] || null
  }

  /**
   * check a person in the room or not. If in the room return true, otherwise false
   * @param {Contact} contact
   * @returns {boolean}
   * @example
   * const friend = await essage.from()
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) found = await room.has(friend)
   * @memberof Room
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
   * get the room onwer contact for a room (Not recommend, because cannot always get the owner)
   * @returns {(Contact | null)}
   * @example
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) owner = await room.owner()
   * @memberof Room
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

  public memberAll(filter: MemberQueryFilter): Contact[]
  public memberAll(name: string): Contact[]
  /**
   * Get all room member from the room
   * @param {MemberQueryFilter} filter
   * @returns {Contact[]}
   * @example
   * const room = await Room.find({ name: 'Group Name' })
   * if (room) members = await room.memberAll()
   * console.log(members)
   * @memberof Room
   */
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
   * Find the contact by name in room.
   * @param {string} name
   * @returns {(Contact | null)}
   * @memberof Room
   */
  public member(name: string): Contact | null

  /**
   * Find the contact by alias in the room
   * @param {MemberQueryFilter} filter
   * @returns {(Contact | null)}
   * @memberof Room
   */
  public member(filter: MemberQueryFilter): Contact | null

  /**
   * Find the contact by name in the room, equals to Room.member({name:name})
   * notice:
   * there are three kinds of names in wechat:
   *  Definition:
   *    name:          the name-string set by user-self, should be called name
   *    room alias:    the name-string set by user-self in a room, should be called room alias. room alias only belongs to the room.
   *    contact alias: the name-string set by bot for others, should be called contact alias
   *  Display order in wechat room:
   *    @ Event:
   *      When someone @ a contact in a room, wechat recognise the name order as follows: 
   *      room alias > name
   *    system message:
   *      When room event happens(join, leave, changetopic), system message recognise the name order as follows:
   *      contact alias > name
   *    on-screen Names:
   *      The contact name showed to the wechat user in the group
   *      contact alias > room alias > nickName
   *  Room.member() query key:
   *    self-set: {name: string}
   *    other-set: {alias: string}
   * @param {(MemberQueryFilter | string)} queryArg
   * @returns {(Contact | null)}
   * @memberof Room
   */
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
   * @returns {Contact[]}
   * @memberof Room
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
   * @static
   * @param {Contact[]} contactList
   * @param {string} [topic]
   * @returns {Promise<Room>}
   * @memberof Room
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
   * return all matched members, including name, roomAlias, contactAlias by a contact array
   * @static
   * @param {RoomQueryFilter} [query]
   * @returns {Promise<Room[]>}
   * @memberof Room
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

    await Promise.all(roomList.map(room => room.ready()))
    // for (let i = 0; i < roomList.length; i++) {
    //   await roomList[i].ready()
    // }

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
   * @todo document me
   * @todo Don't know what is this function for. by William
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
