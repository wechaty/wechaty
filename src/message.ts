/**
 *
 * Wechaty: * * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import * as moment from 'moment'
import * as fs     from 'fs'
import * as path   from 'path'

import {
  Config,
  RecommendInfo,
  Sayable,
  log,
}  from './config'


import { Contact }  from './contact'
import { Room }     from './room'
import { UtilLib }  from './util-lib'
import { PuppetWeb }  from './puppet-web/puppet-web'
import { Bridge }     from './puppet-web/bridge'

export type MsgRawObj = {
  MsgId:            string,

  MMActualSender:   string, // getUserContact(message.MMActualSender,message.MMPeerUserName).isContact()
  MMPeerUserName:   string, // message.MsgType == CONF.MSGTYPE_TEXT && message.MMPeerUserName == 'newsapp'
  ToUserName:       string,
  MMActualContent:  string, // Content has @id prefix added by wx

  MMDigest:         string,
  MMDisplayTime:    number,  // Javascript timestamp of milliseconds

  /**
   * MsgType == MSGTYPE_APP && message.AppMsgType == CONF.APPMSGTYPE_URL
   * class="cover" mm-src="{{getMsgImg(message.MsgId,'slave')}}"
   */
  Url:              string,
  MMAppMsgDesc:     string,  // class="desc" ng-bind="message.MMAppMsgDesc"

  /**
   * Attachment
   *
   * MsgType == MSGTYPE_APP && message.AppMsgType == CONF.APPMSGTYPE_ATTACH
   */
  FileName:         string,  // FileName: '钢甲互联项目BP1108.pdf',
  FileSize:         number,  // FileSize: '2845701',
  MediaId:          string,  // MediaId: '@crypt_b1a45e3f_c21dceb3ac01349...

  MMAppMsgFileExt:      string,  // doc, docx ... 'undefined'?
  MMAppMsgFileSize:     string,  // '2.7MB',
  MMAppMsgDownloadUrl:  string,  // 'https://file.wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetmedia?sender=@4f549c2dafd5ad731afa4d857bf03c10&mediaid=@crypt_b1a45e3f
                                 // <a download ng-if="message.MMFileStatus == CONF.MM_SEND_FILE_STATUS_SUCCESS
                                 // && (massage.MMStatus == CONF.MSG_SEND_STATUS_SUCC || massage.MMStatus === undefined)
                                 // " href="{{message.MMAppMsgDownloadUrl}}">下载</a>
  MMUploadProgress: number,  // < 100

  /**
   * 模板消息
   * MSGTYPE_APP && message.AppMsgType == CONF.APPMSGTYPE_READER_TYPE
   *  item.url
   *  item.title
   *  item.pub_time
   *  item.cover
   *  item.digest
   */
  MMCategory:       any[],  //  item in message.MMCategory

  /**
   * Type
   *
   * MsgType == CONF.MSGTYPE_VOICE : ng-style="{'width':40 + 7*message.VoiceLength/1000}
   */
  MsgType:          number,
  AppMsgType:       AppMsgType,  // message.MsgType == CONF.MSGTYPE_APP && message.AppMsgType == CONF.APPMSGTYPE_URL
                                 // message.MsgType == CONF.MSGTYPE_TEXT && message.SubMsgType != CONF.MSGTYPE_LOCATION

  SubMsgType:       MsgType, // "msgType":"{{message.MsgType}}","subType":{{message.SubMsgType||0}},"msgId":"{{message.MsgId}}"

  /**
   * Status-es
   */
  Status:           string,
  MMStatus:         number,  // img ng-show="message.MMStatus == 1" class="ico_loading"
                             // ng-click="resendMsg(message)" ng-show="message.MMStatus == 5" title="重新发送"
  MMFileStatus:     number,  // <p class="loading" ng-show="message.MMStatus == 1 || message.MMFileStatus == CONF.MM_SEND_FILE_STATUS_FAIL">
                             // CONF.MM_SEND_FILE_STATUS_QUEUED, MM_SEND_FILE_STATUS_SENDING

  /**
   * Location
   */
  MMLocationUrl:    string,  // ng-if="message.MsgType == CONF.MSGTYPE_TEXT && message.SubMsgType == CONF.MSGTYPE_LOCATION"
                             // <a href="{{message.MMLocationUrl}}" target="_blank">
                             // 'http://apis.map.qq.com/uri/v1/geocoder?coord=40.075041,116.338994'
  MMLocationDesc:   string,  // MMLocationDesc: '北京市昌平区回龙观龙腾苑(五区)内(龙腾街南)',

  /**
   * MsgType == CONF.MSGTYPE_EMOTICON
   *
   * getMsgImg(message.MsgId,'big',message)
   */

  /**
   * Image
   *
   *  getMsgImg(message.MsgId,'slave')
   */
  MMImgStyle:       string,  // ng-style="message.MMImgStyle"
  MMPreviewSrc:     string,  // message.MMPreviewSrc || message.MMThumbSrc || getMsgImg(message.MsgId,'slave')
  MMThumbSrc:       string,

  /**
   * Friend Request & ShareCard ?
   *
   * MsgType == CONF.MSGTYPE_SHARECARD" ng-click="showProfile($event,message.RecommendInfo.UserName)
   * MsgType == CONF.MSGTYPE_VERIFYMSG
   */
  RecommendInfo?:   RecommendInfo,
}

export type MsgObj = {
  id:       string,
  type:     MsgType,
  from:     string,
  to?:      string,  // if to is not set, then room must be set
  room?:    string,
  content:  string,
  status:   string,
  digest:   string,
  date:     string,

  url?:     string,  // for MessageMedia class
}

// export type MessageTypeName = 'TEXT' | 'IMAGE' | 'VOICE' | 'VERIFYMSG' | 'POSSIBLEFRIEND_MSG'
// | 'SHARECARD' | 'VIDEO' | 'EMOTICON' | 'LOCATION' | 'APP' | 'VOIPMSG' | 'STATUSNOTIFY'
// | 'VOIPNOTIFY' | 'VOIPINVITE' | 'MICROVIDEO' | 'SYSNOTICE' | 'SYS' | 'RECALLED'

// export type MessageTypeValue = 1 | 3 | 34 | 37 | 40 | 42 | 43 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 62 | 9999 | 10000 | 10002

export type MsgTypeMap = {
  [index: string]: string|number,
  //   MessageTypeName:  MessageTypeValue
  // , MessageTypeValue: MessageTypeName
}

export const enum AppMsgType {
  TEXT                     = 1,
  IMG                      = 2,
  AUDIO                    = 3,
  VIDEO                    = 4,
  URL                      = 5,
  ATTACH                   = 6,
  OPEN                     = 7,
  EMOJI                    = 8,
  VOICE_REMIND             = 9,
  SCAN_GOOD                = 10,
  GOOD                     = 13,
  EMOTION                  = 15,
  CARD_TICKET              = 16,
  REALTIME_SHARE_LOCATION  = 17,
  TRANSFERS                = 2e3,
  RED_ENVELOPES            = 2001,
  READER_TYPE              = 100001,
}

export const enum MsgType {
  TEXT                = 1,
  IMAGE               = 3,
  VOICE               = 34,
  VERIFYMSG           = 37,
  POSSIBLEFRIEND_MSG  = 40,
  SHARECARD           = 42,
  VIDEO               = 43,
  EMOTICON            = 47,
  LOCATION            = 48,
  APP                 = 49,
  VOIPMSG             = 50,
  STATUSNOTIFY        = 51,
  VOIPNOTIFY          = 52,
  VOIPINVITE          = 53,
  MICROVIDEO          = 62,
  SYSNOTICE           = 9999,
  SYS                 = 10000,
  RECALLED            = 10002,
}

export class Message implements Sayable {
  public static counter = 0
  public _counter: number

  /**
   * a map for:
   *   1. name to id
   *   2. id to name
   */
  public static TYPE: MsgTypeMap = {
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
    RECALLED:           10002,
  }

  public readonly id: string

  protected obj = <MsgObj>{}

  public readyStream(): Promise<NodeJS.ReadableStream> {
    throw Error('abstract method')
  }

  public filename(): string {
    throw Error('not a media message')
  }

  constructor(public rawObj?: MsgRawObj) {
    this._counter = Message.counter++
    log.silly('Message', 'constructor() SN:%d', this._counter)

    if (typeof rawObj === 'string') {
      this.rawObj = JSON.parse(rawObj)
    }

    this.rawObj = rawObj = rawObj || <MsgRawObj>{}
    this.obj = this.parse(rawObj)
    this.id = this.obj.id
  }

  // Transform rawObj to local m
  private parse(rawObj): MsgObj {
    const obj: MsgObj = {
      id:           rawObj.MsgId,
      type:         rawObj.MsgType,
      from:         rawObj.MMActualSender, // MMPeerUserName
      to:           rawObj.ToUserName,
      content:      rawObj.MMActualContent, // Content has @id prefix added by wx
      status:       rawObj.Status,
      digest:       rawObj.MMDigest,
      date:         rawObj.MMDisplayTime,  // Javascript timestamp of milliseconds
      url:          rawObj.Url || rawObj.MMAppMsgDownloadUrl || rawObj.MMLocationUrl,
    }

    // FIXME: has ther any better method to know the room ID?
    if (rawObj.MMIsChatRoom) {
      if (/^@@/.test(rawObj.FromUserName)) {
        obj.room =  rawObj.FromUserName // MMPeerUserName always eq FromUserName ?
      } else if (/^@@/.test(rawObj.ToUserName)) {
        obj.room = rawObj.ToUserName
      } else {
        log.error('Message', 'parse found a room message, but neither FromUserName nor ToUserName is a room(/^@@/)')
        // obj.room = undefined // bug compatible
      }
      if (obj.to && /^@@/.test(obj.to)) { // if a message in room without any specific receiver, then it will set to be `undefined`
        obj.to = undefined
      }
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
    let s = `${this.constructor.name}#${this._counter}`
    s += '(' + this.getSenderString()
    s += ':' + this.getContentString() + ')'
    return s
  }
  public getSenderString() {
    const fromName  = Contact.load(this.obj.from).name()
    const roomTopic = this.obj.room
                  ? (':' + Room.load(this.obj.room).topic())
                  : ''
    return `<${fromName}${roomTopic}>`
  }
  public getContentString() {
    let content = UtilLib.plainText(this.obj.content)
    if (content.length > 20) { content = content.substring(0, 17) + '...' }
    return '{' + this.type() + '}' + content
  }

  public from(contact: Contact): void
  public from(id: string): void
  public from(): Contact
  public from(contact?: Contact|string): Contact|void {
    if (contact) {
      if (contact instanceof Contact) {
        this.obj.from = contact.id
      } else if (typeof contact === 'string') {
        this.obj.from = contact
      } else {
        throw new Error('unsupport from param: ' + typeof contact)
      }
      return
    }

    const loadedContact = Contact.load(this.obj.from)
    if (!loadedContact) {
      throw new Error('no from')
    }
    return loadedContact
  }

  // public to(room: Room): void
  // public to(): Contact|Room
  // public to(contact?: Contact|Room|string): Contact|Room|void {
  public to(contact: Contact): void
  public to(id: string): void
  public to(): Contact|null // if to is not set, then room must had set

  public to(contact?: Contact|string): Contact|Room|null|void {
    if (contact) {
      if (contact instanceof Contact) {
        this.obj.to = contact.id
      } else if (typeof contact === 'string') {
        this.obj.to = contact
      } else {
        throw new Error('unsupport to param ' + typeof contact)
      }
      return
    }

    // no parameter

    if (!this.obj.to) {
      return null
    }
    return Contact.load(this.obj.to)
  }

  public room(room: Room): void
  public room(id: string): void
  public room(): Room|null
  public room(room?: Room|string): Room|null|void {
    if (room) {
      if (room instanceof Room) {
        this.obj.room = room.id
      } else if (typeof room === 'string') {
        this.obj.room = room
      } else {
        throw new Error('unsupport room param ' + typeof room)
      }
      return
    }
    if (this.obj.room) {
      return Room.load(this.obj.room)
    }
    return null
  }

  public content(): string
  public content(content: string): void

  public content(content?: string): string|void {
    if (content) {
      this.obj.content = content
      return
    }
    return this.obj.content
  }

  public type(): MsgType {
    return this.obj.type
  }

  public typeSub(): MsgType {
    if (!this.rawObj) {
      throw new Error('no rawObj')
    }
    return this.rawObj.SubMsgType
  }

  public typeApp(): AppMsgType {
    if (!this.rawObj) {
      throw new Error('no rawObj')
    }
    return this.rawObj.AppMsgType
  }

  public typeEx()  { return Message.TYPE[this.obj.type] }
  public count()   { return this._counter }

  public self(): boolean {
    const userId = Config.puppetInstance()
                        .userId

    const fromId = this.obj.from
    if (!userId || !fromId) {
      throw new Error('no user or no from')
    }

    return fromId === userId
  }

  /**
   * Get the mentioned contact which the message is mentioned for.
   * @returns {Contact[]} return the contactList which the message is mentioned for
   */
  public mention(): Contact[] {
    let contactList: Contact[] = []
    const room = this.room()
    if (!room) return contactList
    if (this.type() !== MsgType.TEXT) return contactList

    const foundList = this.content().match(/@\S+ ?/g)
    if (!foundList) return contactList

    const mentionList = foundList.map(element => {
      /**
       * fake '@' return element.slice(1, -1), wechat real '@' return element.slice(1)
       * fake '@': @ event is produced by typeing '@lijiarui '
       * real '@': @ event is produced by long press the contact's avatar
       */
      return element.slice(1)
    })
    log.verbose('Message', 'mention(%s),get mentionList: %s', this.content(), JSON.stringify(mentionList))
    mentionList.forEach(name => {
      const contact = room.member({alias: name}) || room.member({name: name})
      if (contact) {
        contactList.push(contact)
      }
    })
    return contactList
  }

  // public ready() {
  //   log.warn('Message', 'ready() DEPRECATED. use load() instead.')
  //   return this.ready()
  // }

  public async ready(): Promise<void> {
    log.silly('Message', 'ready()')

    try {
      const from  = Contact.load(this.obj.from)
      await from.ready()                // Contact from

      if (this.obj.to) {
        const to = Contact.load(this.obj.to)
        await to.ready()
      }

      if (this.obj.room) {
        const room  = Room.load(this.obj.room)
        await room.ready()  // Room member list
      }

    } catch (e) {
        log.error('Message', 'ready() exception: %s', e.stack)
        // console.log(e)
        // this.dump()
        // this.dumpRaw()
        throw e
    }
  }

  /**
   * @deprecated
   */
  public get(prop: string): string {
    log.warn('Message', 'DEPRECATED get() at %s', new Error('stack').stack)

    if (!prop || !(prop in this.obj)) {
      const s = '[' + Object.keys(this.obj).join(',') + ']'
      throw new Error(`Message.get(${prop}) must be in: ${s}`)
    }
    return this.obj[prop]
  }

  /**
   * @deprecated
   */
  public set(prop: string, value: string): this {
    log.warn('Message', 'DEPRECATED set() at %s', new Error('stack').stack)

    if (typeof value !== 'string') {
      throw new Error('value must be string, we got: ' + typeof value)
    }
    this.obj[prop] = value
    return this
  }

  public dump() {
    console.error('======= dump message =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
  }
  public dumpRaw() {
    console.error('======= dump raw message =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj && this.rawObj[k]}`))
  }

  public static async find(query) {
    return Promise.resolve(new Message(<MsgRawObj>{MsgId: '-1'}))
  }

  public static async findAll(query) {
    return Promise.resolve([
      new Message   (<MsgRawObj>{MsgId: '-2'}),
      new Message (<MsgRawObj>{MsgId: '-3'}),
    ])
  }

  public static initType() {
    Object.keys(Message.TYPE).forEach(k => {
      const v = Message.TYPE[k]
      Message.TYPE[v] = k // Message.Type[1] = 'TEXT'
    })
  }

  public say(text: string, replyTo?: Contact | Contact[]): Promise<any>
  public say(mediaMessage: MediaMessage, replyTo?: Contact | Contact[]): Promise<any>

  public say(textOrMedia: string | MediaMessage, replyTo?: Contact|Contact[]): Promise<any> {
    const content = textOrMedia instanceof MediaMessage ? textOrMedia.filename() : textOrMedia
    log.verbose('Message', 'say(%s, %s)', content, replyTo)
    let m
    if (typeof textOrMedia === 'string') {
      m = new Message()
      const room = this.room()
      if (room) {
        m.room(room)
      }

      if (!replyTo) {
        m.to(this.from())
        m.content(textOrMedia)

      } else if (this.room()) {
        let mentionList
        if (Array.isArray(replyTo)) {
          m.to(replyTo[0])
          mentionList = replyTo.map(c => '@' + c.name()).join(' ')
        } else {
          m.to(replyTo)
          mentionList = '@' + replyTo.name()
        }
        m.content(mentionList + ' ' + textOrMedia)
      }
    } else if (textOrMedia instanceof MediaMessage) {
      m = textOrMedia
      const room = this.room()
      if (room) {
        m.room(room)
      }

      if (!replyTo) {
        m.to(this.from())
      }
    }

    return Config.puppetInstance()
                  .send(m)
  }

}

Message.initType()

export class MediaMessage extends Message {
  private bridge: Bridge
  private fileStream: NodeJS.ReadableStream
  private fileName: string // 'music'
  private fileExt: string // 'mp3'

  constructor(rawObj: Object)
  constructor(filePath: string)

  constructor(rawObjOrFilePath: Object | string) {
    if (typeof rawObjOrFilePath === 'string') {
      super()
      this.fileStream = fs.createReadStream(rawObjOrFilePath)

      const pathInfo = path.parse(rawObjOrFilePath)
      this.fileName = pathInfo.name
      this.fileExt = pathInfo.ext.replace(/^\./, '')
    } else if (rawObjOrFilePath instanceof Object) {
      super(rawObjOrFilePath as any)
    } else {
      throw new Error('not supported construct param')
    }

    // FIXME: decoupling needed
    this.bridge = (Config.puppetInstance() as PuppetWeb)
      .bridge
  }

  public async ready(): Promise<void> {
    log.silly('MediaMessage', 'ready()')

    try {
      await super.ready()

      let url: string|null = null
      switch (this.type()) {
        case MsgType.EMOTICON:
          url = await this.bridge.getMsgEmoticon(this.id)
          break
        case MsgType.IMAGE:
          url = await this.bridge.getMsgImg(this.id)
          break
        case MsgType.VIDEO:
        case MsgType.MICROVIDEO:
          url = await this.bridge.getMsgVideo(this.id)
          break
        case MsgType.VOICE:
          url = await this.bridge.getMsgVoice(this.id)
          break

        case MsgType.APP:
          if (!this.rawObj) {
            throw new Error('no rawObj')
          }
          switch (this.typeApp()) {
            case AppMsgType.ATTACH:
              if (!this.rawObj.MMAppMsgDownloadUrl) {
                throw new Error('no MMAppMsgDownloadUrl')
              }
              // had set in Message
              // url = this.rawObj.MMAppMsgDownloadUrl
              break

            case AppMsgType.URL:
            case AppMsgType.READER_TYPE:
              if (!this.rawObj.Url) {
                throw new Error('no Url')
              }
              // had set in Message
              // url = this.rawObj.Url
              break

            default:
              const e = new Error('ready() unsupported typeApp(): ' + this.typeApp())
              log.warn('MediaMessage', e.message)
              this.dumpRaw()
              throw e
          }
          break

        case MsgType.TEXT:
          if (this.typeSub() === MsgType.LOCATION) {
            url = await this.bridge.getMsgPublicLinkImg(this.id)
          }
          break

        default:
          throw new Error('not support message type for MediaMessage')
      }

      if (!url) {
        if (!this.obj.url) {
          throw new Error('no obj.url')
        }
        url = this.obj.url
      }

      this.obj.url = url

    } catch (e) {
      log.warn('MediaMessage', 'ready() exception: %s', e.message)
      throw e
    }
  }

  public ext(): string {
    if (this.fileExt)
      return this.fileExt

    switch (this.type()) {
      case MsgType.EMOTICON:
        return 'gif'

      case MsgType.IMAGE:
        return 'jpg'

      case MsgType.VIDEO:
      case MsgType.MICROVIDEO:
        return 'mp4'

      case MsgType.VOICE:
        return 'mp3'

      case MsgType.APP:
        switch (this.typeApp()) {
          case AppMsgType.URL:
            return 'url' // XXX
        }
        break

      case MsgType.TEXT:
        if (this.typeSub() === MsgType.LOCATION) {
          return 'jpg'
        }
        break
    }
    throw new Error('not support type: ' + this.type())
  }

  public filename(): string {
    if (this.fileName && this.fileExt) {
      return this.fileName + '.' + this.fileExt
    }

    if (!this.rawObj) {
      throw new Error('no rawObj')
    }

    const objFileName = this.rawObj.FileName || this.rawObj.MediaId || this.rawObj.MsgId

    let filename  = moment().format('YYYY-MM-DD HH:mm:ss')
                    + ' #' + this._counter
                    + ' ' + this.getSenderString()
                    + ' ' + objFileName

    filename = filename.replace(/ /g, '_')

    const re = /\.[a-z0-9]{1,7}$/i
    if (!re.test(filename)) {
      const ext = this.rawObj.MMAppMsgFileExt || this.ext()
      filename += '.' + ext
    }
    return filename
  }

  // private getMsgImg(id: string): Promise<string> {
  //   return this.bridge.getMsgImg(id)
  //   .catch(e => {
  //     log.warn('MediaMessage', 'getMsgImg(%d) exception: %s', id, e.message)
  //     throw e
  //   })
  // }

  public async readyStream(): Promise<NodeJS.ReadableStream> {
    if (this.fileStream)
      return this.fileStream

    try {
      await this.ready()
      // FIXME: decoupling needed
      const cookies = await (Config.puppetInstance() as PuppetWeb).browser.readCookie()
      if (!this.obj.url) {
        throw new Error('no url')
      }
      return UtilLib.urlStream(this.obj.url, cookies)
    } catch (e) {
      log.warn('MediaMessage', 'stream() exception: %s', e.stack)
      throw e
    }
  }
}

/*
 * join room in mac client: https://support.weixin.qq.com/cgi-bin/
 * mmsupport-bin/addchatroombyinvite
 * ?ticket=AUbv%2B4GQA1Oo65ozlIqRNw%3D%3D&exportkey=AS9GWEg4L82fl3Y8e2OeDbA%3D
 * &lang=en&pass_ticket=T6dAZXE27Y6R29%2FFppQPqaBlNwZzw9DAN5RJzzzqeBA%3D
 * &wechat_real_lang=en
 */
