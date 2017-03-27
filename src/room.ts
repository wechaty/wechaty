import { EventEmitter } from 'events'

import {
  Config,
  Sayable,
  log,
}                 from './config'
import { Contact }    from './contact'
import { Message }    from './message'
import { UtilLib }    from './util-lib'

type RoomObj = {
  id:         string,
  encryId:    string,
  topic:      string,
  ownerUin:   number,
  memberList: Contact[],
  nameMap:    Map<string, string>,
  aliasMap:   Map<string, string>,
}

type NameType = 'name' | 'alias'

export type RoomRawMember = {
  UserName:     string,
  NickName:     string,
  DisplayName:  string,
}

export type RoomRawObj = {
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

export type RoomQueryFilter = {
  topic: string | RegExp,
}

export type MemberQueryFilter = {
  name?:  string,
  alias?: string,
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

  constructor(public id: string) {
    super()
    log.silly('Room', `constructor(${id})`)
  }

  public toString()    { return this.id }
  public toStringEx()  { return `Room(${this.obj && this.obj.topic}[${this.id}])` }

  public isReady(): boolean {
    return !!(this.obj && this.obj.memberList && this.obj.memberList.length)
  }

  public async refresh(): Promise<void> {
    if (this.isReady()) {
      this.dirtyObj = this.obj
    }
    this.obj = null
    await this.ready()
    return
  }

  private async readyAllMembers(memberList: RoomRawMember[]): Promise<void> {
    for (let member of memberList) {
      let contact = Contact.load(member.UserName)
      await contact.ready()
    }
    return
  }

  public async ready(contactGetter?: (id: string) => Promise<any>): Promise<void> {
    log.silly('Room', 'ready(%s)', contactGetter ? contactGetter.constructor.name : '')
    if (!this.id) {
      const e = new Error('ready() on a un-inited Room')
      log.warn('Room', e.message)
      throw e
    } else if (this.isReady()) {
      return
    } else if (this.obj && this.obj.id) {
      log.warn('Room', 'ready() has obj.id but memberList empty in room %s. reloading', this.obj.topic)
    }

    if (!contactGetter) {
      contactGetter = Config.puppetInstance()
                            .getContact.bind(Config.puppetInstance())
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

      return

    } catch (e) {
      log.error('Room', 'contactGetter(%s) exception: %s', this.id, e.message)
      throw e
    }
  }

  public on(event: 'leave', listener: (this: Room, leaver: Contact) => void): this
  public on(event: 'join' , listener: (this: Room, inviteeList: Contact[] , inviter: Contact)  => void): this
  public on(event: 'topic', listener: (this: Room, topic: string, oldTopic: string, changer: Contact) => void): this
  public on(event: 'EVENT_PARAM_ERROR', listener: () => void): this

  public on(event: RoomEventName, listener: Function): this {
    log.verbose('Room', 'on(%s, %s)', event, typeof listener)

    // const thisWithSay = {
    //   say: (content: string) => {
    //     return Config.puppetInstance()
    //                   .say(content)
    //   }
    // }
    // super.on(event, function() {
    //   return listener.apply(thisWithSay, arguments)
    // })

    super.on(event, listener) // Room is `Sayable`
    return this
  }

  public say(content: string): Promise<any>
  public say(content: string, replyTo: Contact): Promise<void>
  public say(content: string, replyTo: Contact[]): Promise<void>

  public say(content: string, replyTo?: Contact|Contact[]): Promise<void> {
    log.verbose('Room', 'say(%s, %s)',
                        content,
                        Array.isArray(replyTo)
                        ? replyTo.map(c => c.name()).join(', ')
                        : replyTo ? replyTo.name() : '',
    )

    const m = new Message()
    m.room(this)

    const replyToList: Contact[] = [].concat(replyTo as any || [])

    if (replyToList.length > 0) {
      const mentionList = replyToList.map(c => '@' + c.name()).join(' ')
      m.content(mentionList + ' ' + content)
    } else {
      m.content(content)
    }
    // m.to(replyToList[0])

    return Config.puppetInstance()
                  .send(m)
  }

  public get(prop): string { return (this.obj && this.obj[prop]) || (this.dirtyObj && this.dirtyObj[prop]) }

  private parse(rawObj: RoomRawObj): RoomObj | null {
    if (!rawObj) {
      log.warn('Room', 'parse() on a empty rawObj?')
      return null
    }

    const memberList = (rawObj.MemberList || [])
                        .map(m => Contact.load(m.UserName))

    const nameMap    = this.parseMap('name', rawObj.MemberList)
    const aliasMap   = this.parseMap('alias', rawObj.MemberList)

    return {
      id:         rawObj.UserName,
      encryId:    rawObj.EncryChatRoomId, // ???
      topic:      rawObj.NickName,
      ownerUin:   rawObj.OwnerUin,
      memberList,
      nameMap,
      aliasMap,
    }
  }

  private parseMap(parseContent: NameType, memberList?: RoomRawMember[]): Map<string, string> {
    const mapList: Map<string, string> = new Map<string, string>()
    if (memberList && memberList.map) {
      memberList.forEach(member => {
        let tmpName: string
        let contact = Contact.load(member.UserName)
        switch (parseContent) {
          case 'name':
            tmpName = contact.alias() || contact.name()
            break
          case 'alias':
            tmpName = member.DisplayName
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

  public dumpRaw() {
    console.error('======= dump raw Room =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }
  public dump() {
    console.error('======= dump Room =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj && this.obj[k]}`))
  }

  public async add(contact: Contact): Promise<number> {
    log.verbose('Room', 'add(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }

    const n = Config.puppetInstance()
                      .roomAdd(this, contact)
    return n
  }

  public async del(contact: Contact): Promise<number> {
    log.verbose('Room', 'del(%s)', contact.name())

    if (!contact) {
      throw new Error('contact not found')
    }
    const n = await Config.puppetInstance()
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
   * get topic
   */
  public topic(): string
  /**
   * set topic
   */
  public topic(newTopic: string): void

  public topic(newTopic?: string): string | void {
    if (!this.isReady()) {
      log.warn('Room', 'topic() room not ready')
    }

    if (newTopic) {
      log.verbose('Room', 'topic(%s)', newTopic)
      Config.puppetInstance().roomTopic(this, newTopic)
                              .catch(e => {
                                log.warn('Room', 'topic(newTopic=%s) exception: %s',
                                                  newTopic, e && e.message || e,
                                )
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
   * return contact's roomAlias in the room
   * @param {Contact} contact
   * @returns {string | null} If a contact has an alias in room, return string, otherwise return null
   */
  public alias(contact: Contact): string | null {
    if (!this.obj || !this.obj.aliasMap) {
      return null
    }
    return this.obj.aliasMap[contact.id] || null
  }

  public has(contact: Contact): boolean {
    if (!this.obj || !this.obj.memberList) {
      return false
    }
    return this.obj.memberList
                    .filter(c => c.id === contact.id)
                    .length > 0
  }

  public owner(): Contact | null {
    const ownerUin = this.obj && this.obj.ownerUin

    let user = Config.puppetInstance()
                      .user

    if (user && user.get('uin') === ownerUin) {
      return user
    }

    if (this.rawObj.ChatRoomOwner) {
      return Contact.load(this.rawObj.ChatRoomOwner)
    }

    return null
  }

  /**
   * find member priority by `name`(contactAlias) / `alias`(roomAlias)
   * when use member(name:string), equals to member({name:string})
   */
  public member(filter: MemberQueryFilter): Contact | null
  public member(name: string): Contact | null

  public member(queryArg: MemberQueryFilter | string): Contact | null {
    if (typeof queryArg === 'string') {
      return this.member({name: queryArg})
    }

    log.silly('Room', 'member({ %s })',
                         Object.keys(queryArg)
                                .map(k => `${k}: ${queryArg[k]}`)
                                .join(', '),
            )

    if (Object.keys(queryArg).length !== 1) {
      throw new Error('Room member find queryArg only support one key. multi key support is not availble now.')
    }

    if (!this.obj || !this.obj.memberList) {
      log.warn('Room', 'member() not ready')
      return null
    }
    let filterKey            = Object.keys(queryArg)[0]
    /**
     * ISSUE #64 emoji need to be striped
     */
    let filterValue: string  = UtilLib.stripEmoji(queryArg[filterKey])

    const keyMap = {
      name:       'nameMap',
      alias:      'aliasMap',
    }

    filterKey = keyMap[filterKey]
    if (!filterKey) {
      throw new Error('unsupport filter key')
    }

    if (!filterValue) {
      throw new Error('filterValue not found')
    }

    const filterMap = this.obj[filterKey]
    const idList = Object.keys(filterMap)
                          .filter(k => filterMap[k] === filterValue)

    log.silly('Room', 'member() check %s from %s: %s', filterValue, filterKey, JSON.stringify(filterMap))

    if (idList.length) {
      return Contact.load(idList[0])
    } else {
      return null
    }
  }

  public memberList(): Contact[] {
    log.verbose('Room', 'memberList')

    if (!this.obj || !this.obj.memberList || this.obj.memberList.length < 1) {
      log.warn('Room', 'memberList() not ready')
      return []
    }
    return this.obj.memberList
  }

  public static create(contactList: Contact[], topic?: string): Promise<Room> {
    log.verbose('Room', 'create(%s, %s)', contactList.join(','), topic)

    if (!contactList || !Array.isArray(contactList)) {
      throw new Error('contactList not found')
    }

    return Config.puppetInstance()
                  .roomCreate(contactList, topic)
                  .catch(e => {
                    log.error('Room', 'create() exception: %s', e && e.stack || e.message || e)
                    throw e
                  })
  }

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

    const roomList =  Config.puppetInstance()
                            .roomFind(filterFunction)
                            .catch(e => {
                              log.verbose('Room', 'findAll() rejected: %s', e.message)
                              return [] // fail safe
                            })
    for(let i=0; i<roomList.length; i++) {
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
   * @todo document me
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
