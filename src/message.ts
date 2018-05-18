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
import * as path from 'path'
import * as cuid from 'cuid'

import {
  FileBox,
}             from 'file-box'

import {
  log,
  Sayable,
}                       from './config'
import PuppetAccessory  from './puppet-accessory'

import Contact          from './contact'
import Room             from './room'

import {
  MessageDirection,
  MessageMOOptions,
  MessageMOOptionsText,
  MessageMOOptionsFile,
  MessagePayload,
  MessageType,
}                       from './message.type'

/**
 * All wechat messages will be encapsulated as a Message.
 *
 * `Message` is `Sayable`,
 * [Examples/Ding-Dong-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts}
 */
export class Message extends PuppetAccessory implements Sayable {

  /**
   *
   * Static Properties
   *
   */

  // tslint:disable-next-line:variable-name
  public static readonly Type = MessageType

  /**
   * @todo add function
   */
  public static async find<T extends typeof Message>(
    this: T,
    query: any,
  ): Promise<T['prototype'] | null> {
    return (await this.findAll(query))[0]
  }

  /**
   * @todo add function
   */
  public static async findAll<T extends typeof Message>(
    this: T,
    query: any,
  ): Promise<T['prototype'][]> {
    log.verbose('Message', 'findAll(%s)', query)
    return [
      new (this as any)({ MsgId: 'id1' }),
      new (this as any)({ MsdId: 'id2' }),
    ]
  }

  public static create(options: MessageMOOptions): Message {
    return this.createMO(options)
  }

  /**
   * "mobile originated" or "mobile terminated"
   * https://www.tatango.com/resources/video-lessons/video-mo-mt-sms-messaging/
   */
  public static createMO(
    options: MessageMOOptions,
  ): Message {
    log.verbose('Message', 'static createMobileOriginated()',
                )
    const msg = new Message(cuid())

    const direction = MessageDirection.MO
    const to        = options.to
    const room      = options.room
    const text      = (options as MessageMOOptionsText).text
    const date      = new Date()
    const file      = (options as MessageMOOptionsFile).file

    if (text) {
      /**
       * 1. Text
       */
      msg.payload = {
        type: MessageType.Text,
        direction,
        to,
        room,
        text,
        date,
      }
    } else if (file) {
      /**
       * 2. File
       */
      let type: MessageType

      const ext = path.extname(file.name)

      switch (ext.toLowerCase()) {
        case '.bmp':
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif': // type =  WebMsgType.EMOTICON
          type = MessageType.Image
          break

        case '.mp4':
          type = MessageType.Video
          break

        case '.mp3':
          type = MessageType.Audio
          break

        default:
          throw new Error('unknown ext:' + ext)
      }

      msg.payload = {
        type,
        direction,
        to,
        room,
        file,
        date,
      }
    } else {
      throw new Error('neither text nor file!?')
    }

    return msg
  }

  public static createMT(
    id: string,
  ): Message {
    log.verbose('Message', 'static createMobileTerminated(%s)',
                            id,
                )
    const msg = new Message(id)
    msg.direction = MessageDirection.MT

    return msg
  }

  /**
   *
   * Instance Properties
   *
   */
  private payload?  : MessagePayload
  private direction : MessageDirection

  /**
   * @private
   */
  constructor(
    public readonly id: string,
  ) {
    super()
    log.silly('Message', 'constructor(%s) for class %s',
                          id || '',
                          this.constructor.name,
              )
    super()
    log.silly('Message', 'constructor()')
}

  /**
   * @private
   */
  public toString() {
    const msgStrList = [
      'Message',
      `#${MessageDirection[this.direction]}`,
      `#${MessageType[this.type()]}`,
    ]
    if (this.type() === Message.Type.Text) {
      msgStrList.push(`<${this.text()}>`)
    } else {
      if (!this.payload) {
        throw new Error('no payload')
      }
      const file = this.payload.file
      if (!file) {
        throw new Error('no file')
      }
      msgStrList.push(`<${file.name}>`)
    }

    return msgStrList.join('')
  }

  // /**
  //  * @private
  //  */
  // public from(contact: Contact): void
  // /**
  //  * @private
  //  */
  // public from(): Contact
  // /**
  //  * Get the sender from a message.
  //  * @returns {Contact}
  //  */
  // public from(contact?: Contact): void | Contact {
  public from(): Contact {
    if (!this.payload) {
      throw new Error('no payload')
    }

    // if (contact) {
    //   this.payload.from = contact
    //   return
    // }

    const from = this.payload.from
    if (!from) {
      throw new Error('no from')
    }

    return from
  }

  // /**
  //  * @private
  //  */
  // public to(contact: Contact): void
  // /**
  //  * @private
  //  */
  // public to(): Contact | null // if to is not set, then room must had set
  // /**
  //  * Get the destination of the message
  //  * Message.to() will return null if a message is in a room, use Message.room() to get the room.
  //  * @returns {(Contact|null)}
  //  */
  // public to(contact?: Contact): void | null | Contact {
  public to(): null | Contact {
    if (!this.payload) {
      throw new Error('no payload')
    }

    // if (contact) {
    //   this.payload.to = contact
    //   return
    // }

    return this.payload.to || null
  }

  // /**
  //  * @private
  //  */
  // public room(room: Room): void
  // /**
  //  * @private
  //  */
  // public room(): Room | null
  // /**
  //  * Get the room from the message.
  //  * If the message is not in a room, then will return `null`
  //  *
  //  * @returns {(Room | null)}
  //  */
  // public room(room?: Room): void | null | Room {
  public room(): null | Room {
    if (!this.payload) {
      throw new Error('no payload')
    }

    // if (room) {
    //   this.payload.room = room
    //   return
    // }

    return this.payload.room || null
  }

  // /**
  //  * Get the text of the message
  //  *
  //  * @deprecated: use `text()` instead
  //  * @returns {string}
  //  */
  // public content(text?: string): void | string {
  //   log.warn('Message', 'content() Deprecated. Use `text()` instead of `content()`. See https://github.com/Chatie/wechaty/issues/1163')
  //   return this.text(text!)
  // }

  // /**
  //  * Get the text content of the message
  //  *
  //  * @returns {string}
  //  */
  // public text(): string
  // /**
  //  * @private
  //  */
  // public text(text: string): void
  // /**
  //  * Get the text content of the message
  //  *
  //  * @returns {string}
  //  */
  // public text(text?: string): void | string {
  public text(): string {
    if (!this.payload) {
      throw new Error('no payload')
    }

    // if (text) {
    //   this.payload.text = text
    //   return
    // }

    return this.payload.text || ''
  }

  public async say(text: string, mention?: Contact | Contact[]): Promise<void>
  public async say(file: FileBox): Promise<void>

  /**
   * Reply a Text or Media File message to the sender.
   *
   * @see {@link https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts|Examples/ding-dong-bot}
   * @param {(string | FileBox)} textOrFile
   * @param {(Contact|Contact[])} [mention]
   * @returns {Promise<void>}
   *
   * @example
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *   if (/^ding$/i.test(m.text())) {
   *     await m.say('hello world')
   *     console.log('Bot REPLY: hello world')
   *     await m.say(new bot.Message(__dirname + '/wechaty.png'))
   *     console.log('Bot REPLY: Image')
   *   }
   * })
   */
  public async say(
    textOrFile : string | FileBox,
    mention?   : Contact | Contact[],
  ): Promise<void> {
    log.verbose('Message', 'say(%s, %s)', textOrFile, mention)

    // const user = this.puppet.userSelf()
    const from = this.from()
    // const to   = this.to()
    const room = this.room()

    const mentionList = mention
                          ? Array.isArray(mention)
                            ? mention
                            : [mention]
                          : []

    if (typeof textOrFile === 'string') {
      await this.sayText(textOrFile, from, room, mentionList)
    } else {
      /**
       * File Message
       */
      const msg = Message.createMO({
        file : textOrFile,
        to   : from,
        room,
      })
      await this.puppet.messageSend(msg)
    }
  }

  private async sayText(
    text        : string,
    to          : Contact,
    room        : Room | null,
    mentionList : Contact[],
  ): Promise<void> {
    let msg: Message

    if (!room) {
      /**
       * 1. to Individual
       */
      msg = Message.createMO({
        to,
        text,
      })
    } else {
      /**
       * 2. in Room
       */
      if (mentionList.length > 0) {
        /**
         * 2.1 had mentioned someone
         */
        const mentionContact = mentionList[0]
        const textMentionList = mentionList.map(c => '@' + c.name()).join(' ')
        msg = Message.createMO({
          to: mentionContact,
          room,
          text: textMentionList + ' ' + text,
        })
      } else {
        /**
         * 2.2 did not mention anyone
         */
        msg = Message.createMO({
          to,
          room,
          text,
        })
      }
    }
    msg.puppet = this.puppet
    await this.puppet.messageSend(msg)
  }

  public file(): FileBox {
    if (!this.payload) {
      throw new Error('no payload')
    }
    const file = this.payload.file
    if (!file) {
      throw new Error('no file')
    }
    return file
  }

  /**
   * Get the type from the message.
   *
   * If type is equal to `MsgType.RECALLED`, {@link Message#id} is the msgId of the recalled message.
   * @see {@link MsgType}
   * @returns {WebMsgType}
   */
  public type(): MessageType {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.type || MessageType.Unknown
  }

  // public typeBak(): MessageType {
  //   log.silly('Message', 'type() = %s', WebMsgType[this.payload.type])

  //   /**
  //    * 1. A message created with rawObj
  //    */
  //   if (this.payload.type) {
  //     return this.payload.type
  //   }

  //   /**
  //    * 2. A message created with TEXT
  //    */
  //   const ext = this.extFromFile()
  //   if (!ext) {
  //     return WebMsgType.TEXT
  //   }

  //   /**
  //    * 3. A message created with local file
  //    */
  //   switch (ext.toLowerCase()) {
  //     case '.bmp':
  //     case '.jpg':
  //     case '.jpeg':
  //     case '.png':
  //       return WebMsgType.IMAGE

  //     case '.gif':
  //       return  WebMsgType.EMOTICON

  //     case '.mp4':
  //       return WebMsgType.VIDEO

  //     case '.mp3':
  //       return WebMsgType.VOICE
  //   }

  //   throw new Error('unknown type: ' + ext)
  // }

  // /**
  //  * Get the typeSub from the message.
  //  *
  //  * If message is a location message: `m.type() === MsgType.TEXT && m.typeSub() === MsgType.LOCATION`
  //  *
  //  * @see {@link MsgType}
  //  * @returns {WebMsgType}
  //  */
  // public abstract typeSub(): WebMsgType

  // /**
  //  * Get the typeApp from the message.
  //  *
  //  * @returns {WebAppMsgType}
  //  * @see {@link AppMsgType}
  //  */
  // public abstract typeApp(): WebAppMsgType

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
    const from = this.from()

    return from.id === user.id
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
    log.verbose('Message', 'mentioned()')

    let contactList: Contact[] = []
    const room = this.room()
    if (this.type() !== MessageType.Text || !room ) {
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
    log.verbose('Message', 'mentioned(%s),get mentionList: %s', this.text(), JSON.stringify(mentionList))

    contactList = [].concat.apply([],
      mentionList.map(nameStr => room.memberAll(nameStr))
        .filter(contact => !!contact),
    )

    if (contactList.length === 0) {
      log.warn('Message', `message.mentioned() can not found member using room.member() from mentionList, metion string: ${JSON.stringify(mentionList)}`)
    }
    return contactList
  }

  /**
   * @private
   */
  public isReady(): boolean {
    return !!this.payload
  }

  /**
   * @private
   */
  public async ready(): Promise<void> {
    log.verbose('Message', 'ready()')

    if (this.direction !== MessageDirection.MT) {
      throw new Error('only Mobile Terminated message is permit to call ready()!')
    }

    if (this.isReady()) {
      return
    }

    this.payload = await this.puppet.messagePayload(this.id)

    // TODO ... the rest
  }

  // public async readyMedia(): Promise<this> {
  //   log.silly('PuppeteerMessage', 'readyMedia()')

  //   const puppet = this.puppet

  //   try {

  //     let url: string | undefined
  //     switch (this.type()) {
  //       case WebMsgType.EMOTICON:
  //         url = await puppet.bridge.getMsgEmoticon(this.id)
  //         break
  //       case WebMsgType.IMAGE:
  //         url = await puppet.bridge.getMsgImg(this.id)
  //         break
  //       case WebMsgType.VIDEO:
  //       case WebMsgType.MICROVIDEO:
  //         url = await puppet.bridge.getMsgVideo(this.id)
  //         break
  //       case WebMsgType.VOICE:
  //         url = await puppet.bridge.getMsgVoice(this.id)
  //         break

  //       case WebMsgType.APP:
  //         if (!this.rawObj) {
  //           throw new Error('no rawObj')
  //         }
  //         switch (this.typeApp()) {
  //           case WebAppMsgType.ATTACH:
  //             if (!this.rawObj.MMAppMsgDownloadUrl) {
  //               throw new Error('no MMAppMsgDownloadUrl')
  //             }
  //             // had set in Message
  //             // url = this.rawObj.MMAppMsgDownloadUrl
  //             break

  //           case WebAppMsgType.URL:
  //           case WebAppMsgType.READER_TYPE:
  //             if (!this.rawObj.Url) {
  //               throw new Error('no Url')
  //             }
  //             // had set in Message
  //             // url = this.rawObj.Url
  //             break

  //           default:
  //             const e = new Error('ready() unsupported typeApp(): ' + this.typeApp())
  //             log.warn('PuppeteerMessage', e.message)
  //             throw e
  //         }
  //         break

  //       case WebMsgType.TEXT:
  //         if (this.typeSub() === WebMsgType.LOCATION) {
  //           url = await puppet.bridge.getMsgPublicLinkImg(this.id)
  //         }
  //         break

  //       default:
  //         /**
  //          * not a support media message, do nothing.
  //          */
  //         return this
  //     }

  //     if (!url) {
  //       if (!this.payload.url) {
  //         /**
  //          * not a support media message, do nothing.
  //          */
  //         return this
  //       }
  //       url = this.payload.url
  //     }

  //     this.payload.url = url

  //   } catch (e) {
  //     log.warn('PuppeteerMessage', 'ready() exception: %s', e.message)
  //     Raven.captureException(e)
  //     throw e
  //   }

  //   return this
  // }

  /**
   * Get the read stream for attachment file
   */
  // public abstract async readyStream(): Promise<Readable>

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
  public async forward(to: Room | Contact): Promise<void> {
    log.verbose('Message', 'forward(%s)', to)

    try {
      await this.puppet.messageForward(this, to)
    } catch (e) {
      log.error('Message', 'forward(%s) exception: %s', to, e)
      throw e
    }
  }
}

export {
  MessageDirection,
  MessagePayload,
  MessageType,
}
export default Message
