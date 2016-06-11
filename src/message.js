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

const log = require('./npmlog-env')

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
      , room:         rawObj.MMIsChatRoom ? rawObj.FromUserName : null // MMPeerUserName always eq FromUserName ?
      , content:      rawObj.MMActualContent // Content has @id prefix added by wx
      , status:       rawObj.Status
      , digest:       rawObj.MMDigest
      , date:         rawObj.MMDisplayTime  // Javascript timestamp of milliseconds

      , self:         undefined // to store the logined user id
    }
  }
  toString() {
    const text = this.digestEmoji(this.obj.digest)
    const from = this.unescapeHtml(this.digestEmoji(Contact.load(this.obj.from).name()))
    const room = this.obj.room ? this.unescapeHtml(this.digestEmoji(Room.load(this.obj.room).name())) : ''
    return '<' + from + (room ? ('@'+room) : '') + '>: ' + '{' + this.type() + '}' + text
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
  digestEmoji(str) {
    // <img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />
    return str && str
    .replace(/<img class="\w*?emoji (\w*?emoji[^"]+?)" text="(.*?)_web" src=[^>]+>/g
      , '($1$2)')
  }

  from()    { return this.obj.from }
  to()      { return this.obj.to }
  content() { return this.obj.content }
  room()    { return this.obj.room }

  type()  { return Message.Type[this.obj.type] }
  count() { return Message.counter }

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

      yield from.ready()  // Contact from
      yield to.ready()    // Contact to
      if (room) {         // Room member list
        yield room.ready()
      }
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

module.exports = Message
