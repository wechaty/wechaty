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

import Config        from './config'
import Contact       from './contact'
import Message       from './message'
import UtilLib       from './util-lib'
import WechatyEvent  from './wechaty-event'

import log           from './brolog-env'

type RoomObj = {
  id:         string
  encryId:    string
  topic:      string
  ownerUin:   number
  memberList: Contact[]
  nickMap:    Map<string, string>
}

type RoomRawMemberList = {
  UserName:     string
  DisplayName:  string
}

type RoomRawObj = {
  UserName:         string
  EncryChatRoomId:  string
  NickName:         string
  OwnerUin:         number
  MemberList:       RoomRawMemberList[]
}

type RoomQueryFilter = {
  topic: string | RegExp
}

class Room extends EventEmitter {
  private static pool = new Map<string, Room>()

  private dirtyObj: RoomObj // when refresh, use this to save dirty data for query
  private obj:      RoomObj
  private rawObj:   RoomRawObj

  constructor(public id: string) {
    super()
    log.silly('Room', `constructor(${id})`)
    // this.id = id
    // this.obj = {}
    // this.dirtyObj = {}
    if (!Config.puppetInstance()) {
      throw new Error('Config.puppetInstance() not found')
    }
  }

  public toString()    { return this.id }
  public toStringEx()  { return `Room(${this.obj.topic}[${this.id}])` }

  // @private
  public isReady(): boolean {
    return !!(this.obj.memberList && this.obj.memberList.length)
  }

  public refresh(): Promise<Room> {
    if (this.isReady()) {
      this.dirtyObj = this.obj
    }
    this.obj = null
    return this.ready()
  }

  public ready(contactGetter?: (id: string) => Promise<RoomRawObj>): Promise<Room|void> {
    log.silly('Room', 'ready(%s)', contactGetter ? contactGetter.constructor.name : '')
    if (!this.id) {
      const e = new Error('ready() on a un-inited Room')
      log.warn('Room', e.message)
      return Promise.reject(e)
    } else if (this.isReady()) {
      return Promise.resolve(this)
    } else if (this.obj.id) {
      log.warn('Room', 'ready() has obj.id but memberList empty in room %s. reloading', this.obj.topic)
    }

    contactGetter = contactGetter || Config.puppetInstance()
                                            .getContact.bind(Config.puppetInstance())
    return contactGetter(this.id)
    .then(data => {
      log.silly('Room', `contactGetter(${this.id}) resolved`)
      this.rawObj = data
      this.obj    = this.parse(data)
      return this
    })
    .then(_ => {
      return Promise.all(this.obj.memberList.map(c => c.ready()))
                    .then(() => this)
    })
    .catch(e => {
      log.error('Room', 'contactGetter(%s) exception: %s', this.id, e.message)
      throw e
    })
  }

  public on(event: string, listener: Function) {
    log.verbose('Room', 'on(%s, %s)', event, typeof listener)

    /**
     * every room event must can be mapped to a global event.
     * such as: `join` to `room-join`
     */
    const wrapCallback = WechatyEvent.wrap.call(this, 'room-' + event, listener)

    // bind(this1, this2): the second this is for simulate the global room-* event
    super.on(event, wrapCallback.bind(this, this))
    return this
  }

  public say(content, replyTo = null): Promise<any> {
    log.verbose('Room', 'say(%s, %s)', content, replyTo)

    const m = new Message()
    m.room(this)

    if (!replyTo) {
      m.content(content)
      m.to(this)
      return Config.puppetInstance()
                    .send(m)
    }

    let mentionList
    if (replyTo.map) {
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

  public get(prop): string { return this.obj[prop] || this.dirtyObj[prop] }

  private parse(rawObj: RoomRawObj): RoomObj {
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
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
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
    log.verbose('Room', 'del(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }
    return Config.puppetInstance()
                  .roomDel(this, contact)
                  .then(_ => this.delLocal(contact))
  }

  // @private
  private delLocal(contact: Contact): boolean {
    log.verbose('Room', 'delLocal(%s)', contact)

    const memberList = this.obj.memberList
    if (!memberList || memberList.length === 0) {
      return true // already in refreshing
    }

    let i
    for (i = 0; i < memberList.length; i++) {
      if (memberList[i].id === contact.id) {
        break
      }
    }
    if (i < memberList.length) {
      memberList.splice(i, 1)
      return true
    }
    return false
  }

  public quit() {
    throw new Error('wx web not implement yet')
    // WechatyBro.glue.chatroomFactory.quit("@@1c066dfcab4ef467cd0a8da8bec90880035aa46526c44f504a83172a9086a5f7"
  }

  public topic(newTopic: string): string {
    if (newTopic) {
      log.verbose('Room', 'topic(%s)', newTopic)
    }

    if (newTopic) {
      Config.puppetInstance().roomTopic(this, newTopic)
      return newTopic
    }
    // return this.get('topic')
    return UtilLib.plainText(this.obj.topic)
  }

  public nick(contact: Contact): string {
    if (!this.obj.nickMap) {
      return ''
    }
    return this.obj.nickMap[contact.id]
  }

  public has(contact: Contact): boolean {
    if (!this.obj.memberList) {
      return false
    }
    return this.obj.memberList
                    .filter(c => c.id === contact.id)
                    .length > 0
  }

  public owner(): Contact {
    const ownerUin = this.obj.ownerUin
    let memberList = this.obj.memberList || []

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

  public member(name): Contact {
    log.verbose('Room', 'member(%s)', name)

    if (!this.obj.memberList) {
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

  public static create(contactList, topic): Promise<Room> {
    log.verbose('Room', 'create(%s, %s)', contactList.join(','), topic)

    if (!contactList || !(typeof contactList === 'array')) {
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
    log.silly('Room', 'findAll({ topic: %s })', query.topic)

    const topic = query.topic

    if (!topic) {
      throw new Error('topic not found')
    }

    let filterFunction
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

  public static find(query: RoomQueryFilter): Promise<Room> {
    log.verbose('Room', 'find({ topic: %s })', query.topic)

    return Room.findAll(query)
                .then(roomList => {
                  if (roomList && roomList.length > 0) {
                    return roomList[0]
                  }
                  return null
                })
                .catch(e => {
                  log.error('Room', 'find() rejected: %s', e.message)
                  return null // fail safe
                  // throw e
                })
  }

  public static load(id: string): Room {
    if (!id) { return null }

    if (id in Room.pool) {
      return Room.pool[id]
    }
    return Room.pool[id] = new Room(id)
  }

}

// Room.init()

// module.exports = Room
export default Room
