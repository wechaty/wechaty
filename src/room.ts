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
import { EventEmitter } from 'events'
const arrify = require('arrify')

import {
    Config
  , Sayable
  , log
}                 from './config'
import { Contact }    from './contact'
import { Message }    from './message'
import { UtilLib }    from './util-lib'

type RoomObj = {
  id:         string
  encryId:    string
  topic:      string
  ownerUin:   number
  memberList: Contact[]
  nickMap:    Map<string, string>
}

export type RoomRawMember = {
  UserName:     string
  DisplayName:  string
}

export type RoomRawObj = {
  UserName:         string
  EncryChatRoomId:  string
  NickName:         string
  OwnerUin:         number
  MemberList:       RoomRawMember[]
}

export type RoomEventName = 'join'
                          | 'leave'
                          | 'topic'
                          | 'EVENT_PARAM_ERROR'

export type RoomQueryFilter = {
  topic: string | RegExp
}

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
      this.obj    = this.parse(data)

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
    log.verbose('Room', 'say(%s, %s)'
                      , content
                      , Array.isArray(replyTo)
                        ? replyTo.map(c => c.name()).join(', ')
                        : replyTo ? replyTo.name() : ''
    )

    const m = new Message()
    m.room(this)

    const replyToList: Contact[] = arrify(replyTo)

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
    return {
      id:           rawObj.UserName
      , encryId:    rawObj.EncryChatRoomId // ???
      , topic:      rawObj.NickName
      , ownerUin:   rawObj.OwnerUin

      , memberList: this.parseMemberList(rawObj.MemberList)
      , nickMap:    this.parseNickMap(rawObj.MemberList)
    }
  }

  private parseMemberList(rawMemberList: RoomRawMember[]): Contact[] {
    if (!rawMemberList || !rawMemberList.map) {
      return []
    }
    return rawMemberList.map(m => Contact.load(m.UserName))
  }

  private parseNickMap(memberList): Map<string, string> {
    const nickMap: Map<string, string> = new Map<string, string>()
    let contact, remark
    if (memberList && memberList.map) {
      memberList.forEach(m => {
        contact = Contact.load(m.UserName)
        if (contact) {
          remark = contact.remark()
        } else {
          remark = null
        }

        /**
         * ISSUE #64 emoji need to be striped
         */
        nickMap[m.UserName] = UtilLib.stripEmoji(
          remark || m.DisplayName || m.NickName
        )
      })
    }
    return nickMap
  }

  public dumpRaw() {
    console.error('======= dump raw Room =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }
  public dump() {
    console.error('======= dump Room =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj && this.obj[k]}`))
  }

  public async add(contact: Contact): Promise<any> {
    log.verbose('Room', 'add(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }

    await Config.puppetInstance()
                .roomAdd(this, contact)
    return
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
                                                  newTopic, e && e.message || e
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

  public nick(contact: Contact): string {
    if (!this.obj || !this.obj.nickMap) {
      return ''
    }
    return this.obj.nickMap[contact.id]
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
    let memberList = (this.obj && this.obj.memberList) || []

    let user = Config.puppetInstance()
                      .user

    if (user && user.get('uin') === ownerUin) {
      return user
    }

    memberList = memberList.filter(m => m.get('uin') === ownerUin)
    if (memberList.length > 0) {
      return memberList[0]
    } else {
      return null
    }
  }

  /**
   * NickName / DisplayName / RemarkName of member
   */
  public member(name: string): Contact | null {
    log.verbose('Room', 'member(%s)', name)

    if (!this.obj || !this.obj.memberList) {
      log.warn('Room', 'member() not ready')
      return null
    }

    /**
     * ISSUE #64 emoji need to be striped
     */
    name = UtilLib.stripEmoji(name)

    const nickMap = this.obj.nickMap
    const idList = Object.keys(nickMap)
                          .filter(k => nickMap[k] === name)

    log.silly('Room', 'member() check nickMap: %s', JSON.stringify(nickMap))

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

  public static async findAll(query: RoomQueryFilter): Promise<Room[]> {
    log.verbose('Room', 'findAll({ topic: %s })', query.topic)

    const topic = query.topic

    if (!topic) {
      throw new Error('topic not found')
    }

    let filterFunction: string

    if (topic instanceof RegExp) {
      filterFunction = `c => ${topic.toString()}.test(c)`
    } else if (typeof topic === 'string') {
      filterFunction = `c => c === '${topic}'`
    } else {
      throw new Error('unsupport topic type')
    }

    return Config.puppetInstance()
                  .roomFind(filterFunction)
                  .catch(e => {
                    log.verbose('Room', 'findAll() rejected: %s', e.message)
                    return [] // fail safe
                  })
  }

  public static async find(query: RoomQueryFilter): Promise<Room> {
    log.verbose('Room', 'find({ topic: %s })', query.topic)

    const roomList = await Room.findAll(query)
    if (!roomList || roomList.length < 1) {
      throw new Error('no room found')
    }
    const room = roomList[0]
    await room.ready()
    return room
  }

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
