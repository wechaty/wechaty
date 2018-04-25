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
  log,
}                       from '../config'
import Misc             from '../misc'
import {
  Room,
  // RoomEventName,
  RoomMemberQueryName,
  RoomMemberQueryFilter,
  RoomQueryFilter,
}                         from '../puppet/'

import {
  WebMessage,
}                         from './web-message'
import WebContact         from './web-contact'

export interface WebRoomObj {
  id:               string,
  encryId:          string,
  topic:            string,
  ownerUin:         number,
  memberList:       WebContact[],
  nameMap:          Map<string, string>,
  roomAliasMap:     Map<string, string>,
  contactAliasMap:  Map<string, string>,
}

export interface WebRoomRawMember {
  UserName:     string,
  NickName:     string,
  DisplayName:  string,
}

export interface WebRoomRawObj {
  UserName:         string,
  EncryChatRoomId:  string,
  NickName:         string,
  OwnerUin:         number,
  ChatRoomOwner:    string,
  MemberList?:      WebRoomRawMember[],
}

/**
 * All wechat rooms(groups) will be encapsulated as a Room.
 *
 * `Room` is `Sayable`,
 * [Examples/Room-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/room-bot.ts}
 */
export class WebRoom extends Room {

  private dirtyObj: WebRoomObj | null // when refresh, use this to save dirty data for query
  private obj:      WebRoomObj | null
  private rawObj:   WebRoomRawObj

  /**
   * @private
   */
  constructor(public id: string) {
    super(id)
    log.silly('WebRoom', `constructor(${id})`)
  }

  /**
   * @private
   */
  public isReady(): boolean {
    return !!(this.obj && this.obj.memberList && this.obj.memberList.length)
  }

  /**
   * @private
   */
  private async readyAllMembers(memberList: WebRoomRawMember[]): Promise<void> {
    for (const member of memberList) {
      const contact = WebContact.load(member.UserName)
      contact.puppet = this.puppet
      await contact.ready()
    }
    return
  }

  /**
   * @private
   */
  public async ready(): Promise<Room> {
    log.silly('WebRoom', 'ready(%s)')
    if (!this.id) {
      const e = new Error('ready() on a un-inited Room')
      log.warn('WebRoom', e.message)
      throw e
    } else if (this.isReady()) {
      return this
    } else if (this.obj && this.obj.id) {
      log.verbose('WebRoom', 'ready() is not full loaded in room<topic:%s>. reloading', this.obj.topic)
    }

    try {
      let ttl = 7
      while (ttl--) {
        const roomRawObj = await this.puppet.getContact(this.id) as WebRoomRawObj

        const currNum = roomRawObj.MemberList && roomRawObj.MemberList.length || 0
        const prevNum = this.rawObj && this.rawObj.MemberList && this.rawObj.MemberList.length || 0

        log.silly('WebRoom', `ready() contactGetter(%s) MemberList.length:%d at ttl:%d`,
          this.id,
          currNum,
          ttl,
        )

        if (currNum) {
          if (prevNum === currNum) {
            log.verbose('WebRoom', `ready() contactGetter(${this.id}) done at ttl:%d`, ttl)
            break
          }
          this.rawObj = roomRawObj
        }

        log.silly('WebRoom', `ready() contactGetter(${this.id}) retry at ttl:%d`, ttl)
        await new Promise(r => setTimeout(r, 1000)) // wait for 1 second
      }

      await this.readyAllMembers(this.rawObj && this.rawObj.MemberList || [])
      this.obj = this.parse(this.rawObj)
      if (!this.obj) {
        throw new Error('no this.obj set after contactGetter')
      }
      await Promise.all(this.obj.memberList.map(c => c.ready()))

      return this

    } catch (e) {
      log.error('WebRoom', 'contactGetter(%s) exception: %s', this.id, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  public say(mediaMessage: MediaMessage)          : Promise<void>
  public say(content: string)                     : Promise<void>
  public say(content: string, replyTo: WebContact)   : Promise<void>
  public say(content: string, replyTo: WebContact[]) : Promise<void>
  public say(content: never, ...args: never[])    : Promise<never>

  /**
   * Send message inside Room, if set [replyTo], wechaty will mention the contact as well.
   *
   * @param {(string | MediaMessage)} textOrMedia - Send `text` or `media file` inside Room.
   * @param {(WebContact | WebContact[])} [replyTo] - Optional parameter, send content inside Room, and mention @replyTo contact or contactList.
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
  public async say(textOrMedia: string | MediaMessage, replyTo?: WebContact|WebContact[]): Promise<void> {
    const content = textOrMedia instanceof MediaMessage ? textOrMedia.filename() : textOrMedia
    log.verbose('WebRoom', 'say(%s, %s)',
                        content,
                        Array.isArray(replyTo)
                        ? replyTo.map(c => c.name()).join(', ')
                        : replyTo ? replyTo.name() : '',
    )

    let m
    if (typeof textOrMedia === 'string') {
      m = new WebMessage()
      m.puppet = this.puppet

      const replyToList: WebContact[] = [].concat(replyTo as any || [])

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

    await this.puppet.send(m)
  }

  /**
   * @private
   */
  public get(prop): string { return (this.obj && this.obj[prop]) || (this.dirtyObj && this.dirtyObj[prop]) }

  /**
   * @private
   */
  private parse(rawObj: WebRoomRawObj): WebRoomObj | null {
    if (!rawObj) {
      log.warn('WebRoom', 'parse() on a empty rawObj?')
      return null
    }

    const memberList = (rawObj.MemberList || [])
                        .map(m => {
                          const c = WebContact.load(m.UserName) as WebContact
                          c.puppet = this.puppet
                          return c
                        })

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
  private parseMap(parseContent: RoomMemberQueryName, memberList?: WebRoomRawMember[]): Map<string, string> {
    const mapList: Map<string, string> = new Map<string, string>()
    if (memberList && memberList.map) {
      memberList.forEach(member => {
        let tmpName: string
        const contact = WebContact.load(member.UserName)
        contact.puppet = this.puppet

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
        mapList[member.UserName] = Misc.stripEmoji(tmpName)
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
    if (!this.obj) {
      throw new Error('no this.obj')
    }
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj && this.obj[k]}`))
  }

  /**
   * Add contact in a room
   *
   * @param {WebContact} contact
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
  public async add(contact: WebContact): Promise<void> {
    log.verbose('WebRoom', 'add(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }

    await this.puppet.roomAdd(this, contact)
  }

  /**
   * Delete a contact from the room
   * It works only when the bot is the owner of the room
   * @param {WebContact} contact
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
  public async del(contact: WebContact): Promise<void> {
    log.verbose('WebRoom', 'del(%s)', contact.name())

    if (!contact) {
      throw new Error('contact not found')
    }
    await this.puppet.roomDel(this, contact)
    this.delLocal(contact)
  }

  /**
   * @private
   */
  private delLocal(contact: WebContact): number {
    log.verbose('WebRoom', 'delLocal(%s)', contact)

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
  public async quit(): Promise<void> {
    throw new Error('wx web not implement yet')
    // WechatyBro.glue.chatroomFactory.quit("@@1c066dfcab4ef467cd0a8da8bec90880035aa46526c44f504a83172a9086a5f7"
  }

  public topic(): string

  public async topic(newTopic: string): Promise<void>

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
    log.verbose('WebRoom', 'topic(%s)', newTopic ? newTopic : '')
    if (!this.isReady()) {
      log.warn('WebRoom', 'topic() room not ready')
    }

    if (typeof newTopic === 'undefined') {
      return Misc.plainText(this.obj ? this.obj.topic : '')
    }

    this.puppet // config.puppetInstance()
        .roomTopic(this, newTopic)
        .catch(e => {
          log.warn('WebRoom', 'topic(newTopic=%s) exception: %s',
                            newTopic, e && e.message || e,
                  )
          Raven.captureException(e)
        })

    if (!this.obj) {
      this.obj = <WebRoomObj>{}
    }
    this.obj['topic'] = newTopic
    return Promise.resolve()
  }

  /**
   * should be deprecated
   * @private
   */
  public nick(contact: WebContact): string | null {
    log.warn('WebRoom', 'nick(Contact) DEPRECATED, use alias(Contact) instead.')
    return this.alias(contact)
  }

  /**
   * Return contact's roomAlias in the room, the same as roomAlias
   * @param {WebContact} contact
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
  public alias(contact: WebContact): string | null {
    return this.roomAlias(contact)
  }

  /**
   * Same as function alias
   * @param {WebContact} contact
   * @returns {(string | null)}
   */
  public roomAlias(contact: WebContact): string | null {
    if (!this.obj || !this.obj.roomAliasMap) {
      return null
    }
    return this.obj.roomAliasMap[contact.id] || null
  }

  /**
   * Check if the room has member `contact`.
   *
   * @param {WebContact} contact
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
  public has(contact: WebContact): boolean {
    if (!this.obj || !this.obj.memberList) {
      return false
    }
    return this.obj.memberList
                    .filter(c => c.id === contact.id)
                    .length > 0
  }

  public memberAll(filter: RoomMemberQueryFilter): WebContact[]

  public memberAll(name: string): WebContact[]

  /**
   * The way to search member by Room.member()
   *
   * @typedef    MemberQueryFilter
   * @property   {string} name            -Find the contact by wechat name in a room, equal to `Contact.name()`.
   * @property   {string} alias           -Find the contact by alias set by the bot for others in a room, equal to `roomAlias`.
   * @property   {string} roomAlias       -Find the contact by alias set by the bot for others in a room.
   * @property   {string} contactAlias    -Find the contact by alias set by the contact out of a room, equal to `Contact.alias()`.
   * [More Detail]{@link https://github.com/Chatie/wechaty/issues/365}
   */

  /**
   * Find all contacts in a room
   *
   * #### definition
   * - `name`                 the name-string set by user-self, should be called name, equal to `Contact.name()`
   * - `roomAlias` | `alias`  the name-string set by user-self in the room, should be called roomAlias
   * - `contactAlias`         the name-string set by bot for others, should be called alias, equal to `Contact.alias()`
   * @param {(RoomMemberQueryFilter | string)} queryArg -When use memberAll(name:string), return all matched members, including name, roomAlias, contactAlias
   * @returns {WebContact[]}
   * @memberof Room
   */
  public memberAll(queryArg: RoomMemberQueryFilter | string): WebContact[] {
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

      return ([] as WebContact[]).concat(
        this.memberAll({name:         queryArg}),
        this.memberAll({roomAlias:    queryArg}),
        this.memberAll({contactAlias: queryArg}),
      )
    }

    /**
     * We got filter parameter
     */
    log.silly('WebRoom', 'memberAll({ %s })',
                      Object.keys(queryArg)
                            .map(k => `${k}: ${queryArg[k]}`)
                            .join(', '),
            )

    if (Object.keys(queryArg).length !== 1) {
      throw new Error('Room member find queryArg only support one key. multi key support is not availble now.')
    }

    if (!this.obj || !this.obj.memberList) {
      log.warn('WebRoom', 'member() not ready')
      return []
    }
    const filterKey            = Object.keys(queryArg)[0]
    /**
     * ISSUE #64 emoji need to be striped
     */
    const filterValue: string  = Misc.stripEmoji(Misc.plainText(queryArg[filterKey]))

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

    log.silly('WebRoom', 'memberAll() check %s from %s: %s', filterValue, filterKey, JSON.stringify(filterMap))

    if (idList.length) {
      return idList.map(id => {
        const c = WebContact.load(id) as WebContact
        c.puppet = this.puppet
        return c
      })
    } else {
      return []
    }
  }

  public member(name: string): WebContact | null

  public member(filter: RoomMemberQueryFilter): WebContact | null

  /**
   * Find all contacts in a room, if get many, return the first one.
   *
   * @param {(RoomMemberQueryFilter | string)} queryArg -When use member(name:string), return all matched members, including name, roomAlias, contactAlias
   * @returns {(WebContact | null)}
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
  public member(queryArg: RoomMemberQueryFilter | string): WebContact | null {
    log.verbose('WebRoom', 'member(%s)', JSON.stringify(queryArg))

    let memberList: WebContact[]
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
      log.warn('WebRoom', 'member(%s) get %d contacts, use the first one by default', JSON.stringify(queryArg), memberList.length)
    }
    return memberList[0]
  }

  /**
   * Get all room member from the room
   *
   * @returns {Contact[]}
   */
  public memberList(): WebContact[] {
    log.verbose('WebRoom', 'memberList')

    if (!this.obj || !this.obj.memberList || this.obj.memberList.length < 1) {
      log.warn('WebRoom', 'memberList() not ready')
      log.verbose('WebRoom', 'memberList() trying call refresh() to update')
      this.refresh().then(() => {
        log.verbose('WebRoom', 'memberList() refresh() done')
      })
      return []
    }
    return this.obj.memberList
  }

  /**
   * Create a new room.
   *
   * @static
   * @param {WebContact[]} contactList
   * @param {string} [topic]
   * @returns {Promise<WebRoom>}
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
  public static async create(contactList: WebContact[], topic?: string): Promise<Room> {
    log.verbose('WebRoom', 'create(%s, %s)', contactList.join(','), topic)

    if (!contactList || !Array.isArray(contactList)) {
      throw new Error('contactList not found')
    }

    try {
      const room = await this.puppet.roomCreate(contactList, topic)
      return room
    } catch (e) {
      log.error('WebRoom', 'create() exception: %s', e && e.stack || e.message || e)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * Find room by topic, return all the matched room
   *
   * @static
   * @param {RoomQueryFilter} [query]
   * @returns {Promise<WebRoom[]>}
   * @example
   * const roomList = await Room.findAll()                    // get the room list of the bot
   * const roomList = await Room.findAll({name: 'wechaty'})   // find all of the rooms with name 'wechaty'
   */
  public static async findAll(query?: RoomQueryFilter): Promise<Room[]> {
    if (!query) {
      query = { topic: /.*/ }
    }
    log.verbose('WebRoom', 'findAll({ topic: %s })', query.topic)

    try {
      const roomList = await this.puppet.roomFindAll(query)
      await Promise.all(roomList.map(room => room.ready()))
      return roomList
    } catch (e) {
      log.verbose('WebRoom', 'findAll() rejected: %s', e.message)
      Raven.captureException(e)
      return [] as Room[] // fail safe
    }
  }

  /**
   * Try to find a room by filter: {topic: string | RegExp}. If get many, return the first one.
   *
   * @param {RoomQueryFilter} query
   * @returns {Promise<WebRoom | null>} If can find the room, return Room, or return null
   */
  public static async find(query: RoomQueryFilter): Promise<Room | null> {
    log.verbose('WebRoom', 'find({ topic: %s })', query.topic)

    const roomList = await this.findAll(query)
    if (!roomList || roomList.length < 1) {
      return null
    } else if (roomList.length > 1) {
      log.warn('WebRoom', 'find() got more than one result, return the 1st one.')
    }
    return roomList[0]
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
   * Get room's owner from the room.
   * Not recommend, because cannot always get the owner
   * @returns {(Contact | null)}
   */
  public owner(): WebContact | null {
    log.info('WebRoom', 'owner() is limited by Tencent API, sometimes work sometimes not')
    return null
  }

  // /**
  //  * @private
  //  */
  // public static load(id: string): WebRoom {
  //   if (!id) {
  //     throw new Error('Room.load() no id')
  //   }

  //   if (id in this.pool) {
  //     return this.pool[id]
  //   }
  //   return this.pool[id] = new this(id)
  // }

}

export default WebRoom
