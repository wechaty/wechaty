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
import Misc             from '../misc'

import {
  Message,
}           from '../puppet/'

import PuppetPuppeteer  from './puppet-puppeteer'
import PuppeteerContact from './puppeteer-contact'
import PuppeteerRoom    from './puppeteer-room'

import {
  AppMsgType,
  WebMsgPayload,
  WebMessageRawPayload,
  WebMsgType,
}                 from '../puppet/schemas/'

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
export class PuppeteerMessage extends Message {
  /**
   * @private
   */
  public readonly id: string

  /**
   * @private
   */
  private payload: WebMsgPayload
  public rawObj?: WebMessageRawPayload

  private parsedPath?:  ParsedPath

  /**
   * @private
   */
  constructor(
    fileOrPayload?: string | WebMessageRawPayload,
  ) {
    super()
    log.silly('PuppeteerMessage', 'constructor()')

    this.payload    = {} as WebMsgPayload
    // this.rawObj = {} as MsgRawObj

    if (!fileOrPayload) {
      return
    }

    if (typeof fileOrPayload === 'string') {
      this.parsedPath = path.parse(fileOrPayload)
    } else if (typeof fileOrPayload === 'object') {
      this.rawObj = fileOrPayload
      this.payload = this.parse(this.rawObj)
      this.id = this.payload.id
    } else {
      throw new Error('not supported construct param: ' + typeof fileOrPayload)
    }
  }

  /**
   * @private
   */
  // Transform rawObj to local obj
  private parse(rawObj: WebMessageRawPayload): WebMsgPayload {
    const obj: WebMsgPayload = {
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
        log.error('PuppeteerMessage', 'parse found a room message, but neither FromUserName nor ToUserName is a room(/^@@/)')
        // obj.room = undefined // bug compatible
      }
      if (obj.to && /^@@/.test(obj.to)) { // if a message in room without any specific receiver, then it will set to be `undefined`
        obj.to = undefined
      }
    }

    return obj
  }

  public from(contact: PuppeteerContact): void
  public from()                         : PuppeteerContact

  public from(contact?: PuppeteerContact): void | PuppeteerContact {
    if (contact) {
      if (contact instanceof PuppeteerContact) {
        this.payload.from = contact.id
      } else {
        throw new Error('unsupport from param: ' + typeof contact)
      }
      return
    }

    const loadedContact = PuppeteerContact.load(this.payload.from) as PuppeteerContact
    loadedContact.puppet = this.puppet

    return loadedContact
  }

  public to(contact: PuppeteerContact): void
  public to()                         : PuppeteerContact | null // if to is not set, then room must had set

  public to(contact?: PuppeteerContact): void | null | PuppeteerContact {
    if (contact) {
      this.payload.to = contact.id
      return
    }

    // no parameter
    if (!this.payload.to) {
      return null
    }
    const to = PuppeteerContact.load(this.payload.to) as PuppeteerContact
    to.puppet = this.puppet

    return to
  }

  public room(room: PuppeteerRoom): void
  public room()                   : null | PuppeteerRoom

  public room(room?: PuppeteerRoom): void | null | PuppeteerRoom {
    if (room) {
      this.payload.room = room.id
      return
    }

    if (this.payload.room) {
      const r = PuppeteerRoom.load(this.payload.room)
      r.puppet = this.puppet
      return r
    }

    return null
  }

  public content(): string
  public content(content: string): void

  public content(content?: string): void | string {
    log.warn('PuppeteerMessage', 'content() DEPRECATED. use text() instead.')
    if (content) {
      return this.text(content)
    } else {
      return this.text()
    }
  }

  public text(): string
  public text(text: string): void
  /**
   * Get the textcontent of the message
   *
   * @returns {string}
   */
  public text(text?: string):  void | string {
    if (text) {
      this.payload.content = text
      return
    }
    return this.payload.content
  }

  public async say(text: string, mention?: PuppeteerContact | PuppeteerContact[]): Promise<void>
  public async say(message: PuppeteerMessage)                                    : Promise<void>

  public async say(
    textOrMessage: string | PuppeteerMessage,
    mention?: PuppeteerContact | PuppeteerContact[],
  ): Promise<void> {
    log.verbose('PuppeteerMessage', 'say(%s, %s)', textOrMessage, mention)

    let m: PuppeteerMessage

    if (typeof textOrMessage === 'string') {
      m = new PuppeteerMessage()
      m.puppet = this.puppet

      const room = this.room()
      if (room) {
        m.room(room)
      }

      if (!mention) {
        m.to(this.from())
        m.text(textOrMessage)

      } else if (this.room()) {
        let mentionList
        if (Array.isArray(mention)) {
          m.to(mention[0])
          mentionList = mention.map(c => '@' + c.name()).join(' ')
        } else {
          m.to(mention)
          mentionList = '@' + mention.name()
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

      if (!mention) {
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
   * @returns {WebMsgType}
   */
  public type(): WebMsgType {
    log.silly('PuppeteerMessage', 'type() = %s', WebMsgType[this.payload.type])

    /**
     * 1. A message created with rawObj
     */
    if (this.payload.type) {
      return this.payload.type
    }

    /**
     * 2. A message created with TEXT
     */
    const ext = this.extFromFile()
    if (!ext) {
      return WebMsgType.TEXT
    }

    /**
     * 3. A message created with local file
     */
    switch (ext.toLowerCase()) {
      case '.bmp':
      case '.jpg':
      case '.jpeg':
      case '.png':
        return WebMsgType.IMAGE

      case '.gif':
        return  WebMsgType.EMOTICON

      case '.mp4':
        return WebMsgType.VIDEO

      case '.mp3':
        return WebMsgType.VOICE
    }

    throw new Error('unknown type: ' + ext)
  }

  /**
   * Get the typeSub from the message.
   *
   * If message is a location message: `m.type() === MsgType.TEXT && m.typeSub() === MsgType.LOCATION`
   *
   * @see {@link MsgType}
   * @returns {WebMsgType}
   */
  public typeSub(): WebMsgType {
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

  // /**
  //  * Get the typeEx from the message.
  //  *
  //  * @returns {MsgType}
  //  */
  // public typeEx()  { return MsgType[this.obj.type] }

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
    const user = this.puppet.userSelf()

    if (!user) {
      return false
    }

    const selfId = user.id
    const fromId = this.from().id
    return selfId === fromId
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
   * @returns {PuppeteerContact[]} - Return message mentioned contactList
   *
   * @example
   * const contactList = message.mentioned()
   * console.log(contactList)
   */
  public mentioned(): PuppeteerContact[] {
    log.verbose('PuppeteerMessage', 'mentioned()')

    let contactList: PuppeteerContact[] = []
    const room = this.room()
    if (this.type() !== WebMsgType.TEXT || !room ) {
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
    const mentionList: string[] = [].concat.apply([], rawMentionedList)
    log.verbose('PuppeteerMessage', 'mentioned(%s),get mentionList: %s', this.text(), JSON.stringify(mentionList))

    contactList = [].concat.apply([],
      mentionList.map(nameStr => room.memberAll(nameStr))
        .filter(contact => !!contact),
    )

    if (contactList.length === 0) {
      log.warn('PuppeteerMessage', `message.mentioned() can not found member using room.member() from mentionList, metion string: ${JSON.stringify(mentionList)}`)
    }
    return contactList
  }

  /**
   * @private
   */
  public async ready(): Promise<this> {
    log.silly('PuppeteerMessage', 'ready()')

    try {
      /**
       * 1. ready from contact
       */
      const from  = PuppeteerContact.load(this.payload.from)
      from.puppet = this.puppet
      await from.ready()  // Contact from

      /**
       * 2. ready to contact
       */
      if (this.payload.to) {
        const to = PuppeteerContact.load(this.payload.to)
        to.puppet = this.puppet
        await to.ready()
      }

      /**
       * 3. ready the room
       */
      if (this.payload.room) {
        const room  = PuppeteerRoom.load(this.payload.room)
        room.puppet = this.puppet
        await room.ready()  // Room member list
      }

    } catch (e) {
      log.error('PuppeteerMessage', 'ready() exception: %s', e.stack)
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
    log.silly('PuppeteerMessage', 'readyMedia()')

    const puppet = this.puppet as PuppetPuppeteer

    try {

      let url: string | undefined
      switch (this.type()) {
        case WebMsgType.EMOTICON:
          url = await puppet.bridge.getMsgEmoticon(this.id)
          break
        case WebMsgType.IMAGE:
          url = await puppet.bridge.getMsgImg(this.id)
          break
        case WebMsgType.VIDEO:
        case WebMsgType.MICROVIDEO:
          url = await puppet.bridge.getMsgVideo(this.id)
          break
        case WebMsgType.VOICE:
          url = await puppet.bridge.getMsgVoice(this.id)
          break

        case WebMsgType.APP:
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
              log.warn('PuppeteerMessage', e.message)
              this.dumpRaw()
              throw e
          }
          break

        case WebMsgType.TEXT:
          if (this.typeSub() === WebMsgType.LOCATION) {
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
        if (!this.payload.url) {
          /**
           * not a support media message, do nothing.
           */
          return this
        }
        url = this.payload.url
      }

      this.payload.url = url

    } catch (e) {
      log.warn('PuppeteerMessage', 'ready() exception: %s', e.message)
      Raven.captureException(e)
      throw e
    }

    return this
  }

  // /**
  //  * @private
  //  */
  // public get(prop: string): string {
  //   log.warn('PuppeteerMessage', 'DEPRECATED get() at %s', new Error('stack').stack)

  //   if (!prop || !(prop in this.obj)) {
  //     const s = '[' + Object.keys(this.obj).join(',') + ']'
  //     throw new Error(`Message.get(${prop}) must be in: ${s}`)
  //   }
  //   return this.obj[prop]
  // }

  // /**
  //  * @private
  //  */
  // public set(prop: string, value: string): this {
  //   log.warn('PuppeteerMessage', 'DEPRECATED set() at %s', new Error('stack').stack)

  //   if (typeof value !== 'string') {
  //     throw new Error('value must be string, we got: ' + typeof value)
  //   }
  //   this.obj[prop] = value
  //   return this
  // }

  /**
   * @private
   */
  public dump() {
    console.error('======= dump message =======')
    Object.keys(this.payload!).forEach((k: keyof WebMsgPayload) => console.error(`${k}: ${this.payload![k]}`))
  }

  /**
   * @private
   */
  public dumpRaw() {
    console.error('======= dump raw message =======')
    if (!this.rawObj) {
      throw new Error('no this.rawObj')
    }
    Object.keys(this.rawObj).forEach((k: keyof WebMessageRawPayload) => console.error(`${k}: ${this.rawObj && this.rawObj[k]}`))
  }

  // /**
  //  * @todo add function
  //  */
  // public static async find(query: any) {
  //   return Promise.resolve(new PuppeteerMessage(<MsgRawPayload>{MsgId: '-1'}))
  // }

  /**
   * @todo add function
   */
  // public static async findAll(query: any) {
  //   return Promise.resolve([
  //     new PuppeteerMessage   (<MsgRawPayload>{MsgId: '-2'}),
  //     new PuppeteerMessage (<MsgRawPayload>{MsgId: '-3'}),
  //   ])
  // }

  // public to(room: Room): void
  // public to(): Contact|Room
  // public to(contact?: Contact|Room|string): Contact|Room|void {

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
    log.verbose('PuppeteerMessage', 'readyStream()')

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
      const cookies = await (this.puppet as any as PuppetPuppeteer).cookies()
      if (!this.payload.url) {
        throw new Error('no url')
      }
      log.verbose('PuppeteerMessage', 'readyStream() url: %s', this.payload.url)
      return Misc.urlStream(this.payload.url, cookies)
    } catch (e) {
      log.warn('PuppeteerMessage', 'readyStream() exception: %s', e.stack)
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
  public filename(): string | null {
    log.verbose('PuppeteerMessage', 'filename()')

    if (this.parsedPath) {
      // https://nodejs.org/api/path.html#path_path_parse_path
      const filename = path.join(
        this.parsedPath!.dir  || '',
        this.parsedPath!.base || '',
      )
      log.silly('PuppeteerMessage', 'filename()=%s, build from parsedPath', filename)
      return filename
    }

    if (this.rawObj) {
      let filename = this.rawObj.FileName || this.rawObj.MediaId || this.rawObj.MsgId

      const re = /\.[a-z0-9]{1,7}$/i
      if (!re.test(filename)) {
        const ext = this.rawObj.MMAppMsgFileExt || this.ext()
        filename += '.' + ext
      }

      log.silly('PuppeteerMessage', 'filename()=%s, build from rawObj', filename)
      return filename
    }

    return null

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
    const fileExt = this.extFromFile()
    if (fileExt) {
      return fileExt
    }

    const typeExt = this.extFromType()
    if (typeExt) {
      return typeExt
    }

    throw new Error('unknown ext()')
  }

  private extFromFile(): string | null {
    if (this.parsedPath && this.parsedPath.ext) {
      return this.parsedPath.ext
    }
    return null
  }

  private extFromType(): string {
    let ext: string

    const type = this.type()

    switch (type) {
      case WebMsgType.EMOTICON:
        ext = '.gif'
        break

      case WebMsgType.IMAGE:
        ext = '.jpg'
        break

      case WebMsgType.VIDEO:
      case WebMsgType.MICROVIDEO:
        ext = '.mp4'
        break

      case WebMsgType.VOICE:
        ext = '.mp3'
        break

      case WebMsgType.APP:
        switch (this.typeApp()) {
          case AppMsgType.URL:
            ext = '.url' // XXX
            break
          default:
            ext = '.' + this.type()
            break
        }
        break

      case WebMsgType.TEXT:
        if (this.typeSub() === WebMsgType.LOCATION) {
          ext = '.jpg'
        }
        ext = '.' + this.type()

        break

      default:
        log.silly('PuppeteerMessage', `ext() got unknown type: ${this.type()}`)
        ext = '.' + this.type()
    }

    return ext

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
    log.silly('PuppeteerMessage', `saveFile() filePath:'${filePath}'`)
    if (fs.existsSync(filePath)) {
      throw new Error('saveFile() file does exist!')
    }
    const writeStream = fs.createWriteStream(filePath)
    let readStream: Readable
    try {
      readStream = await this.readyStream()
    } catch (e) {
      log.error('PuppeteerMessage', `saveFile() call readyStream() error: ${e.message}`)
      throw new Error(`saveFile() call readyStream() error: ${e.message}`)
    }
    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream)
      readStream
        .once('end', resolve)
        .once('error', reject)
    })
      .catch(e => {
        log.error('PuppeteerMessage', `saveFile() error: ${e.message}`)
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
  public async forward(to: PuppeteerRoom|PuppeteerContact): Promise<void> {
    /**
     * 1. Text message
     */
    if (this.type() === WebMsgType.TEXT) {
      await to.say(this.text())
      return
    }

    /**
     * 2. Media message
     */
    try {
      await this.puppet.forward(this, to)
    } catch (e) {
      log.error('PuppeteerMessage', 'forward(%s) exception: %s', to, e)
      throw e
    }
  }

}

export default PuppeteerMessage
