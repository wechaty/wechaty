/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const log       = require('./npmlog-env')
const webUtil  = require('./web-util')

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

  ready(contactGetter) {
    log.silly('Room', 'ready(%s)', contactGetter ? contactGetter.constructor.name : '')
    if (!this.id) {
      log.warn('Room', 'ready() on a un-inited Room')
      return Promise.resolve(this)
    } else if (this.obj.members && this.obj.members.length) {
      return Promise.resolve(this)
    } else if (this.obj.id) {
      log.warn('Room', 'ready() ready but members list empty in room %s. reloading', this.obj.name)
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

  name() { return webUtil.plainText(this.obj.name) }
  get(prop) { return this.obj[prop] }

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

  static find() {
    return new Room('-1')
  }
  
  static findAll() {
    return [
      new Room('-2')
      , new Room('-3')
    ]
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
Room.attach = function(puppet) {
  // if (!puppet) {
  //   throw new Error('Room.attach got no puppet to attach!')
  // }
  Room.puppet = puppet
}

module.exports = Room
