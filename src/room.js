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
const Wechaty   = require('./wechaty')
const log       = require('./brolog-env')
const UtilLib   = require('./util-lib')
const Config    = require('./config')

class Room {
  constructor(id) {
    log.silly('Room', `constructor(${id})`)
    this.id = id
    this.obj = {}
    this.dirtyObj = {} // when refresh, use this to save dirty data for query
    if (!Config.puppetInstance) {
      throw new Error('Config.puppetInstance not found')
    }
  }

  toString()    { return this.id }
  toStringEx()  { return `Room(${this.obj.topic}[${this.id}])` }

  // @private
  isReady() {
    return this.obj.contactList && this.obj.contactList.length
  }

  refresh() {
    this.dirtyObj = this.obj
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
      log.warn('Room', 'ready() has obj.id but contactList empty in room %s. reloading', this.obj.topic)
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

  name() { return UtilLib.plainText(this.obj.topic) }
  get(prop) { return this.obj[prop] || this.dirtyObj[prop] }

  parse(rawObj) {
    if (!rawObj) {
      return {}
    }
    return {
      id:         rawObj.UserName
      , encryId:  rawObj.EncryChatRoomId // ???
      , topic:    rawObj.NickName
      , contactList:  this.parseContactList(rawObj.MemberList)
      , nickMap:      this.parseNickMap(rawObj.MemberList)
    }
  }

  parseContactList(memberList) {
    if (!memberList || !memberList.map) {
      return []
    }
    return memberList.map(m => m.UserName)
  }

  parseNickMap(memberList) {
    const nickMap = {}
    if (memberList && memberList.map) {
      memberList.forEach(m => nickMap[m.UserName] = m.DisplayName)
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

  del(contact) {
    log.verbose('Room', 'del(%s) from %s', contact, this)

    if (!contact) {
      throw new Error('contact not found')
    }
    return Config.puppetInstance.roomDel(this, contact)
                      .then(r => this.delLocal(contact))
  }

  // @private
  delLocal(contact) {
    log.verbose('Room', 'delLocal(%s)', contact)

    const contactList = this.obj.contactList
    if (!contactList || contactList.length === 0) {
      return true // already in refreshing
    }

    let i
    for (i=0; i<contactList.length; i++) {
// XXX
// console.log('########################')
// console.log(i)
// console.log(contactList[i].id)
// console.log(contact.get('id'))
// console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
      if (contactList[i].id === contact.get('id')) {
        break
      }
    }
// console.log('found i=' + i)
    if (i < contactList.length) {
// console.log('splicing before: ' + contactList.length)
      contactList.splice(i, 1)
// console.log('splicing after: ' + contactList.length)
      return true
    }
    return false
  }

  quit() {
    throw new Error('wx web not implement yet')
    // WechatyBro.glue.chatroomFactory.quit("@@1c066dfcab4ef467cd0a8da8bec90880035aa46526c44f504a83172a9086a5f7"
  }

  add(contact) {
    log.verbose('Room', 'add(%s) to %s', contact, this)

    if (!contact) {
      throw new Error('contact not found')
    }

    return Config.puppetInstance.roomAdd(this, contact)
  }

  topic(newTopic) {
    log.verbose('Room', 'topic(%s)', newTopic)

    if (newTopic) {
      Config.puppetInstance.roomTopic(this, newTopic)
      return newTopic
    }
    return this.get('topic')
  }

  nick(contactId) {
    if (!this.obj.nickMap) {
      return ''
    }
    return this.obj.nickMap[contactId]
  }

  static create(contactList) {
    log.verbose('Room', 'create(%s)', contactList.join(','))

    if (!contactList || ! typeof contactList === 'array') {
      throw new Error('contactList not found')
    }
    return Config.puppetInstance.roomCreate(contactList)
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

    return Config.puppetInstance.roomFind(filterFunction)
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
                log.error('Room', 'findAll() rejected: %s', e.message)
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

  // static attach(puppet) {
  //   // if (!puppet) {
  //   //   throw new Error('Room.attach got no puppet to attach!')
  //   // }
  //   Config.puppetInstance = puppet
  // }

}

Room.init()

module.exports = Room
