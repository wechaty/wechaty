/**
 *
 * Wechaty: Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import Config   from './config'
import Contact  from './contact'
import Room     from './room'
import UtilLib  from './util-lib'
import log      from './brolog-env'

type MessageRawObj = {
  MsgId:            string
  MsgType:          string
  MMActualSender:   string
  ToUserName:       string
  MMActualContent:  string // Content has @id prefix added by wx
  Status:           string
  MMDigest:         string
  MMDisplayTime:    string  // Javascript timestamp of milliseconds
}

type MessageObj = {
  id:       string
  type:     string
  from:     string
  to:       string
  room?:    string
  content:  string
  status:   string
  digest:   string
  date:     string

  url?:     string  // for MessageMedia class
}

type MessageType = {
  [index: string]: number|string
}

class Message {
  public static counter = 0

  public static TYPE: MessageType = {
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

  public readonly id: string

  protected obj = <MessageObj>{}

  public readyStream(): Promise<NodeJS.ReadableStream> {
    throw Error('abstract method')
  }

  constructor(private rawObj?: MessageRawObj) {
    Message.counter++

    if (typeof rawObj === 'string') {
      this.rawObj = JSON.parse(rawObj)
    }

    this.rawObj = rawObj = rawObj || <MessageRawObj>{}
    this.obj = this.parse(rawObj)
    this.id = this.obj.id
  }

  // Transform rawObj to local m
  private parse(rawObj): MessageObj {
    const obj: MessageObj = {
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
  public toString() {
    return UtilLib.plainText(this.obj.content)
  }
  public toStringDigest() {
    const text = UtilLib.digestEmoji(this.obj.digest)
    return '{' + this.typeEx() + '}' + text
  }

  public toStringEx() {
    let s = `${this.constructor.name}#${Message.counter}`
    s += '(' + this.getSenderString()
    s += ':' + this.getContentString() + ')'
    return s
  }
  public getSenderString() {
    const name  = Contact.load(this.obj.from).toStringEx()
    const room = this.obj.room ? Room.load(this.obj.room).toStringEx() : null
    return '<' + name + (room ? `@${room}` : '') + '>'
  }
  public getContentString() {
    let content = UtilLib.plainText(this.obj.content)
    if (content.length > 20) { content = content.substring(0, 17) + '...' }
    return '{' + this.type() + '}' + content
  }

  public from(contact?: Contact|string): Contact {
    if (contact) {
      if (contact instanceof Contact) {
        this.obj.from = contact.id
      } else if (typeof contact === 'string') {
        this.obj.from = contact
      } else {
        throw new Error('unsupport from param: ' + typeof contact)
      }
    }
    return this.obj.from ? Contact.load(this.obj.from) : null
  }

  public to(contact?: Contact|Room|string): Contact {
    if (contact) {
      if (contact instanceof Contact || contact instanceof Room) {
        this.obj.to = contact.id
      } else if (typeof contact === 'string') {
        this.obj.to = contact
      } else {
        throw new Error('unsupport to param ' + typeof contact)
      }
    }
    return this.obj.to ? Contact.load(this.obj.to) : null
  }

  public room(room?: Room|string): Room {
    if (room) {
      if (room instanceof Room) {
        this.obj.room = room.id
      } else if (typeof room === 'string') {
        this.obj.room = room
      } else {
        throw new Error('unsupport room param ' + typeof room)
      }
    }
    return this.obj.room ? Room.load(this.obj.room) : null
  }

  public content(content?) {
    if (content) {
      this.obj.content = content
    }
    return this.obj.content
  }

  public type()    { return this.obj.type }
  public typeEx()  { return Message.TYPE[this.obj.type] }
  public count()   { return Message.counter }

  public async ready(): Promise<Message> {
    log.silly('Message', 'ready()')

    // return co.call(this, function* () {
    try {
      const from  = Contact.load(this.obj.from)
      const to    = Contact.load(this.obj.to)
      const room  = this.obj.room ? Room.load(this.obj.room) : null

      await from.ready()                // Contact from
      await to.ready()                  // Contact to
      if (room) { await room.ready() }  // Room member list

      return this         // return this for chain
    // }).catch(e => { // Exception
    } catch (e) {
        log.error('Message', 'ready() exception: %s', e)
        // console.log(e)
        // this.dump()
        // this.dumpRaw()
        throw e
    }
  }

  public get(prop): string {
    if (!prop || !(prop in this.obj)) {
      const s = '[' + Object.keys(this.obj).join(',') + ']'
      throw new Error(`Message.get(${prop}) must be in: ${s}`)
    }
    return this.obj[prop]
  }

  public set(prop, value) {
    this.obj[prop] = value
    return this
  }

  public dump() {
    console.error('======= dump message =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
  }
  public dumpRaw() {
    console.error('======= dump raw message =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }

  public static async find(query) {
    return Promise.resolve(new Message(<MessageRawObj>{MsgId: '-1'}))
  }

  public static async findAll(query) {
    return Promise.resolve([
      new Message   (<MessageRawObj>{MsgId: '-2'})
      , new Message (<MessageRawObj>{MsgId: '-3'})
    ])
  }

  public static initType() {
    Object.keys(Message.TYPE).forEach(k => {
      const v = Message.TYPE[k]
      Message.TYPE[v] = k // Message.Type[1] = 'TEXT'
    })
  }

  public say(content: string, replyTo?: Contact|Contact[]): Promise<any> {
    log.verbose('Message', 'say(%s, %s)', content, replyTo)

    const m = new Message()
    m.room(this.room())

    if (!replyTo) {
      m.to(this.from())
      m.content(content)

    } else if (this.room()) {
      let mentionList
      if (Array.isArray(replyTo)) {
        m.to(replyTo[0])
        mentionList = replyTo.map(c => '@' + c.name()).join(' ')
      } else {
        m.to(replyTo)
        mentionList = '@' + replyTo.name()
      }
      m.content(mentionList + ' ' + content)

    }
    return Config.puppetInstance()
                  .send(m)
  }

}

Message.initType()

// module.exports = Message.default = Message.Message = Message
export default Message

/*
 * join room in mac client: https://support.weixin.qq.com/cgi-bin/
 * mmsupport-bin/addchatroombyinvite
 * ?ticket=AUbv%2B4GQA1Oo65ozlIqRNw%3D%3D&exportkey=AS9GWEg4L82fl3Y8e2OeDbA%3D
 * &lang=en&pass_ticket=T6dAZXE27Y6R29%2FFppQPqaBlNwZzw9DAN5RJzzzqeBA%3D
 * &wechat_real_lang=en
 */
