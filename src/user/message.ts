/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
 *
 */
import { EventEmitter }     from 'events'
import { instanceToClass }  from 'clone-class'

import {
  MessagePayload,
  MessageQueryFilter,
  MessageType,
}                       from 'wechaty-puppet'

import { escapeRegExp }           from '../helper-functions/pure/escape-regexp'
import { timestampToDate }        from '../helper-functions/pure/timestamp-to-date'

import {
  Wechaty,
}                         from '../wechaty'
import {
  AT_SEPARATOR_REGEX,
  FileBox,

  log,
  Raven,
  looseInstanceOfFileBox,
}                         from '../config'
import {
  Sayable,
}                       from '../types'

import {
  Contact,
}                       from './contact'
import {
  Room,
}                       from './room'
import {
  UrlLink,
}                       from './url-link'
import {
  MiniProgram,
}                       from './mini-program'
import { Image }        from './image'

/**
 * All wechat messages will be encapsulated as a Message.
 *
 * [Examples/Ding-Dong-Bot]{@link https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/ding-dong-bot.ts}
 */
class Message extends EventEmitter implements Sayable {

  static get wechaty  (): Wechaty { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }
  get wechaty        (): Wechaty { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }

  /**
   *
   * Static Properties
   *
   */

  /**
   * @ignore
   */
  public static readonly Type = MessageType

  /**
   * Find message in cache
   */
  public static async find<T extends typeof Message> (
    this  : T,
    query : string | MessageQueryFilter,
  ): Promise<T['prototype'] | null> {
    log.verbose('Message', 'find(%s)', JSON.stringify(query))

    if (typeof query === 'string') {
      query = { text: query }
    }

    const messageList = await this.findAll(query)
    if (messageList.length < 1) {
      return null
    }

    if (messageList.length > 1) {
      log.warn('Message', 'findAll() got more than one(%d) result', messageList.length)
    }

    return messageList[0]
  }

  /**
   * Find messages in cache
   */
  public static async findAll<T extends typeof Message> (
    this   : T,
    query? : MessageQueryFilter,
  ): Promise<Array<T['prototype']>> {
    log.verbose('Message', 'findAll(%s)', JSON.stringify(query) || '')

    const invalidDict: { [id: string]: true } = {}

    try {
      const MessageIdList = await this.wechaty.puppet.messageSearch(query)
      const messageList = MessageIdList.map(id => this.load(id))
      await Promise.all(
        messageList.map(
          message => message.ready()
            .catch(e => {
              log.warn('Room', 'findAll() message.ready() rejection: %s', e)
              invalidDict[message.id] = true
            })
        ),
      )

      return messageList.filter(message => !invalidDict[message.id])

    } catch (e) {
      log.warn('Message', 'findAll() rejected: %s', e.message)
      console.error(e)
      Raven.captureException(e)
      return [] // fail safe
    }
  }

  /**
   * Create a Mobile Terminated Message
    * @ignore
   * @ignore
   * "mobile originated" or "mobile terminated"
   * https://www.tatango.com/resources/video-lessons/video-mo-mt-sms-messaging/
   */
  public static load (id: string): Message {
    log.verbose('Message', 'static load(%s)', id)

    /**
     * Must NOT use `Message` at here
     * MUST use `this` at here
     *
     * because the class will be `cloneClass`-ed
     */
    const msg = new this(id)

    return msg
  }

  /**
   *
   * Instance Properties
   * @hidden
   *
   */
  protected payload?: MessagePayload

  /**
   * @hideconstructor
   */
  protected constructor (
    public readonly id: string,
  ) {
    super()
    log.verbose('Message', 'constructor(%s) for class %s',
      id || '',
      this.constructor.name,
    )

    const MyClass = instanceToClass(this, Message)

    if (MyClass === Message) {
      throw new Error('Message class can not be instantiated directly! See: https://github.com/wechaty/wechaty/issues/1217')
    }

    if (!this.wechaty.puppet) {
      throw new Error('Message class can not be instantiated without a puppet!')
    }
  }

  /**
   * @ignore
   */
  public toString () {
    if (!this.payload) {
      return this.constructor.name
    }

    const msgStrList = [
      'Message',
      `#${MessageType[this.type()]}`,
      '[',
      '🗣',
      this.talker(),
      this.room()
        ? '@👥' + this.room()
        : '',
      ']',
    ]
    if (this.type() === Message.Type.Text
     || this.type() === Message.Type.Unknown
    ) {
      msgStrList.push(`\t${this.text().substr(0, 70)}`)
    } else {
      log.silly('Message', 'toString() for message type: %s(%s)', Message.Type[this.type()], this.type())

      if (!this.payload) {
        throw new Error('no payload')
      }
    }

    return msgStrList.join('')
  }

  public conversation (): Contact | Room {
    if (this.room()) {
      return this.room()!
    } else {
      return this.talker()
    }
  }

  /**
   * Get the talker of a message.
   * @returns {Contact}
   * @example
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *   const talker = msg.talker()
   *   const text = msg.text()
   *   const room = msg.room()
   *   if (room) {
   *     const topic = await room.topic()
   *     console.log(`Room: ${topic} Contact: ${talker.name()} Text: ${text}`)
   *   } else {
   *     console.log(`Contact: ${talker.name()} Text: ${text}`)
   *   }
   * })
   * .start()
   */
  public talker (): Contact {
    if (!this.payload) {
      throw new Error('no payload')
    }

    // if (contact) {
    //   this.payload.from = contact
    //   return
    // }

    const fromId = this.payload.fromId
    if (!fromId) {
      // Huan(202011): It seems that the fromId will never be null?
      // return null
      throw new Error('payload.fromId is null?')
    }

    const from = this.wechaty.Contact.load(fromId)
    return from
  }

  /**
   * Use `message.talker()` to replace `message.from()` #2094
   *  https://github.com/wechaty/wechaty/issues/2094
   */
  public from (): null | Contact {
    log.warn('Message', 'from() is deprecated, use talker() instead.')
    try {
      return this.talker()
    } catch (e) {
      return null
    }
  }

  /**
   * Get the destination of the message
   * Message.to() will return null if a message is in a room, use Message.room() to get the room.
   * @returns {(Contact|null)}
   */
  public to (): null | Contact {
    if (!this.payload) {
      throw new Error('no payload')
    }

    const toId = this.payload.toId
    if (!toId) {
      return null
    }

    const to = this.wechaty.Contact.load(toId)
    return to
  }

  /**
   * Get the room from the message.
   * If the message is not in a room, then will return `null`
   *
   * @returns {(Room | null)}
   * @example
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *   const contact = msg.from()
   *   const text = msg.text()
   *   const room = msg.room()
   *   if (room) {
   *     const topic = await room.topic()
   *     console.log(`Room: ${topic} Contact: ${contact.name()} Text: ${text}`)
   *   } else {
   *     console.log(`Contact: ${contact.name()} Text: ${text}`)
   *   }
   * })
   * .start()
   */
  public room (): null | Room {
    if (!this.payload) {
      throw new Error('no payload')
    }
    const roomId = this.payload.roomId
    if (!roomId) {
      return null
    }

    const room = this.wechaty.Room.load(roomId)
    return room
  }

  /**
   * Get the text content of the message
   *
   * @returns {string}
   * @example
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *   const contact = msg.from()
   *   const text = msg.text()
   *   const room = msg.room()
   *   if (room) {
   *     const topic = await room.topic()
   *     console.log(`Room: ${topic} Contact: ${contact.name()} Text: ${text}`)
   *   } else {
   *     console.log(`Contact: ${contact.name()} Text: ${text}`)
   *   }
   * })
   * .start()
   */
  public text (): string {
    if (!this.payload) {
      throw new Error('no payload')
    }

    return this.payload.text || ''
  }

  /**
   * Get the recalled message
   *
   * @example
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *   if (m.type() === MessageType.Recalled) {
   *     const recalledMessage = await m.toRecalled()
   *     console.log(`Message: ${recalledMessage} has been recalled.`)
   *   }
   * })
   * .start()
   */
  public async toRecalled (): Promise<Message | null> {
    if (this.type() !== MessageType.Recalled) {
      throw new Error('Can not call toRecalled() on message which is not recalled type.')
    }
    const originalMessageId = this.text()
    if (!originalMessageId) {
      throw new Error('Can not find recalled message')
    }
    try {
      const message = this.wechaty.Message.load(originalMessageId)
      await message.ready()
      return message
    } catch (e) {
      log.verbose(`Can not retrieve the recalled message with id ${originalMessageId}.`)
      return null
    }
  }

  public say (text:    string)      : Promise<void | Message>
  public say (num:     number)      : Promise<void | Message>
  public say (message: Message)     : Promise<void | Message>
  public say (contact: Contact)     : Promise<void | Message>
  public say (file:    FileBox)     : Promise<void | Message>
  public say (url:     UrlLink)     : Promise<void | Message>
  public say (mini:    MiniProgram) : Promise<void | Message>

  // Huan(202006): allow fall down to the definition to get more flexibility.
  // public say (...args: never[]): Promise<never>

  /**
   * Reply a Text or Media File message to the sender.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @see {@link https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/ding-dong-bot.ts|Examples/ding-dong-bot}
   * @param {(string | Contact | FileBox | UrlLink | MiniProgram)} textOrContactOrFile
   * send text, Contact, or file to bot. </br>
   * You can use {@link https://www.npmjs.com/package/file-box|FileBox} to send file
   * @param {(Contact|Contact[])} [mention]
   * If this is a room message, when you set mention param, you can `@` Contact in the room.
   * @returns {Promise<void | Message>}
   *
   * @example
   * import { FileBox }  from 'wechaty'
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *
   * // 1. send Image
   *
   *   if (/^ding$/i.test(m.text())) {
   *     const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
   *     await msg.say(fileBox)
   *     const message = await msg.say(fileBox) // only supported by puppet-padplus
   *   }
   *
   * // 2. send Text
   *
   *   if (/^dong$/i.test(m.text())) {
   *     await msg.say('ding')
   *     const message = await msg.say('ding') // only supported by puppet-padplus
   *   }
   *
   * // 3. send Contact
   *
   *   if (/^lijiarui$/i.test(m.text())) {
   *     const contactCard = await bot.Contact.find({name: 'lijiarui'})
   *     if (!contactCard) {
   *       console.log('not found')
   *       return
   *     }
   *     await msg.say(contactCard)
   *     const message = await msg.say(contactCard) // only supported by puppet-padplus
   *   }
   *
   * // 4. send Link
   *
   *   if (/^link$/i.test(m.text())) {
   *     const linkPayload = new UrlLink ({
   *       description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
   *       thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
   *       title       : 'Welcome to Wechaty',
   *       url         : 'https://github.com/wechaty/wechaty',
   *     })
   *     await msg.say(linkPayload)
   *     const message = await msg.say(linkPayload) // only supported by puppet-padplus
   *   }
   *
   * // 5. send MiniProgram
   *
   *   if (/^link$/i.test(m.text())) {
   *     const miniProgramPayload = new MiniProgram ({
   *       username           : 'gh_xxxxxxx',     //get from mp.weixin.qq.com
   *       appid              : '',               //optional, get from mp.weixin.qq.com
   *       title              : '',               //optional
   *       pagepath           : '',               //optional
   *       description        : '',               //optional
   *       thumbnailurl       : '',               //optional
   *     })
   *     await msg.say(miniProgramPayload)
   *     const message = await msg.say(miniProgramPayload) // only supported by puppet-padplus
   *   }
   *
   * })
   * .start()
   */
  public async say (
    something :  string
                                    | number
                                    | Message
                                    | Contact
                                    | FileBox
                                    | UrlLink
                                    | MiniProgram,
  ): Promise<void | Message> {
    log.verbose('Message', 'say(%s)', something)

    // const user = this.wechaty.puppet.userSelf()
    const talker = this.talker()
    // const to   = this.to()
    const room = this.room()

    let conversationId: string
    let conversation

    if (room) {
      conversation = room
      conversationId = room.id
    } else if (talker) {
      conversation = talker
      conversationId = talker.id
    } else {
      throw new Error('neither room nor from?')
    }

    /**
     * Support say a existing message: just forward it.
     */
    if (something instanceof Message) {
      return something.forward(conversation)
    }

    // Convert number to string
    if (typeof something === 'number') {
      something = String(something)
    }

    let msgId: void | string
    if (typeof something === 'string') {
      /**
       * Text Message
       */
      let mentionIdList
      if (talker && await this.mentionSelf()) {
        mentionIdList = [talker.id]
      }

      msgId = await this.wechaty.puppet.messageSendText(
        conversationId,
        something,
        mentionIdList,
      )
    } else if (something instanceof Contact) {
      /**
       * Contact Card
       */
      msgId = await this.wechaty.puppet.messageSendContact(
        conversationId,
        something.id,
      )
    } else if (looseInstanceOfFileBox(something)) {
      /**
       * Be aware of minified codes:
       *  https://stackoverflow.com/questions/1249531/how-to-get-a-javascript-objects-class#comment60309941_1249554
       */

      /**
       * File Message
       */
      msgId = await this.wechaty.puppet.messageSendFile(
        conversationId,
        something,
      )
    } else if (something instanceof UrlLink) {
      /**
       * Link Message
       */
      msgId = await this.wechaty.puppet.messageSendUrl(
        conversationId,
        something.payload,
      )
    } else if (something instanceof MiniProgram) {
      /**
       * MiniProgram
       */
      msgId = await this.wechaty.puppet.messageSendMiniProgram(
        conversationId,
        something.payload,
      )
    } else {
      throw new Error('Message.say() received unknown msg: ' + something)
    }
    if (msgId) {
      const msg = this.wechaty.Message.load(msgId)
      await msg.ready()
      return msg
    }
  }

  /**
   * Recall a message.
   * > Tips:
   * @returns {Promise<boolean>}
   *
   * @example
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *   const recallMessage = await msg.say('123')
   *   if (recallMessage) {
   *     const isSuccess = await recallMessage.recall()
   *   }
   * })
   */

  public async recall (): Promise<boolean> {
    log.verbose('Message', 'recall()')
    const isSuccess = await this.wechaty.puppet.messageRecall(this.id)
    return isSuccess
  }

  /**
   * Get the type from the message.
   * > Tips: MessageType is Enum here. </br>
   * - MessageType.Unknown     </br>
   * - MessageType.Attachment  </br>
   * - MessageType.Audio       </br>
   * - MessageType.Contact     </br>
   * - MessageType.Emoticon    </br>
   * - MessageType.Image       </br>
   * - MessageType.Text        </br>
   * - MessageType.Video       </br>
   * - MessageType.Url         </br>
   * @returns {MessageType}
   *
   * @example
   * const bot = new Wechaty()
   * if (message.type() === bot.Message.Type.Text) {
   *   console.log('This is a text message')
   * }
   */
  public type (): MessageType {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.type || MessageType.Unknown
  }

  /**
   * Check if a message is sent by self.
   *
   * @returns {boolean} - Return `true` for send from self, `false` for send from others.
   * @example
   * if (message.self()) {
   *  console.log('this message is sent by myself!')
   * }
   */
  public self (): boolean {
    const userId = this.wechaty.puppet.selfId()
    const talker = this.talker()

    return !!talker && talker.id === userId
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
   * @returns {Promise<Contact[]>} - Return message mentioned contactList
   *
   * @example
   * const contactList = await message.mentionList()
   * console.log(contactList)
   */
  public async mentionList (): Promise<Contact[]> {
    log.verbose('Message', 'mentionList()')

    const room = this.room()
    if (this.type() !== MessageType.Text || !room) {
      return []
    }

    /**
     * Use mention list if mention list is available
     * otherwise, process the message and get the mention list
     */
    if (this.payload && 'mentionIdList' in this.payload) {
      const idToContact = async (id: string) => {
        const contact = this.wechaty.Contact.load(id)
        await contact.ready()
        return contact
      }
      return Promise.all(this.payload.mentionIdList?.map(idToContact) ?? [])
    }

    /**
     * define magic code `8197` to identify @xxx
     * const AT_SEPARATOR = String.fromCharCode(8197)
     */
    const atList = this.text().split(AT_SEPARATOR_REGEX)
    // console.log('atList: ', atList)
    if (atList.length === 0) return []

    // Using `filter(e => e.indexOf('@') > -1)` to filter the string without `@`
    const rawMentionList = atList
      .filter(str => str.includes('@'))
      .map(str => multipleAt(str))

    // convert 'hello@a@b@c' to [ 'c', 'b@c', 'a@b@c' ]
    function multipleAt (str: string) {
      str = str.replace(/^.*?@/, '@')
      let name = ''
      const nameList: string[] = []
      str.split('@')
        .filter(mentionName => !!mentionName)
        .reverse()
        .forEach(mentionName => {
          // console.log('mentionName: ', mentionName)
          name = mentionName + '@' + name
          nameList.push(name.slice(0, -1)) // get rid of the `@` at beginning
        })
      return nameList
    }

    let mentionNameList: string[] = []
    // Flatten Array
    // see http://stackoverflow.com/a/10865042/1123955
    mentionNameList = mentionNameList.concat.apply([], rawMentionList)
    // filter blank string
    mentionNameList = mentionNameList.filter(s => !!s)

    log.verbose('Message', 'mentionList() text = "%s", mentionNameList = "%s"',
      this.text(),
      JSON.stringify(mentionNameList),
    )

    const contactListNested = await Promise.all(
      mentionNameList.map(
        name => room.memberAll(name),
      ),
    )

    let contactList: Contact[] = []
    contactList = contactList.concat.apply([], contactListNested)

    if (contactList.length === 0) {
      log.silly('Message', `message.mentionList() can not found member using room.member() from mentionList, mention string: ${JSON.stringify(mentionNameList)}`)
    }
    return contactList
  }

  public async mention (): Promise<Contact[]> {
    log.warn('Message', 'mention() DEPRECATED. use mentionList() instead.')
    return this.mentionList()
  }

  public async mentionText (): Promise<string> {
    const text = this.text()
    const room = this.room()

    const mentionList = await this.mentionList()

    if (!room || !mentionList || mentionList.length === 0) {
      return text
    }

    const toAliasName = async (member: Contact) => {
      const alias = await room.alias(member)
      const name = member.name()
      return alias || name
    }

    const mentionNameList = await Promise.all(mentionList.map(toAliasName))

    const textWithoutMention = mentionNameList.reduce((prev, cur) => {
      const escapedCur = escapeRegExp(cur)
      const regex = new RegExp(`@${escapedCur}(\u2005|\u0020|$)`)
      return prev.replace(regex, '')
    }, text)

    return textWithoutMention.trim()
  }

  /**
   * Check if a message is mention self.
   *
   * @returns {Promise<boolean>} - Return `true` for mention me.
   * @example
   * if (await message.mentionSelf()) {
   *  console.log('this message were mentioned me! [You were mentioned] tip ([有人@我]的提示)')
   * }
   */
  public async mentionSelf (): Promise<boolean> {
    const selfId = this.wechaty.puppet.selfId()
    const mentionList = await this.mentionList()
    return mentionList.some(contact => contact.id === selfId)
  }

  /**
   * @ignore
   */
  public isReady (): boolean {
    return !!this.payload
  }

  /**
   * @ignore
   */
  public async ready (): Promise<void> {
    log.verbose('Message', 'ready()')

    if (this.isReady()) {
      return
    }

    this.payload = await this.wechaty.puppet.messagePayload(this.id)

    if (!this.payload) {
      throw new Error('no payload')
    }

    const fromId = this.payload.fromId
    const roomId = this.payload.roomId
    const toId   = this.payload.toId

    if (roomId) {
      await this.wechaty.Room.load(roomId).ready()
    }
    if (fromId) {
      await this.wechaty.Contact.load(fromId).ready()
    }
    if (toId) {
      await this.wechaty.Contact.load(toId).ready()
    }
  }

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

  /**
   * Forward the received message.
   *
   * @param {(Sayable | Sayable[])} to Room or Contact
   * The recipient of the message, the room, or the contact
   * @returns {Promise<void>}
   * @example
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *   const room = await bot.Room.find({topic: 'wechaty'})
   *   if (room) {
   *     await m.forward(room)
   *     console.log('forward this message to wechaty room!')
   *   }
   * })
   * .start()
   */
  public async forward (to: Room | Contact): Promise<void | Message> {
    log.verbose('Message', 'forward(%s)', to)

    // let roomId
    // let contactId

    try {
      const msgId = await this.wechaty.puppet.messageForward(
        to.id,
        this.id,
      )
      if (msgId) {
        const msg = this.wechaty.Message.load(msgId)
        await msg.ready()
        return msg
      }
    } catch (e) {
      log.error('Message', 'forward(%s) exception: %s', to, e)
      throw e
    }
  }

  /**
   * Message sent date
   */
  public date (): Date {
    if (!this.payload) {
      throw new Error('no payload')
    }

    const timestamp = this.payload.timestamp
    return timestampToDate(timestamp)
  }

  /**
   * Returns the message age in seconds. <br>
   *
   * For example, the message is sent at time `8:43:01`,
   * and when we received it in Wechaty, the time is `8:43:15`,
   * then the age() will return `8:43:15 - 8:43:01 = 14 (seconds)`
   *
   * @returns {number} message age in seconds.
   */
  public age (): number {
    const ageMilliseconds = Date.now() - this.date().getTime()
    const ageSeconds = Math.floor(ageMilliseconds / 1000)
    return ageSeconds
  }

  /**
   * Extract the Media File from the Message, and put it into the FileBox.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @returns {Promise<FileBox>}
   *
   * @example <caption>Save media file from a message</caption>
   * const fileBox = await message.toFileBox()
   * const fileName = fileBox.name
   * fileBox.toFile(fileName)
   */
  public async toFileBox (): Promise<FileBox> {
    log.verbose('Message', 'toFileBox()')
    if (this.type() === Message.Type.Text) {
      throw new Error('text message no file')
    }
    const fileBox = await this.wechaty.puppet.messageFile(this.id)
    return fileBox
  }

  /**
   * Extract the Image File from the Message, so that we can use different image sizes.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @returns {Image}
   *
   * @example <caption>Save image file from a message</caption>
   * const image = message.toImage()
   * const fileBox = await image.artwork()
   * const fileName = fileBox.name
   * fileBox.toFile(fileName)
   */
  public toImage (): Image {
    log.verbose('Message', 'toImage() for message id: %s', this.id)
    if (this.type() !== Message.Type.Image) {
      throw new Error(`not a image type message. type: ${this.type()}`)
    }
    return this.wechaty.Image.create(this.id)
  }

  /**
   * Get Share Card of the Message
   * Extract the Contact Card from the Message, and encapsulate it into Contact class
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   * @returns {Promise<Contact>}
   */
  public async toContact (): Promise<Contact> {
    log.verbose('Message', 'toContact()')

    if (this.type() !== Message.Type.Contact) {
      throw new Error('message not a ShareCard')
    }

    const contactId = await this.wechaty.puppet.messageContact(this.id)

    if (!contactId) {
      throw new Error(`can not get Contact id by message: ${contactId}`)
    }

    const contact = this.wechaty.Contact.load(contactId)
    await contact.ready()
    return contact
  }

  public async toUrlLink (): Promise<UrlLink> {
    log.verbose('Message', 'toUrlLink()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.type() !== Message.Type.Url) {
      throw new Error('message not a Url Link')
    }

    const urlPayload = await this.wechaty.puppet.messageUrl(this.id)

    if (!urlPayload) {
      throw new Error(`no url payload for message ${this.id}`)
    }

    return new UrlLink(urlPayload)
  }

  public async toMiniProgram (): Promise<MiniProgram> {
    log.verbose('Message', 'toMiniProgram()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.type() !== Message.Type.MiniProgram) {
      throw new Error('message not a MiniProgram')
    }

    const miniProgramPayload = await this.wechaty.puppet.messageMiniProgram(this.id)

    if (!miniProgramPayload) {
      throw new Error(`no miniProgram payload for message ${this.id}`)
    }

    return new MiniProgram(miniProgramPayload)
  }

}

function wechatifyMessage (wechaty: Wechaty): typeof Message {

  class WechatifiedMessage extends Message {

    static get wechaty  () { return wechaty }
    get wechaty        () { return wechaty }

  }

  return WechatifiedMessage

}

export {
  Message,
  wechatifyMessage,
}
