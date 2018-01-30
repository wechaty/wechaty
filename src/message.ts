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

import * as mime  from 'mime'

import {
  config,
  Raven,
  Sayable,
  log,
}                 from './config'

import Contact    from './contact'
import Room       from './room'
import Misc       from './misc'
import PuppetWeb  from './puppet-web/puppet-web'
import Bridge     from './puppet-web/bridge'

import {
  AppMsgType,
  MsgObj,
  MsgRawObj,
  MsgType,
}                 from './puppet-web/schema'

export type TypeName =  'attachment'
                      | 'audio'
                      | 'image'
                      | 'video'

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
    return `Message<${Misc.plainText(this.obj.content)}>`
  }

  /**
   * @private
   */
  public toStringDigest() {
    const text = Misc.digestEmoji(this.obj.digest)
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
    let content = Misc.plainText(this.obj.content)
    if (content.length > 20) { content = content.substring(0, 17) + '...' }
    return '{' + this.type() + '}' + content
  }

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
   * If type is equal to `MsgType.RECALLED`, {@link Message#id} is the msgId of the recalled message.
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
   * Please notice that when we are running Wechaty,
   * if you use the browser that controlled by Wechaty to send attachment files,
   * you will get a zero sized file, because it is not an attachment from the network,
   * but a local data, which is not supported by Wechaty yet.
   *
   * @returns {Promise<Readable>}
   */
  public readyStream(): Promise<Readable> {
    throw Error('abstract method')
  }

  // DEPRECATED: TypeScript ENUM did this for us 201705
  // public static initType() {
  //   Object.keys(Message.TYPE).forEach(k => {
  //     const v = Message.TYPE[k]
  //     Message.TYPE[v] = k // Message.Type[1] = 'TEXT'
  //   })
  // }

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
  public toString() {
    return `MediaMessage<${this.filename()}>`
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
    log.error('MediaMessage', `ext() got unknown type: ${this.type()}`)
    return String(this.type())
  }

  /**
   * return the MIME Type of this MediaMessage
   *
   */
  public mimeType(): string | null {
    return mime.getType(this.ext())
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
   * Get the read stream for attachment file
   */
  public async readyStream(): Promise<Readable> {
    log.verbose('MediaMessage', 'readyStream()')

    if (this.filePath)
      return fs.createReadStream(this.filePath)

    try {
      await this.ready()
      // FIXME: decoupling needed
      const cookies = await (config.puppetInstance() as PuppetWeb).cookies()
      if (!this.obj.url) {
        throw new Error('no url')
      }
      log.verbose('MediaMessage', 'readyStream() url: %s', this.obj.url)
      return Misc.urlStream(this.obj.url, cookies)
    } catch (e) {
      log.warn('MediaMessage', 'readyStream() exception: %s', e.stack)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * save file
   *
   * @param filePath save file
   */
  public async saveFile(filePath: string): Promise<void> {
    if (!filePath) {
      throw new Error('saveFile() filePath is invalid')
    }
    log.silly('MediaMessage', `saveFile() filePath:'${filePath}'`)
    if (fs.existsSync(filePath)) {
      throw new Error('saveFile() file does exist!')
    }
    const writeStream = fs.createWriteStream(filePath)
    let readStream
    try {
      readStream = await this.readyStream()
    } catch (e) {
      log.error('MediaMessage', `saveFile() call readyStream() error: ${e.message}`)
      throw new Error(`saveFile() call readyStream() error: ${e.message}`)
    }
    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream)
      readStream
        .once('end', resolve)
        .once('error', reject)
    })
      .catch(e => {
        log.error('MediaMessage', `saveFile() error: ${e.message}`)
        throw e
      })
  }

  /**
   * Forward the received message.
   *
   * The types of messages that can be forwarded are as follows:
   *
   * The return value of {@link Message#type} matches one of the following types:
   * ```
   * MsgType {
   *   TEXT                = 1,
   *   IMAGE               = 3,
   *   VIDEO               = 43,
   *   EMOTICON            = 47,
   *   LOCATION            = 48,
   *   APP                 = 49,
   *   MICROVIDEO          = 62,
   * }
   * ```
   *
   * When the return value of {@link Message#type} is `MsgType.APP`, the return value of {@link Message#typeApp} matches one of the following types:
   * ```
   * AppMsgType {
   *   TEXT                     = 1,
   *   IMG                      = 2,
   *   VIDEO                    = 4,
   *   ATTACH                   = 6,
   *   EMOJI                    = 8,
   * }
   * ```
   * It should be noted that when forwarding ATTACH type message, if the file size is greater than 25Mb, the forwarding will fail.
   * The reason is that the server shields the web wx to download more than 25Mb files with a file size of 0.
   *
   * But if the file is uploaded by you using wechaty, you can forward it.
   * You need to detect the following conditions in the message event, which can be forwarded if it is met.
   *
   * ```javasrcipt
   * .on('message', async m => {
   *   if (m.self() && m.rawObj && m.rawObj.Signature) {
   *     // Filter the contacts you have forwarded
   *     const msg = <MediaMessage> m
   *     await msg.forward()
   *   }
   * })
   * ```
   *
   * @param {(Sayable | Sayable[])} to Room or Contact
   * The recipient of the message, the room, or the contact
   * @returns {Promise<boolean>}
   * @memberof MediaMessage
   */
  public async forward(to: Room|Contact): Promise<boolean> {
    try {
      const ret = await config.puppetInstance().forward(this, to)
      return ret
    } catch (e) {
      log.error('Message', 'forward(%s) exception: %s', to, e)
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

export {
  MsgType,
}
export default Message
