/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const co = require('co')

const Contact = require('./contact')
const Room    = require('./room')

const webUtil  = require('./web-util')
const log       = require('./npmlog-env')

class Message {
  constructor(rawObj) {
    Message.counter++

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

      , self:         undefined // to store the logined user id
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
    return webUtil.plainText(this.obj.content)
  }
  toStringDigest() {
    const text = webUtil.digestEmoji(this.obj.digest)
    return '{' + this.typeEx() + '}' + text
  }

  toStringEx() {
    var s = `${this.constructor.name}#${Message.counter}`
    s += '(' + this.getSenderString()
    s += ':' + this.getContentString() + ')'
    return s
  }
  getSenderString() {
    const name  = Contact.load(this.obj.from).toStringEx() + ','
    const room = this.obj.room ? Room.load(this.obj.room).toStringEx() + ',' : '\"Room\":\"\",'
    return  name + (room ? `${room}` : '') 
  }
  getJumposStringEx() {
    var s = this.getSenderString()
    s += this.getContentString()
    return s
  }
  getContentString() {
    let content = webUtil.plainText(this.obj.content)
    if (content.length > 20) { content = content.substring(0,100) + '...' }
    return '\"msgtype\":\"' + this.type() + '\",\"msg\":\"' + content + '\"'
  }

  from()    { return this.obj.from }
  to()      { return this.obj.to }
  content() { return this.obj.content }
  room()    { return this.obj.room }

  type()    { return this.obj.type }
  typeEx()  { return Message.Type[this.obj.type] }
  count()   { return Message.counter }

  self()    {
    if (!this.obj.self) {
      log.warn('Message', 'self not set')
      return false
    }
    return this.obj.self === this.obj.from
  }

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
        log.error('Message', 'ready() exception: %s', e.message)
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
  TEXT: 1,
  IMAGE: 3,
  VOICE: 34,
  VIDEO: 43,
  MICROVIDEO: 62,
  EMOTICON: 47,
  APP: 49,
  VOIPMSG: 50,
  VOIPNOTIFY: 52,
  VOIPINVITE: 53,
  LOCATION: 48,
  STATUSNOTIFY: 51,
  SYSNOTICE: 9999,
  POSSIBLEFRIEND_MSG: 40,
  VERIFYMSG: 37,
  SHARECARD: 42,
  SYS: 1e4,
  RECALLED: 10002
}
Object.keys(Message.Type).forEach(k => {
  const v = Message.Type[k]
  Message.Type[v] = k // Message.Type[1] = 'TEXT'
})

Message.attach = function(puppet) { Message.puppet = puppet }

module.exports = Message
