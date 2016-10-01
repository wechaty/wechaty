/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const log   = require('./brolog-env')
const UtilLib  = require('./util-lib')

class Room {
  constructor(id) {
    log.silly('Room', `constructor(${id})`)
    this.id = id
    this.obj = {}
    if (!Room.puppet) {
      throw new Error('no puppet attached to Room')
    }
  }

  toString()   { return this.id }
  toStringEx() { return `Room(${this.obj.name}[${this.id}])` }

  isReady() {
    return this.obj.members && this.obj.members.length
  }

  refresh() {
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
      log.warn('Room', 'ready() has obj.id but members list empty in room %s. reloading', this.obj.name)
    }

    contactGetter = contactGetter || Room.puppet.getContact.bind(Room.puppet)
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

  name() { return UtilLib.plainText(this.obj.name) }
  get(prop) { return this.obj[prop] }

  parse(rawObj) {
    if (!rawObj) {
      return {}
    }
    return {
      id:         rawObj.UserName
      , encryId:  rawObj.EncryChatRoomId // ???
      , name:     rawObj.NickName
      , members:  this.parseMemberList(rawObj.MemberList)
    }
  }

  parseMemberList(memberList) {
    if (!memberList || !memberList.map) {
      return []
    }
    return memberList.map(m => {
      return {
        id:       m.UserName
        , name:   m.DisplayName // nick name for this room?
      }
    })
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
    return Room.puppet.roomDelMember(this, contact)
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

    return Room.puppet.roomAddMember(this, contact)
  }

  static create(contactList) {
    log.verbose('Room', 'create(%s)', contactList.join(','))

    if (!contactList || ! typeof contactList === 'array') {
      throw new Error('contactList not found')
    }
    return Room.puppet.roomCreate(contactList)
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
      filterFunction = `c => c === ${name}`
    } else {
      throw new Error('unsupport name type')
    }

    return Room.puppet.roomFind(filterFunction)
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
                return [] // fail safe
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
                throw e
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

  static attach(puppet) {
    // if (!puppet) {
    //   throw new Error('Room.attach got no puppet to attach!')
    // }
    Room.puppet = puppet
  }

}

Room.init()

module.exports = Room
