/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

const Contact = require('./contact')
const Group   = require('./group')
const log     = require('npmlog')

class Message {
  constructor(rawObj) {
    Message.counter++

    this.rawObj = rawObj = rawObj || {}
    this.obj = this.parse(rawObj)
    this.id = this.obj.id
  }

  // Transform rawObj to local m
  parse(rawObj) {
    return {
      id:             rawObj.MsgId
      , type:         rawObj.MsgType
      , from:         rawObj.MMActualSender
      , to:           rawObj.ToUserName
      , group:        rawObj.MMIsChatRoom ? rawObj.FromUserName : null // MMPeerUserName always eq FromUserName ?
      , content:      rawObj.MMActualContent // Content has @id prefix added by wx
      , status:       rawObj.Status
      , digest:       rawObj.MMDigest
      , date:         rawObj.MMDisplayTime  // Javascript timestamp of milliseconds

      // , from:         Contact.load(rawObj.MMActualSender)
      // , to:           Contact.load(rawObj.ToUserName)
      // , group:        rawObj.MMIsChatRoom ? Group.load(rawObj.FromUserName) : null
      // , date:         new Date(rawObj.MMDisplayTime*1000)
    }
  }
  toString() { return this.obj.content }
  toStringEx() {
    var s = `${this.constructor.name}#${Message.counter}`
    s += '(' + this.getSenderString()
    s += ':' + this.getContentString() + ')'
    return s
  }
  getSenderString() {
    const name  = Contact.load(this.obj.from).toStringEx()
    const group = this.obj.group ? Contact.load(this.obj.group).toStringEx() : null
    return '<' + name + (group ? `@${group}` : '') + '>'
  }
  getContentString() {
    let content = this.unescapeHtml(this.stripHtml(this.obj.content))
    if (content.length > 20) { content = content.substring(0,17) + '...' }
    return '{' + this.type() + '}' + content
  }
  stripHtml(str) { return String(str).replace(/(<([^>]+)>)/ig,'') }
  unescapeHtml(str) {
    return String(str)
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
  }

  from()    { return this.obj.from }
  to()      { return this.obj.to }
  content() { return this.obj.content }
  group()   { return this.obj.group }

  reply(replyContent) {
    return new Message()
    .set('to'     , this.group() ? this.group() : this.from())
    .set('content', replyContent)
  }

  ready() {
    log.silly('Message', 'ready()')

    const f = Contact.load(this.obj.from)
    const t = Contact.load(this.obj.to)
    const g = this.obj.group ? Contact.load(this.obj.group) : null

    return f.ready()    // Contact from
    .then(r => t.ready()) // Contact to
    .then(r => g && g.ready())  // Group member list
    .then(r => this)  // return this for chain
    .catch(e => {     // REJECTED
      log.error('Message', 'ready() rejected: %s', e)
      throw e
    })

    // return this.obj.from.ready()    // Contact from
    // .then(r => this.obj.to.ready()) // Contact to
    // .then(r => this.obj.group && this.obj.group.ready())  // Group member list
    // .then(r => this)  // return this for chain
    // .catch(e => {     // REJECTED
    //   log.error('Message', 'ready() rejected: %s', e)
    //   throw new Error(e)
    // })
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
  type () { return Message.Type[this.obj.type] }

  dump() {
    console.error('======= dump message =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
  }
  dumpRaw() {
    console.error('======= dump raw message =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }

  count() { return Message.counter }

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

module.exports = Message
