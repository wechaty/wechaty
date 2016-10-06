/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const co = require('co')

const Wechaty = require('./wechaty')
const Contact = require('./contact')
const Room    = require('./room')
const Config  = require('./config')

const UtilLib = require('./util-lib')
const log     = require('./brolog-env')

class Message {
  constructor(rawObj) {
    Message.counter++

    if (typeof rawObj === 'string') {
      rawObj = JSON.parse(rawObj)
    }

    this.rawObj = rawObj = rawObj || {}
    this.obj = this.parse(rawObj)
    this.id = this.obj.id
  }

  // Transform rawObj to local m
  parse(rawObj) {
    const obj = {
      id:             rawObj.MsgId
      , type:         rawObj.MsgType
      , from:         rawObj.MMActualSender
      , to:           rawObj.ToUserName
      , content:      rawObj.MMActualContent // Content has @id prefix added by wx
      , status:       rawObj.Status
      , digest:       rawObj.MMDigest
      , date:         rawObj.MMDisplayTime  // Javascript timestamp of milliseconds
    }

    // FIXME: has ther any better method to know the room ID?
    if (rawObj.MMIsChatRoom) {
      if (/^@@/.test(rawObj.FromUserName)) {
        obj.room =  rawObj.FromUserName // MMPeerUserName always eq FromUserName ?
      } else if (/^@@/.test(rawObj.ToUserName)) {
        obj.room = rawObj.ToUserName
      } else {
        log.error('Message', 'parse found a room message, but neither FromUserName nor ToUserName is a room(/^@@/)')
        obj.room = null // bug compatible
      }
    } else {
      obj.room = null
    }
    return obj
  }
  toString() {
    return UtilLib.plainText(this.obj.content)
  }
  toStringDigest() {
    const text = UtilLib.digestEmoji(this.obj.digest)
    return '{' + this.typeEx() + '}' + text
  }

  toStringEx() {
    var s = `${this.constructor.name}#${Message.counter}`
    s += '(' + this.getSenderString()
    s += ':' + this.getContentString() + ')'
    return s
  }
  getSenderString() {
    const name  = Contact.load(this.obj.from).toStringEx()
    const room = this.obj.room ? Room.load(this.obj.room).toStringEx() : null
    return '<' + name + (room ? `@${room}` : '') + '>'
  }
  getContentString() {
    let content = UtilLib.plainText(this.obj.content)
    if (content.length > 20) { content = content.substring(0,17) + '...' }
    return '{' + this.type() + '}' + content
  }

  from(contact) {
    if (contact) {
      if (contact instanceof Contact) {
        this.obj.from = contact.id
      } else if (typeof contact === 'string') {
        this.obj.from = contact
      } else {
        throw new Error('neither Contact nor UserName')
      }
    }
    return this.obj.from ? Contact.load(this.obj.from) : null
  }

  to(contact) {
    if (contact) {
      if (contact instanceof Contact) {
        this.obj.to = contact.id
      } else if (typeof contact === 'string') {
        this.obj.to = contact
      } else {
        throw new Error('neither Contact nor UserName')
      }
    }
    return this.obj.to ? Contact.load(this.obj.to) : null
  }

  content(content) {
    if (content) {
      this.obj.content = content
    }
    return this.obj.content
  }

  room(room) {
    if (room) {
      if (room instanceof Room) {
        this.obj.room = room.id
      } else if (typeof room === 'string') {
        this.obj.room = room
      } else {
        throw new Error('neither Room nor UserName')
      }
    }
    return this.obj.room ? Room.load(this.obj.room) : null
  }

  type()    { return this.obj.type }
  typeEx()  { return Message.Type[this.obj.type] }
  count()   { return Message.counter }

  ready() {
    log.silly('Message', 'ready()')

    return co.call(this, function* () {
      const from  = Contact.load(this.obj.from)
      const to    = Contact.load(this.obj.to)
      const room  = this.obj.room ? Room.load(this.obj.room) : null

      yield from.ready()                // Contact from
      yield to.ready()                  // Contact to
      if (room) { yield room.ready() }  // Room member list

      return this         // return this for chain
    }).catch(e => { // Exception
        log.error('Message', 'ready() exception: %s', e)
        // console.log(e)
        // this.dump()
        // this.dumpRaw()
        throw e
    })
  }

  get(prop) {
    if (!prop || !(prop in this.obj)) {
      const s = '[' + Object.keys(this.obj).join(',') + ']'
      throw new Error(`Message.get(${prop}) must be in: ${s}`)
    }
    return this.obj[prop]
  }

  set(prop, value) {
    this.obj[prop] = value
    return this
  }

  dump() {
    console.error('======= dump message =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
  }
  dumpRaw() {
    console.error('======= dump raw message =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }

  static find(selector, option) {
    return new Message({MsgId: '-1'})
  }

  static findAll(selector, option) {
    return [
      new Message   ({MsgId: '-2'})
      , new Message ({MsgId: '-3'})
    ]
  }
}

Message.counter = 0
Message.Type = {
  TEXT:               1,
  IMAGE:              3,
  VOICE:              34,
  VERIFYMSG:          37,
  POSSIBLEFRIEND_MSG: 40,
  SHARECARD:          42,
  VIDEO:              43,
  EMOTICON:           47,
  LOCATION:           48,
  APP:                49,
  VOIPMSG:            50,
  STATUSNOTIFY:       51,
  VOIPNOTIFY:         52,
  VOIPINVITE:         53,
  MICROVIDEO:         62,
  SYSNOTICE:          9999,
  SYS:                10000,
  RECALLED:           10002
}
Object.keys(Message.Type).forEach(k => {
  const v = Message.Type[k]
  Message.Type[v] = k // Message.Type[1] = 'TEXT'
})

// Message.attach = function(puppet) {
//   log.verbose('Message', 'attach() to %s', puppet && puppet.constructor.name)
//   Message.puppet = puppet
// }

module.exports = Message.default = Message.Message = Message

/*
 * join room in mac client: https://support.weixin.qq.com/cgi-bin/mmsupport-bin/addchatroombyinvite?ticket=AUbv%2B4GQA1Oo65ozlIqRNw%3D%3D&exportkey=AS9GWEg4L82fl3Y8e2OeDbA%3D&lang=en&pass_ticket=T6dAZXE27Y6R29%2FFppQPqaBlNwZzw9DAN5RJzzzqeBA%3D&wechat_real_lang=en
 */
