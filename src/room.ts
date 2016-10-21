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

import {
    Config
  , Sayable
}                 from './config'
import Contact    from './contact'
import Message    from './message'
import UtilLib    from './util-lib'

import log        from './brolog-env'

type RoomObj = {
  id:         string
  encryId:    string
  topic:      string
  ownerUin:   number
  memberList: Contact[]
  nickMap:    Map<string, string>
}

export type RoomRawMemberList = {
  UserName:     string
  DisplayName:  string
}

export type RoomRawObj = {
  UserName:         string
  EncryChatRoomId:  string
  NickName:         string
  OwnerUin:         number
  MemberList:       RoomRawMemberList[]
}

export type RoomEventName = 'join' | 'leave' | 'topic'
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

  public async refresh(): Promise<this> {
    if (this.isReady()) {
      this.dirtyObj = this.obj
    }
    this.obj = null
    return this.ready()
  }

  public async ready(contactGetter?: (id: string) => Promise<RoomRawObj>): Promise<this> {
    log.silly('Room', 'ready(%s)', contactGetter ? contactGetter.constructor.name : '')
    if (!this.id) {
      const e = new Error('ready() on a un-inited Room')
      log.warn('Room', e.message)
      return Promise.reject(e)
    } else if (this.isReady()) {
      return Promise.resolve(this)
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

    return contactGetter(this.id)
    .then(data => {
      log.silly('Room', `contactGetter(${this.id}) resolved`)
      this.rawObj = data
      this.obj    = this.parse(data)
      return this
    })
    .then(_ => {
      if (!this.obj) {
        throw new Error('no this.obj set after contactGetter')
      }
      return Promise.all(this.obj.memberList.map(c => c.ready()))
                    .then(() => this)
    })
    .catch(e => {
      log.error('Room', 'contactGetter(%s) exception: %s', this.id, e.message)
      throw e
    })
  }

  public on(event: 'leave', listener: (this: Sayable, leaver: Contact) => void): this
  public on(event: 'join' , listener: (invitee:      Contact   , inviter: Contact)  => void): this
  public on(event: 'join' , listener: (inviteeList:  Contact[] , inviter: Contact)  => void): this
  public on(event: 'topic', listener: (topic: string, oldTopic: string, changer: Contact) => void): this
  public on(event: 'EVENT_PARAM_ERROR', listener: () => void): this

  public on(event: RoomEventName, listener: Function): this {
    log.verbose('Room', 'on(%s, %s)', event, typeof listener)

    const thisWithSay = {
      say: (content: string) => {
        return Config.puppetInstance()
                      .say(content)
      }
    }
    super.on(event, function() {
      return listener.apply(thisWithSay, arguments)
    })

    return this
  }

  public say(content: string, replyTo?: Contact|Contact[]): Promise<any> {
    log.verbose('Room', 'say(%s, %s)'
                      , content
                      , Array.isArray(replyTo)
                        ? replyTo.map(c => c.name()).join(', ')
                        : replyTo ? replyTo.name() : ''
    )

    const m = new Message()
    m.room(this)

    if (!replyTo) {
      m.content(content)
      m.to(this)
      return Config.puppetInstance()
                    .send(m)
    }

    let mentionList
    if (Array.isArray(replyTo)) {
      m.to(replyTo[0])
      mentionList = replyTo.map(c => '@' + c.name()).join(' ')
    } else {
      m.to(replyTo)
      mentionList = '@' + replyTo.name()
    }

    m.content(mentionList + ' ' + content)
    return Config.puppetInstance()
                  .send(m)
  }

  public get(prop): string { return (this.obj && this.obj[prop]) || (this.dirtyObj && this.dirtyObj[prop]) }

  private parse(rawObj: RoomRawObj): RoomObj | null {
    if (!rawObj) {
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

  private parseMemberList(memberList) {
    if (!memberList || !memberList.map) {
      return []
    }
    return memberList.map(m => Contact.load(m.UserName))
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
        nickMap[m.UserName] = remark || m.DisplayName || m.NickName
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

  public add(contact: Contact): Promise<any> {
    log.verbose('Room', 'add(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }

    return Config.puppetInstance()
                  .roomAdd(this, contact)
  }

  public del(contact: Contact): Promise<number> {
    log.verbose('Room', 'del(%s)', contact.name())

    if (!contact) {
      throw new Error('contact not found')
    }
    return Config.puppetInstance()
                  .roomDel(this, contact)
                  .then(_ => this.delLocal(contact))
  }

  // @private
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

  public topic(newTopic?: string): string {
    if (!this.isReady()) {
      throw new Error('room not ready')
    }

    if (newTopic) {
      log.verbose('Room', 'topic(%s)', newTopic)
    }

    if (newTopic) {
      Config.puppetInstance().roomTopic(this, newTopic)
      return newTopic
    }
    // return this.get('topic')
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
    log.verbose('Room', 'member(%s)', name)

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

  public static findAll(query: RoomQueryFilter): Promise<Room[]> {
    log.verbose('Room', 'findAll({ topic: %s })', query.topic)

    const topic = query.topic

    if (!topic) {
      throw new Error('topic not found')
    }

    // see also Contact.findAll
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
                    log.error('Room', '_find() rejected: %s', e.message)
                    return [] // fail safe
                  })
  }

  public static async find(query: RoomQueryFilter): Promise<Room> {
    log.verbose('Room', 'find({ topic: %s })', query.topic)

    const roomList = await Room.findAll(query)
    if (!roomList || roomList.length < 1) {
      throw new Error('no room found')
    }
    return roomList[0]
  }

  public static load(id: string): Room | null {
    if (!id) { return null }

    if (id in Room.pool) {
      return Room.pool[id]
    }
    return Room.pool[id] = new Room(id)
  }

}

export default Room
