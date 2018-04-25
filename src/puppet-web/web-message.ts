/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
import * as mime  from 'mime'
import {
  Readable,
}                 from 'stream'

import {
  Raven,
  log,
}                       from '../config'
import Message          from '../abstract-puppet/message'
import Misc             from '../misc'

import PuppetWeb  from './puppet-web'
import WebContact from './web-contact'
import WebRoom    from './web-room'

import {
  AppMsgType,
  MsgObj,
  MsgRawObj,
  MsgType,
}                 from './schema'

// export type TypeName =  'attachment'
//                       | 'audio'
//                       | 'image'
//                       | 'video'

export type ParsedPath = Partial<path.ParsedPath>

/**
 * All wechat messages will be encapsulated as a Message.
 *
 * `Message` is `Sayable`,
 * [Examples/Ding-Dong-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts}
 */
export class WebMessage extends Message {
  /**
   * @private
   */
  public readonly id: string

  /**
   * @private
   */
  public obj:     MsgObj
  public rawObj?: MsgRawObj

  private parsedPath?:  ParsedPath

  /**
   * @private
   */
  constructor(
    fileOrObj?: string | MsgRawObj,
  ) {
    super()
    log.silly('WebMessage', 'constructor()')

    this.obj = {} as MsgObj

    if (!fileOrObj) {
      this.rawObj = <MsgRawObj>{}
      return
    }

    if (typeof fileOrObj === 'string') {
      this.parsedPath = path.parse(fileOrObj)
    } else if (typeof fileOrObj === 'object') {
      this.rawObj = fileOrObj
      this.obj = this.parse(this.rawObj)
      this.id = this.obj.id
    } else {
      throw new Error('not supported construct param')
    }
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
        log.error('WebMessage', 'parse found a room message, but neither FromUserName nor ToUserName is a room(/^@@/)')
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
    return `WebMessage<${Misc.plainText(this.obj.content)}>`
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
  public getSenderString() {
    const from = WebContact.load(this.obj.from)
    from.puppet = this.puppet

    const fromName  = from.name()
    const roomTopic = this.obj.room
                  ? (':' + WebRoom.load(this.obj.room).topic())
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

  /**
   * @private
   */
  public from(contact: WebContact): void

  /**
   * @private
   */
  public from(id: string): void

  public from(): WebContact

  /**
   * Get the sender from a message.
   * @returns {Contact}
   */
  public from(contact?: WebContact|string): WebContact|void {
    if (contact) {
      if (contact instanceof WebContact) {
        this.obj.from = contact.id
      } else if (typeof contact === 'string') {
        this.obj.from = contact
      } else {
        throw new Error('unsupport from param: ' + typeof contact)
      }
      return
    }

    const loadedContact = WebContact.load(this.obj.from) as WebContact
    loadedContact.puppet = this.puppet

    return loadedContact
  }

  /**
   * @private
   */
  public room(room: WebRoom): void

  /**
   * @private
   */
  public room(id: string): void

  public room(): WebRoom|null

  /**
   * Get the room from the message.
   * If the message is not in a room, then will return `null`
   *
   * @returns {(WebRoom|null)}
   */
  public room(room?: WebRoom|string): WebRoom|null|void {
    if (room) {
      if (room instanceof WebRoom) {
        this.obj.room = room.id
      } else if (typeof room === 'string') {
        this.obj.room = room
      } else {
        throw new Error('unsupport room param ' + typeof room)
      }
      return
    }
    if (this.obj.room) {
      const r = WebRoom.load(this.obj.room) as WebRoom
      r.puppet = this.puppet
      return r
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

  public content(content?: string) {
    if (content) {
      return this.text(content)
    } else {
      return this.text()
    }
  }

  public text(): string
  public text(content: string): void
  /**
   * Get the textcontent of the message
   *
   * @returns {string}
   */
  public text(text?: string): string | void {
    if (text) {
      this.obj.content = text
      return
    }
    return this.obj.content
  }

  public async say(textOrMessage: string | WebMessage, replyTo?: WebContact|WebContact[]): Promise<void> {
    log.verbose('WebMessage', 'say(%s, %s)', textOrMessage, replyTo)

    let m: WebMessage

    if (typeof textOrMessage === 'string') {
      m = new WebMessage()
      m.puppet = this.puppet

      const room = this.room()
      if (room) {
        m.room(room)
      }

      if (!replyTo) {
        m.to(this.from())
        m.text(textOrMessage)

      } else if (this.room()) {
        let mentionList
        if (Array.isArray(replyTo)) {
          m.to(replyTo[0])
          mentionList = replyTo.map(c => '@' + c.name()).join(' ')
        } else {
          m.to(replyTo)
          mentionList = '@' + replyTo.name()
        }
        m.text(mentionList + ' ' + textOrMessage)
      }
    /* tslint:disable:no-use-before-declare */
    } else if (textOrMessage instanceof Message) {
      m = textOrMessage
      const room = this.room()
      if (room) {
        m.room(room)
      }

      if (!replyTo) {
        m.to(this.from())
      }
    } else {
      throw new Error('unknown parameter for say()')
    }

    await this.puppet.send(m)
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
   * Check if a message is sent by self.
   *
   * @returns {boolean} - Return `true` for send from self, `false` for send from others.
   * @example
   * if (message.self()) {
   *  console.log('this message is sent by myself!')
   * }
   */
  public self(): boolean {
    const userId = this.puppet.user!.id

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
   * @returns {WebContact[]} - Return message mentioned contactList
   *
   * @example
   * const contactList = message.mentioned()
   * console.log(contactList)
   */
  public mentioned(): WebContact[] {
    let contactList: WebContact[] = []
    const room = this.room()
    if (this.type() !== MsgType.TEXT || !room ) {
      return contactList
    }

    // define magic code `8197` to identify @xxx
    const AT_SEPRATOR = String.fromCharCode(8197)

    const atList = this.text().split(AT_SEPRATOR)

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
    log.verbose('WebMessage', 'mentioned(%s),get mentionList: %s', this.content(), JSON.stringify(mentionList))

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
  public async ready(): Promise<this> {
    log.silly('WebMessage', 'ready()')

    try {
      /**
       * 1. ready from contact
       */
      const from  = WebContact.load(this.obj.from)
      from.puppet = this.puppet
      await from.ready()  // Contact from

      /**
       * 2. ready to contact
       */
      if (this.obj.to) {
        const to = WebContact.load(this.obj.to)
        to.puppet = this.puppet
        await to.ready()
      }

      /**
       * 3. ready the room
       */
      if (this.obj.room) {
        const room  = WebRoom.load(this.obj.room)
        room.puppet = this.puppet
        await room.ready()  // Room member list
      }

    } catch (e) {
      log.error('WebMessage', 'ready() exception: %s', e.stack)
      Raven.captureException(e)
      // console.log(e)
      // this.dump()
      // this.dumpRaw()
      throw e
    }

    await this.readyMedia()

    return this
  }

  public async readyMedia(): Promise<this> {
    log.silly('WebMessage', 'readyMedia()')

    const puppet = this.puppet as PuppetWeb

    try {

      let url: string | undefined
      switch (this.type()) {
        case MsgType.EMOTICON:
          url = await puppet.bridge.getMsgEmoticon(this.id)
          break
        case MsgType.IMAGE:
          url = await puppet.bridge.getMsgImg(this.id)
          break
        case MsgType.VIDEO:
        case MsgType.MICROVIDEO:
          url = await puppet.bridge.getMsgVideo(this.id)
          break
        case MsgType.VOICE:
          url = await puppet.bridge.getMsgVoice(this.id)
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
              log.warn('WebMessage', e.message)
              this.dumpRaw()
              throw e
          }
          break

        case MsgType.TEXT:
          if (this.typeSub() === MsgType.LOCATION) {
            url = await puppet.bridge.getMsgPublicLinkImg(this.id)
          }
          break

        default:
          /**
           * not a support media message, do nothing.
           */
          return this
      }

      if (!url) {
        if (!this.obj.url) {
          /**
           * not a support media message, do nothing.
           */
          return this
        }
        url = this.obj.url
      }

      this.obj.url = url

    } catch (e) {
      log.warn('WebMessage', 'ready() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }

    return this
  }

  /**
   * @private
   */
  public get(prop: string): string {
    log.warn('WebMessage', 'DEPRECATED get() at %s', new Error('stack').stack)

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
    log.warn('WebMessage', 'DEPRECATED set() at %s', new Error('stack').stack)

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
    return Promise.resolve(new WebMessage(<MsgRawObj>{MsgId: '-1'}))
  }

  /**
   * @todo add function
   */
  public static async findAll(query) {
    return Promise.resolve([
      new WebMessage   (<MsgRawObj>{MsgId: '-2'}),
      new WebMessage (<MsgRawObj>{MsgId: '-3'}),
    ])
  }

  // public to(room: Room): void
  // public to(): Contact|Room
  // public to(contact?: Contact|Room|string): Contact|Room|void {

  /**
   * @private
   */
  public to(contact: WebContact): void

  /**
   * @private
   */
  public to(id: string): void

  public to(): WebContact | null // if to is not set, then room must had set

  /**
   * Get the destination of the message
   * Message.to() will return null if a message is in a room, use Message.room() to get the room.
   * @returns {(Contact|null)}
   */
  public to(contact?: WebContact | string): WebContact | WebRoom | null | void {
    if (contact) {
      if (contact instanceof WebContact) {
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
    const to = WebContact.load(this.obj.to) as WebContact
    to.puppet = this.puppet

    return to
  }

  /**
   * Please notice that when we are running Wechaty,
   * if you use the browser that controlled by Wechaty to send attachment files,
   * you will get a zero sized file, because it is not an attachment from the network,
   * but a local data, which is not supported by Wechaty yet.
   *
   * Get the read stream for attachment file
   *
   * @returns {Promise<Readable>}
   */
  public async readyStream(): Promise<Readable> {
    log.verbose('WebMessage', 'readyStream()')

    /**
     * 1. local file
     */
    try {
      const filename = this.filename()
      if (filename) {
        return fs.createReadStream(filename)
      }
    } catch (e) {
      // no filename
    }

    /**
     * 2. remote url
     */
    try {
      await this.ready()
      // FIXME: decoupling needed
      const cookies = await (this.puppet as any as PuppetWeb).cookies()
      if (!this.obj.url) {
        throw new Error('no url')
      }
      log.verbose('WebMessage', 'readyStream() url: %s', this.obj.url)
      return Misc.urlStream(this.obj.url, cookies)
    } catch (e) {
      log.warn('WebMessage', 'readyStream() exception: %s', e.stack)
      Raven.captureException(e)
      throw e
    }
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
    if (this.parsedPath) {
      // https://nodejs.org/api/path.html#path_path_parse_path
      const filename = path.join(
        this.parsedPath!.dir  || '',
        this.parsedPath!.base || '',
      )
      return filename
    }

    if (this.rawObj) {
      let filename = this.rawObj.FileName || this.rawObj.MediaId || this.rawObj.MsgId

      const re = /\.[a-z0-9]{1,7}$/i
      if (!re.test(filename)) {
        const ext = this.rawObj.MMAppMsgFileExt || this.ext()
        filename += '.' + ext
      }
      return filename
    }

    throw new Error('no rawObj')

  }

  /**
   * Get the MediaMessage file extension(including the dot `.`), etc: `.jpg`, `.gif`, `.pdf`, `.word` ..
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
    if (this.parsedPath && this.parsedPath.ext)
      return this.parsedPath.ext

    switch (this.type()) {
      case MsgType.EMOTICON:
        return '.gif'

      case MsgType.IMAGE:
        return '.jpg'

      case MsgType.VIDEO:
      case MsgType.MICROVIDEO:
        return '.mp4'

      case MsgType.VOICE:
        return '.mp3'

      case MsgType.APP:
        switch (this.typeApp()) {
          case AppMsgType.URL:
            return '.url' // XXX
        }
        break

      case MsgType.TEXT:
        if (this.typeSub() === MsgType.LOCATION) {
          return '.jpg'
        }
        break
    }
    log.error('WebMessage', `ext() got unknown type: ${this.type()}`)
    return String('.' + this.type())
  }

  /**
   * return the MIME Type of this MediaMessage
   *
   */
  public mimeType(): string | null {
    // getType support both 'js' & '.js' as arg
    return mime.getType(this.ext())
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
    log.silly('WebMessage', `saveFile() filePath:'${filePath}'`)
    if (fs.existsSync(filePath)) {
      throw new Error('saveFile() file does exist!')
    }
    const writeStream = fs.createWriteStream(filePath)
    let readStream
    try {
      readStream = await this.readyStream()
    } catch (e) {
      log.error('WebMessage', `saveFile() call readyStream() error: ${e.message}`)
      throw new Error(`saveFile() call readyStream() error: ${e.message}`)
    }
    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream)
      readStream
        .once('end', resolve)
        .once('error', reject)
    })
      .catch(e => {
        log.error('WebMessage', `saveFile() error: ${e.message}`)
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
  public async forward(to: WebRoom|WebContact): Promise<void> {
    /**
     * 1. Text message
     */
    if (this.type() === MsgType.TEXT) {
      await to.say(this.text())
      return
    }

    /**
     * 2. Media message
     */
    try {
      await this.puppet.forward(this, to)
    } catch (e) {
      log.error('WebMessage', 'forward(%s) exception: %s', to, e)
      throw e
    }
  }

}

export default WebMessage
