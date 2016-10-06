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
const EventEmitter = require('events')

const Wechaty   = require('./wechaty')
const Contact   = require('./contact')
const log       = require('./brolog-env')
const UtilLib   = require('./util-lib')
const Config    = require('./config')

class Room extends EventEmitter{
  constructor(id) {
    super()
    log.silly('Room', `constructor(${id})`)
    this.id = id
    this.obj = {}
    this.dirtyObj = {} // when refresh, use this to save dirty data for query
    if (!Config.puppetInstance()) {
      throw new Error('Config.puppetInstance() not found')
    }
  }

  toString()    { return this.id }
  toStringEx()  { return `Room(${this.obj.topic}[${this.id}])` }

  // @private
  isReady() {
    return this.obj.memberList && this.obj.memberList.length
  }

  refresh() {
    if (this.isReady()) {
      this.dirtyObj = this.obj
    }
    this.obj = {}
    return this.ready()
  }

  ready(contactGetter) {
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
    }).catch(e => {
      log.error('Room', 'contactGetter(%s) exception: %s', this.id, e.message)
      throw e
    })
  }

  get(prop) { return this.obj[prop] || this.dirtyObj[prop] }

  parse(rawObj) {
    if (!rawObj) {
      return {}
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

  parseMemberList(memberList) {
    if (!memberList || !memberList.map) {
      return []
    }
    return memberList.map(m => Contact.load(m.UserName))
  }

  parseNickMap(memberList) {
    const nickMap = {}
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

  dumpRaw() {
    console.error('======= dump raw Room =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }
  dump()    {
    console.error('======= dump Room =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
  }

  add(contact) {
    log.verbose('Room', 'add(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }

    return Config.puppetInstance()
                  .roomAdd(this, contact)
  }

  del(contact) {
    log.verbose('Room', 'del(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }
    return Config.puppetInstance()
                  .roomDel(this, contact)
                  .then(_ => this.delLocal(contact))
  }

  // @private
  delLocal(contact) {
    log.verbose('Room', 'delLocal(%s)', contact)

    const memberList = this.obj.memberList
    if (!memberList || memberList.length === 0) {
      return true // already in refreshing
    }

    let i
    for (i=0; i<memberList.length; i++) {
      if (memberList[i].id === contact.get('id')) {
        break
      }
    }
    if (i < memberList.length) {
      memberList.splice(i, 1)
      return true
    }
    return false
  }

  quit() {
    throw new Error('wx web not implement yet')
    // WechatyBro.glue.chatroomFactory.quit("@@1c066dfcab4ef467cd0a8da8bec90880035aa46526c44f504a83172a9086a5f7"
  }

  topic(newTopic) {
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

  nick(contact) {
    if (!this.obj.nickMap) {
      return ''
    }
    return this.obj.nickMap[contact.id]
  }

  has(contact) {
    if (!this.obj.memberList) {
      return false
    }
    return this.obj.memberList
                    .filter(c => c.id === contact.id)
                    .length > 0
  }

  owner() {
    const ownerUin = this.obj.ownerUin
    let memberList = this.obj.memberList || []

    let user = Config.puppetInstance()
                      .user

    if (user && user.get('uin') === ownerUin) {
      return user
    }

    memberList = memberList.filter(m => m.Uin === ownerUin)
    if (memberList.length > 0) {
      return memberList[0]
    } else {
      return null
    }
  }

  member(name) {
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

  static create(contactList, topic) {
    log.verbose('Room', 'create(%s, %s)', contactList.join(','), topic)

    if (!contactList || !typeof contactList === 'array') {
      throw new Error('contactList not found')
    }

    return Config.puppetInstance()
                  .roomCreate(contactList, topic)
                  .then(roomId => {
                    if (typeof roomId === 'object') {
                      // It is a Error Object send back by callback in browser(WechatyBro)
                      throw roomId
                    }
                    return Room.load(roomId)
                  })
  }

  // private
  static _find({
    name
  }) {
    log.silly('Room', '_find(%s)', name)

    if (!name) {
      throw new Error('name not found')
    }

    let filterFunction
    if (name instanceof RegExp) {
      filterFunction = `c => ${name.toString()}.test(c)`
    } else if (typeof name === 'string') {
      filterFunction = `c => c === '${name}'`
    } else {
      throw new Error('unsupport name type')
    }

    return Config.puppetInstance().roomFind(filterFunction)
              .then(idList => {
                return idList
              })
              .catch(e => {
                log.error('Room', '_find() rejected: %s', e.message)
                throw e
              })
  }

  static find({
    name
  }) {
    log.verbose('Room', 'find(%s)', name)

    return Room._find({name})
              .then(idList => {
                if (!idList || !Array.isArray(idList)){
                  throw new Error('_find return error')
                }
                if (idList.length < 1) {
                  return null
                }
                const id = idList[0]
                return Room.load(id)
              })
              .catch(e => {
                log.error('Room', 'find() rejected: %s', e.message)
                return null // fail safe
                // throw e
              })
  }

  static findAll({
    name
  }) {
    log.verbose('Room', 'findAll(%s)', name)

    return Room._find({name})
              .then(idList => {
                // console.log(idList)
                if (!idList || !Array.isArray(idList)){
                  throw new Error('_find return error')
                }
                if (idList.length < 1) {
                  return []
                }
                return idList.map(i => Room.load(i))
              })
              .catch(e => {
                // log.error('Room', 'findAll() rejected: %s', e.message)
                return [] // fail safe
              })
  }

  static init() { Room.pool = {} }

  static load(id) {
    if (!id) { return null }

    if (id in Room.pool) {
      return Room.pool[id]
    }
    return Room.pool[id] = new Room(id)
  }

}

Room.init()

module.exports = Room
