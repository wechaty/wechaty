/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const log = require('./npmlog-env')
const Contact = require('./contact')

class Room {
  constructor(id) {
    log.silly('Room', `constructor(${id})`)
    this.id = id
    this.obj = {}
    if (!Room.puppet) {
      throw new Error('no puppet attached to Room')
    }
  }

  toString() { return this.id }
  toStringEx() { return `Room(${this.obj.name}[${this.id}])` }

  ready(contactGetter) {
    log.silly('Room', `ready(${contactGetter})`)
    if (!this.id) {
      log.warn('Room', 'ready() on a un-inited Room')
      return Promise.resolve(this)
    } else if (this.obj.id) {
      return Promise.resolve(this)
    }

    contactGetter = contactGetter || Room.puppet.getContact.bind(Room.puppet)
    return contactGetter(this.id)
    .then(data => {
      log.silly('Room', `contactGetter(${this.id}) resolved`)
      this.rawObj = data
      this.obj    = this.parse(data)
      return this
    }).catch(e => {
      log.error('Room', `contactGetter(${this.id}) rejected: ` + e)
      throw new Error('contactGetter: ' + e)
    })
  }

  name() { return this.obj.name }

  parse(rawObj) {
    return !rawObj ? {} : {
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
        contact:  Contact.load(m.UserName)
        , name:   m.DisplayName
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

  get(prop) { return this.obj[prop] }

  static find() {
  }

  static findAll() {
  }
}

Room.init = function() { Room.pool = {} }
Room.init()
Room.load = function(id) {
  if (!id) { return null }

  if (id in Room.pool) {
    return Room.pool[id]
  }
  return Room.pool[id] = new Room(id)
}
Room.attach = function(puppet) { Room.puppet = puppet }

module.exports = Room
