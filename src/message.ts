/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *   @ignore
 */
import * as fs    from 'fs'
import * as path  from 'path'
import {
  Readable,
}                 from 'stream'

import {
  config,
  Raven,
  RecommendInfo,
  Sayable,
  log,
}                 from './config'

import Contact    from './contact'
import Room       from './room'
import UtilLib    from './util-lib'
import PuppetWeb  from './puppet-web/puppet-web'
import Bridge     from './puppet-web/bridge'

export interface MsgRawObj {
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

export interface MsgObj {
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

export interface MsgTypeMap {
  [index: string]: string|number,
  //   MessageTypeName:  MessageTypeValue
  // , MessageTypeValue: MessageTypeName
}

/**
 *
 * Enum for AppMsgType values.
 *
 * @enum {number}
 * @property {number} TEXT                    - AppMsgType.TEXT                     (1)     for TEXT
 * @property {number} IMG                     - AppMsgType.IMG                      (2)      for IMG
 * @property {number} AUDIO                   - AppMsgType.AUDIO                    (3)      for AUDIO
 * @property {number} VIDEO                   - AppMsgType.VIDEO                    (4)      for VIDEO
 * @property {number} URL                     - AppMsgType.URL                      (5)      for URL
 * @property {number} ATTACH                  - AppMsgType.ATTACH                   (6)      for ATTACH
 * @property {number} OPEN                    - AppMsgType.OPEN                     (7)      for OPEN
 * @property {number} EMOJI                   - AppMsgType.EMOJI                    (8)      for EMOJI
 * @property {number} VOICE_REMIND            - AppMsgType.VOICE_REMIND             (9)      for VOICE_REMIND
 * @property {number} SCAN_GOOD               - AppMsgType.SCAN_GOOD                (10)     for SCAN_GOOD
 * @property {number} GOOD                    - AppMsgType.GOOD                     (13)     for GOOD
 * @property {number} EMOTION                 - AppMsgType.EMOTION                  (15)     for EMOTION
 * @property {number} CARD_TICKET             - AppMsgType.CARD_TICKET              (16)     for CARD_TICKET
 * @property {number} REALTIME_SHARE_LOCATION - AppMsgType.REALTIME_SHARE_LOCATION  (17)     for REALTIME_SHARE_LOCATION
 * @property {number} TRANSFERS               - AppMsgType.TRANSFERS                (2e3)    for TRANSFERS
 * @property {number} RED_ENVELOPES           - AppMsgType.RED_ENVELOPES            (2001)   for RED_ENVELOPES
 * @property {number} READER_TYPE             - AppMsgType.READER_TYPE              (100001) for READER_TYPE
 */
export enum AppMsgType {
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

/**
 *
 * Enum for MsgType values.
 * @enum {number}
 * @property {number} TEXT                - MsgType.TEXT                (1)     for TEXT
 * @property {number} IMAGE               - MsgType.IMAGE               (3)     for IMAGE
 * @property {number} VOICE               - MsgType.VOICE               (34)    for VOICE
 * @property {number} VERIFYMSG           - MsgType.VERIFYMSG           (37)    for VERIFYMSG
 * @property {number} POSSIBLEFRIEND_MSG  - MsgType.POSSIBLEFRIEND_MSG  (40)    for POSSIBLEFRIEND_MSG
 * @property {number} SHARECARD           - MsgType.SHARECARD           (42)    for SHARECARD
 * @property {number} VIDEO               - MsgType.VIDEO               (43)    for VIDEO
 * @property {number} EMOTICON            - MsgType.EMOTICON            (47)    for EMOTICON
 * @property {number} LOCATION            - MsgType.LOCATION            (48)    for LOCATION
 * @property {number} APP                 - MsgType.APP                 (49)    for APP
 * @property {number} VOIPMSG             - MsgType.VOIPMSG             (50)    for VOIPMSG
 * @property {number} STATUSNOTIFY        - MsgType.STATUSNOTIFY        (51)    for STATUSNOTIFY
 * @property {number} VOIPNOTIFY          - MsgType.VOIPNOTIFY          (52)    for VOIPNOTIFY
 * @property {number} VOIPINVITE          - MsgType.VOIPINVITE          (53)    for VOIPINVITE
 * @property {number} MICROVIDEO          - MsgType.MICROVIDEO          (62)    for MICROVIDEO
 * @property {number} SYSNOTICE           - MsgType.SYSNOTICE           (9999)  for SYSNOTICE
 * @property {number} SYS                 - MsgType.SYS                 (10000) for SYS
 * @property {number} RECALLED            - MsgType.RECALLED            (10002) for RECALLED
 */
export enum MsgType {
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

/**
 * All wechat messages will be encapsulated as a Message.
 *
 * `Message` is `Sayable`,
 * [Example/Ding-Dong-Bot]{@link https://github.com/Chatie/wechaty/blob/master/example/ding-dong-bot.ts}
 */
export class Message implements Sayable {
  /**
   * @private
   */
  public static counter = 0

  /**
   * @private
   */
  public _counter: number

  // DEPRECATED: TypeScript ENUM did this for us 201705
  /**
   * a map for:
   *   1. name to id
   *   2. id to name
   */
  // public static TYPE: MsgTypeMap = {
  //   TEXT:               1,
  //   IMAGE:              3,
  //   VOICE:              34,
  //   VERIFYMSG:          37,
  //   POSSIBLEFRIEND_MSG: 40,
  //   SHARECARD:          42,
  //   VIDEO:              43,
  //   EMOTICON:           47,
  //   LOCATION:           48,
  //   APP:                49,
  //   VOIPMSG:            50,
  //   STATUSNOTIFY:       51,
  //   VOIPNOTIFY:         52,
  //   VOIPINVITE:         53,
  //   MICROVIDEO:         62,
  //   SYSNOTICE:          9999,
  //   SYS:                10000,
  //   RECALLED:           10002,
  // }

  /**
   * @private
   */
  public readonly id: string

  /**
   * @private
   */
  public obj = <MsgObj>{}

  /**
   * @private
   */
  public readyStream(): Promise<Readable> {
    throw Error('abstract method')
  }

  /**
   * @private
   */
  public filename(): string {
    throw Error('not a media message')
  }

  /**
   * @private
   */
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

  /**
   * @private
   */
  // Transform rawObj to local obj
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

    // FIXME: has there any better method to know the room ID?
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

  /**
   * @private
   */
  public toString() {
    return UtilLib.plainText(this.obj.content)
  }

  /**
   * @private
   */
  public toStringDigest() {
    const text = UtilLib.digestEmoji(this.obj.digest)
    return '{' + this.typeEx() + '}' + text
  }

  /**
   * @private
   */
  public toStringEx() {
    let s = `${this.constructor.name}#${this._counter}`
    s += '(' + this.getSenderString()
    s += ':' + this.getContentString() + ')'
    return s
  }

  /**
   * @private
   */
  public getSenderString() {
    const fromName  = Contact.load(this.obj.from).name()
    const roomTopic = this.obj.room
                  ? (':' + Room.load(this.obj.room).topic())
                  : ''
    return `<${fromName}${roomTopic}>`
  }

  /**
   * @private
   */
  public getContentString() {
    let content = UtilLib.plainText(this.obj.content)
    if (content.length > 20) { content = content.substring(0, 17) + '...' }
    return '{' + this.type() + '}' + content
  }

  /**
   * @private
   */
  public from(contact: Contact): void

  /**
   * @private
   */
  public from(id: string): void

  public from(): Contact

  /**
   * Get the sender from a message.
   * @returns {Contact}
   */
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

  /**
   * @private
   */
  public to(contact: Contact): void

  /**
   * @private
   */
  public to(id: string): void

  public to(): Contact|null // if to is not set, then room must had set

  /**
   * Get the destination of the message
   * Message.to() will return null if a message is in a room, use Message.room() to get the room.
   * @returns {(Contact|null)}
   */
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

  /**
   * @private
   */
  public room(room: Room): void

  /**
   * @private
   */
  public room(id: string): void

  public room(): Room|null

  /**
   * Get the room from the message.
   * If the message is not in a room, then will return `null`
   *
   * @returns {(Room|null)}
   */
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

  /**
   * Get the content of the message
   *
   * @returns {string}
   */
  public content(): string

  /**
   * @private
   */
  public content(content: string): void

  /**
   * Get the content of the message
   *
   * @returns {string}
   */
  public content(content?: string): string|void {
    if (content) {
      this.obj.content = content
      return
    }
    return this.obj.content
  }

  /**
   * Get the type from the message.
   *
   * @see {@link MsgType}
   * @returns {MsgType}
   */
  public type(): MsgType {
    return this.obj.type
  }

  /**
   * Get the typeSub from the message.
   *
   * If message is a location message: `m.type() === MsgType.TEXT && m.typeSub() === MsgType.LOCATION`
   *
   * @see {@link MsgType}
   * @returns {MsgType}
   */
  public typeSub(): MsgType {
    if (!this.rawObj) {
      throw new Error('no rawObj')
    }
    return this.rawObj.SubMsgType
  }

  /**
   * Get the typeApp from the message.
   *
   * @returns {AppMsgType}
   * @see {@link AppMsgType}
   */
  public typeApp(): AppMsgType {
    if (!this.rawObj) {
      throw new Error('no rawObj')
    }
    return this.rawObj.AppMsgType
  }

  /**
   * Get the typeEx from the message.
   *
   * @returns {MsgType}
   */
  public typeEx()  { return MsgType[this.obj.type] }

  /**
   * @private
   */
  public count()   { return this._counter }

  /**
   * Check if a message is sent by self.
   *
   * @returns {boolean} - Return `true` for send from self, `false` for send from others.
   * @example
   * if (message.self()) {
   *  console.log('this message is sent by myself!')
   * }
   */
  public self(): boolean {
    const userId = config.puppetInstance()
                        .userId

    const fromId = this.obj.from
    if (!userId || !fromId) {
      throw new Error('no user or no from')
    }

    return fromId === userId
  }

  /**
   *
   * Get message mentioned contactList.
   *
   * Message event table as follows
   *
   * |                                                                            | Web  |  Mac PC Client | iOS Mobile |  android Mobile |
   * | :---                                                                       | :--: |     :----:     |   :---:    |     :---:       |
   * | [You were mentioned] tip ([有人@我]的提示)                                   |  ✘   |        √       |     √      |       √         |
   * | Identify magic code (8197) by copy & paste in mobile                       |  ✘   |        √       |     √      |       ✘         |
   * | Identify magic code (8197) by programming                                  |  ✘   |        ✘       |     ✘      |       ✘         |
   * | Identify two contacts with the same roomAlias by [You were  mentioned] tip |  ✘   |        ✘       |     √      |       √         |
   *
   * @returns {Contact[]} - Return message mentioned contactList
   *
   * @example
   * const contactList = message.mentioned()
   * console.log(contactList)
   */
  public mentioned(): Contact[] {
    let contactList: Contact[] = []
    const room = this.room()
    if (this.type() !== MsgType.TEXT || !room ) {
      return contactList
    }

    // define magic code `8197` to identify @xxx
    const AT_SEPRATOR = String.fromCharCode(8197)

    const atList = this.content().split(AT_SEPRATOR)

    if (atList.length === 0) return contactList

    // Using `filter(e => e.indexOf('@') > -1)` to filter the string without `@`
    const rawMentionedList = atList
      .filter(str => str.includes('@'))
      .map(str => multipleAt(str))
      .filter(str => !!str) // filter blank string

    // convert 'hello@a@b@c' to [ 'c', 'b@c', 'a@b@c' ]
    function multipleAt(str: string) {
      str = str.replace(/^.*?@/, '@')
      let name = ''
      const nameList: string[] = []
      str.split('@')
        .filter(mentionName => !!mentionName)
        .reverse()
        .forEach(mentionName => {
          name = mentionName + '@' + name
          nameList.push(name.slice(0, -1)) // get rid of the `@` at beginning
        })
      return nameList
    }

    // flatten array, see http://stackoverflow.com/a/10865042/1123955
    const mentionList = [].concat.apply([], rawMentionedList)
    log.verbose('Message', 'mentioned(%s),get mentionList: %s', this.content(), JSON.stringify(mentionList))

    contactList = [].concat.apply([],
      mentionList.map(nameStr => room.memberAll(nameStr))
      .filter(contact => !!contact),
    )

    if (contactList.length === 0) {
      log.warn(`Message`, `message.mentioned() can not found member using room.member() from mentionList, metion string: ${JSON.stringify(mentionList)}`)
    }
    return contactList
  }

  /**
   * @private
   */
  public async ready(): Promise<void> {
    log.silly('Message', 'ready()')

    try {
      const from  = Contact.load(this.obj.from)
      await from.ready()  // Contact from

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
        Raven.captureException(e)
        // console.log(e)
        // this.dump()
        // this.dumpRaw()
        throw e
    }
  }

  /**
   * @private
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
   * @private
   */
  public set(prop: string, value: string): this {
    log.warn('Message', 'DEPRECATED set() at %s', new Error('stack').stack)

    if (typeof value !== 'string') {
      throw new Error('value must be string, we got: ' + typeof value)
    }
    this.obj[prop] = value
    return this
  }

  /**
   * @private
   */
  public dump() {
    console.error('======= dump message =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
  }

  /**
   * @private
   */
  public dumpRaw() {
    console.error('======= dump raw message =======')
    if (!this.rawObj) {
      throw new Error('no this.obj')
    }
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj && this.rawObj[k]}`))
  }

  /**
   * @todo add function
   */
  public static async find(query) {
    return Promise.resolve(new Message(<MsgRawObj>{MsgId: '-1'}))
  }

  /**
   * @todo add function
   */
  public static async findAll(query) {
    return Promise.resolve([
      new Message   (<MsgRawObj>{MsgId: '-2'}),
      new Message (<MsgRawObj>{MsgId: '-3'}),
    ])
  }

  // DEPRECATED: TypeScript ENUM did this for us 201705
  // public static initType() {
  //   Object.keys(Message.TYPE).forEach(k => {
  //     const v = Message.TYPE[k]
  //     Message.TYPE[v] = k // Message.Type[1] = 'TEXT'
  //   })
  // }

  public say(text: string, replyTo?: Contact | Contact[]): Promise<any>

  public say(mediaMessage: MediaMessage, replyTo?: Contact | Contact[]): Promise<any>

  /**
   * Reply a Text or Media File message to the sender.
   *
   * @see {@link https://github.com/Chatie/wechaty/blob/master/example/ding-dong-bot.ts|Example/ding-dong-bot}
   * @param {(string | MediaMessage)} textOrMedia
   * @param {(Contact|Contact[])} [replyTo]
   * @returns {Promise<any>}
   *
   * @example
   * const bot = Wechaty.instance()
   * bot
   * .on('message', async m => {
   *   if (/^ding$/i.test(m.content())) {
   *     await m.say('hello world')
   *     console.log('Bot REPLY: hello world')
   *     await m.say(new MediaMessage(__dirname + '/wechaty.png'))
   *     console.log('Bot REPLY: Image')
   *   }
   * })
   */
  public say(textOrMedia: string | MediaMessage, replyTo?: Contact|Contact[]): Promise<any> {
    /* tslint:disable:no-use-before-declare */
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
    /* tslint:disable:no-use-before-declare */
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

    return config.puppetInstance()
                  .send(m)
  }

}

// Message.initType()

/**
 * Meidia Type Message
 *
 */
export class MediaMessage extends Message {
  /**
   * @private
   */
  private bridge: Bridge

  /**
   * @private
   */
  private filePath: string

  /**
   * @private
   */
  private fileName: string // 'music'

  /**
   * @private
   */
  private fileExt: string // 'mp3'

  /**
   * @private
   */
  constructor(rawObj: Object)

  /**
   * @private
   */
  constructor(filePath: string)

  constructor(rawObjOrFilePath: Object | string) {
    if (typeof rawObjOrFilePath === 'string') {
      super()
      this.filePath = rawObjOrFilePath

      const pathInfo = path.parse(rawObjOrFilePath)
      this.fileName = pathInfo.name
      this.fileExt = pathInfo.ext.replace(/^\./, '')
    } else if (rawObjOrFilePath instanceof Object) {
      super(rawObjOrFilePath as any)
    } else {
      throw new Error('not supported construct param')
    }

    // FIXME: decoupling needed
    this.bridge = (config.puppetInstance() as PuppetWeb)
                    .bridge
  }

  /**
   * @private
   */
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
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * Get the MediaMessage file extension, etc: `jpg`, `gif`, `pdf`, `word` ..
   *
   * @returns {string}
   * @example
   * bot.on('message', async function (m) {
   *   if (m instanceof MediaMessage) {
   *     console.log('media message file name extention is: ' + m.ext())
   *   }
   * })
   */
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

  /**
   * Get the MediaMessage filename, etc: `how to build a chatbot.pdf`..
   *
   * @returns {string}
   * @example
   * bot.on('message', async function (m) {
   *   if (m instanceof MediaMessage) {
   *     console.log('media message file name is: ' + m.filename())
   *   }
   * })
   */
  public filename(): string {
    if (this.fileName && this.fileExt) {
      return this.fileName + '.' + this.fileExt
    }

    if (!this.rawObj) {
      throw new Error('no rawObj')
    }

    let filename = this.rawObj.FileName || this.rawObj.MediaId || this.rawObj.MsgId

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

  /**
   * @private
   */
  public async readyStream(): Promise<Readable> {
    if (this.filePath)
      return fs.createReadStream(this.filePath)

    try {
      await this.ready()
      // FIXME: decoupling needed
      const cookies = await (config.puppetInstance() as PuppetWeb).browser.readCookie()
      if (!this.obj.url) {
        throw new Error('no url')
      }
      return UtilLib.urlStream(this.obj.url, cookies)
    } catch (e) {
      log.warn('MediaMessage', 'stream() exception: %s', e.stack)
      Raven.captureException(e)
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

export default Message
