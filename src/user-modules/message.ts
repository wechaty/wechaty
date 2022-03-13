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
import { EventEmitter }   from 'events'
import * as PUPPET        from 'wechaty-puppet'
import type {
  FileBoxInterface,
}                         from 'file-box'

import type { Constructor } from 'clone-class'

import { escapeRegExp }           from '../pure-functions/escape-regexp.js'
import { timestampToDate }        from '../pure-functions/timestamp-to-date.js'

import {
  log,
  AT_SEPARATOR_REGEX,
}                         from '../config.js'
import type {
  SayableSayer,
  Sayable,
}                             from '../sayable/mod.js'
import {
  messageToSayable,
}                             from '../sayable/mod.js'

import {
  wechatifyMixin,
}                       from '../user-mixins/wechatify.js'

import type {
  ContactInterface,
  ContactImpl,
}                       from './contact.js'
import type {
  RoomInterface,
  RoomImpl,
}                       from './room.js'
import type {
  UrlLinkInterface,
}                       from './url-link.js'
import type {
  MiniProgramInterface,
}                       from './mini-program.js'
import type {
  ImageInterface,
}                       from './image.js'
import {
  PostInterface,
  PostImpl,
}                       from './post.js'
import {
  LocationInterface,
  LocationImpl,
}                       from './location.js'

import { validationMixin } from '../user-mixins/validation.js'
import type { ContactSelfImpl } from './contact-self.js'

const MixinBase = wechatifyMixin(
  EventEmitter,
)

/**
 * All wechat messages will be encapsulated as a Message.
 *
 * [Examples/Ding-Dong-Bot]{@link https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/ding-dong-bot.ts}
 */
class MessageMixin extends MixinBase implements SayableSayer {

  /**
   *
   * Static Properties
   *
   */

  /**
   * @ignore
   */
  static readonly Type = PUPPET.types.Message

  /**
   * Find message in cache
   */
  static async find (
    query : string | PUPPET.filters.Message,
  ): Promise<undefined | MessageInterface> {
    log.verbose('Message', 'find(%s)', JSON.stringify(query))

    if (typeof query === 'string') {
      query = { text: query }
    }

    const messageList = await this.findAll(query)
    if (messageList.length < 1) {
      return undefined
    }

    if (messageList.length > 1) {
      log.warn('Message', 'findAll() got more than one(%d) result', messageList.length)
    }

    return messageList[0]!
  }

  /**
   * Find messages in cache
   */
  static async findAll (
    query? : PUPPET.filters.Message,
  ): Promise<MessageInterface[]> {
    log.verbose('Message', 'findAll(%s)', JSON.stringify(query) || '')

    // Huan(202111): { id } query has been optimized in the PuppetAbstract class

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
            }),
        ),
      )

      return messageList.filter(message => !invalidDict[message.id])

    } catch (e) {
      this.wechaty.emitError(e)
      log.warn('Message', 'findAll() rejected: %s', (e as Error).message)
      return [] // fail safe
    }
  }

  /**
   * Create a Mobile Terminated Message
   * @ignore
   * "mobile originated" or "mobile terminated"
   * https://www.tatango.com/resources/video-lessons/video-mo-mt-sms-messaging/
   */
  static load (id: string): MessageImplInterface {
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
  payload?: PUPPET.payloads.Message

  /**
   * @hideconstructor
   */
  constructor (
    public readonly id: string,
  ) {
    super()
    log.verbose('Message', 'constructor(%s) for class %s',
      id || '',
      this.constructor.name,
    )
  }

  /**
   * @ignore
   */
  override toString () {
    if (!this.payload) {
      return this.constructor.name
    }

    let talker
    try {
      talker = this.talker()
    } catch (e) {
      talker = (e as Error).message
    }

    const msgStrList = [
      'Message',
      `#${PUPPET.types.Message[this.type()]}`,
      '[',
      '🗣',
      talker,
      this.room()
        ? '@👥' + this.room()
        : '',
      ']',
    ]

    if (this.type() === PUPPET.types.Message.Text
     || this.type() === PUPPET.types.Message.Unknown
    ) {
      msgStrList.push(`\t${this.text().substr(0, 70)}`)
    } else {
      log.silly('Message', 'toString() for message type: %s(%s)', PUPPET.types.Message[this.type()], this.type())
      // if (!this.#payload) {
      //   throw new Error('no payload')
      // }
    }

    return msgStrList.join('')
  }

  conversation (): ContactInterface | RoomInterface {
    if (this.room()) {
      return this.room()!
    } else {
      return this.talker()
    }
  }

  /**
   * Get the talker of a message.
   * @returns {ContactInterface}
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
  talker (): ContactInterface {
    if (!this.payload) {
      throw new Error('no payload')
    }

    let talkerId = this.payload.talkerId
    if (!talkerId) {
      /**
       * `fromId` is deprecated, this code block will be removed in v2.0
       */
      if (this.payload.fromId) {
        talkerId = this.payload.fromId
      } else {
        throw new Error('no talkerId found for talker')
      }

      log.warn('Message', 'talker() payload.talkerId not exist! See: https://github.com/wechaty/puppet/issues/187')
      console.error('Puppet: %s@%s', this.wechaty.puppet.name(), this.wechaty.puppet.version())
      console.error(new Error().stack)
    }

    let talker
    if (this.wechaty.isLoggedIn && talkerId === this.wechaty.puppet.currentUserId) {
      talker = (this.wechaty.ContactSelf as typeof ContactSelfImpl).load(talkerId)
    } else {
      talker = (this.wechaty.Contact as typeof ContactImpl).load(talkerId)
    }
    return talker
  }

  /**
   * @depreacated Use `message.talker()` to replace `message.from()`
   *  https://github.com/wechaty/wechaty/issues/2094
   */
  from (): undefined | ContactInterface {
    log.warn('Message', 'from() is deprecated, use talker() instead. Call stack: %s',
      new Error().stack,
    )
    try {
      return this.talker()
    } catch (e) {
      this.wechaty.emitError(e)
      return undefined
    }
  }

  /**
   * Get the destination of the message
   * Message.to() will return null if a message is in a room, use Message.room() to get the room.
   * @returns {(ContactInterface|null)}
   * @deprecated use `listener()` instead
   */
  to (): undefined | ContactInterface {
    // Huan(202108): I want to deprecate this method name in the future,
    //  and use `message.listener()` to replace it.
    return this.listener()
  }

  /**
   * Get the destination of the message
   * Message.listener() will return null if a message is in a room,
   * use Message.room() to get the room.
   * @returns {(undefined | ContactInterface)}
   */
  listener (): undefined | ContactInterface {
    if (!this.payload) {
      throw new Error('no payload')
    }

    let listenerId = this.payload.listenerId

    if (!listenerId && this.payload.toId) {
      /**
       * `toId` is deprecated, this code block will be removed in v2.0
       */
      listenerId = this.payload.toId

      log.warn('Message', 'listener() payload.listenerId should be set! See: https://github.com/wechaty/puppet/issues/187')
      console.error('Puppet: %s@%s', this.wechaty.puppet.name(), this.wechaty.puppet.version())
      console.error(new Error().stack)
    }

    if (!listenerId) {
      return undefined
    }

    let listener
    if (listenerId === this.wechaty.puppet.currentUserId) {
      listener = (this.wechaty.ContactSelf as typeof ContactSelfImpl).load(listenerId)
    } else {
      listener = (this.wechaty.Contact as typeof ContactImpl).load(listenerId)
    }
    return listener
  }

  /**
   * Get the room from the message.
   * If the message is not in a room, then will return `null`
   *
   * @returns {(RoomInterface | null)}
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
  room (): undefined | RoomInterface {
    if (!this.payload) {
      throw new Error('no payload')
    }
    const roomId = this.payload.roomId
    if (!roomId) {
      return undefined
    }

    const room = (this.wechaty.Room as typeof RoomImpl).load(roomId)
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
  text (): string {
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
   *   if (m.type() === PUPPET.types.Message.Recalled) {
   *     const recalledMessage = await m.toRecalled()
   *     console.log(`Message: ${recalledMessage} has been recalled.`)
   *   }
   * })
   * .start()
   */
  async toRecalled (): Promise<undefined | MessageInterface> {
    if (this.type() !== PUPPET.types.Message.Recalled) {
      throw new Error('Can not call toRecalled() on message which is not recalled type.')
    }
    const originalMessageId = this.text()
    if (!originalMessageId) {
      throw new Error('Can not find recalled message')
    }
    try {
      const message = await this.wechaty.Message.find({ id: originalMessageId })
      if (message) {
        return message
      }

    } catch (e) {
      this.wechaty.emitError(e)
      log.verbose(`Can not retrieve the recalled message with id ${originalMessageId}.`)
    }
    return undefined
  }

  /**
   * Reply a Text or Media File message to the sender.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @see {@link https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/ding-dong-bot.ts|Examples/ding-dong-bot}
   * @param {(string | ContactInterface | FileBox | UrlLinkInterface | MiniProgramInterface | LocationInterface)} textOrContactOrFile
   * send text, Contact, or file to bot. </br>
   * You can use {@link https://www.npmjs.com/package/file-box|FileBox} to send file
   * @param {(ContactInterface|ContactInterface[])} [mention]
   * If this is a room message, when you set mention param, you can `@` Contact in the room.
   * @returns {Promise<void | MessageInterface>}
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
   *   if (/^miniProgram$/i.test(m.text())) {
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
   * // 6. send Location
   *   if (/^location$/i.test(m.text())) {
   *     const location = new Location ({
   *       accuracy  : 15,
   *       address   : '北京市北京市海淀区45 Chengfu Rd',
   *       latitude  : 39.995120999999997,
   *       longitude : 116.334154,
   *       name      : '东升乡人民政府(海淀区成府路45号)',
   *     })
   *     await contact.say(location)
   *     const msg = await msg.say(location)
   *   }
   * })
   * .start()
   */
  async say (
    sayable: Sayable,
  ): Promise<void | MessageInterface> {
    log.verbose('Message', 'say(%s)', sayable)

    const talker  = this.talker()
    const room    = this.room()

    if (room) {
      return room.say(sayable)
    } else {
      return talker.say(sayable)
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

  async recall (): Promise<boolean> {
    log.verbose('Message', 'recall()')
    const isSuccess = await this.wechaty.puppet.messageRecall(this.id)
    return isSuccess
  }

  /**
   * Get the type from the message.
   * > Tips: PUPPET.types.Message is Enum here. </br>
   * - PUPPET.types.Message.Unknown     </br>
   * - PUPPET.types.Message.Attachment  </br>
   * - PUPPET.types.Message.Audio       </br>
   * - PUPPET.types.Message.Contact     </br>
   * - PUPPET.types.Message.Emoticon    </br>
   * - PUPPET.types.Message.Image       </br>
   * - PUPPET.types.Message.Text        </br>
   * - PUPPET.types.Message.Video       </br>
   * - PUPPET.types.Message.Url         </br>
   * @returns {PUPPET.types.Message}
   *
   * @example
   * const bot = new Wechaty()
   * if (message.type() === bot.Message.Type.Text) {
   *   console.log('This is a text message')
   * }
   */
  type (): PUPPET.types.Message {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.type || PUPPET.types.Message.Unknown
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
  self (): boolean {
    try {
      const talker = this.talker()

      return talker.id === this.wechaty.puppet.currentUserId
    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Message', 'self() rejection: %s', (e as Error).message)
      return false
    }
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
   * @returns {Promise<ContactInterface[]>} - Return message mentioned contactList
   *
   * @example
   * const contactList = await message.mentionList()
   * console.log(contactList)
   */
  async mentionList (): Promise<ContactInterface[]> {
    log.verbose('Message', 'mentionList()')

    const room = this.room()
    if (this.type() !== PUPPET.types.Message.Text || !room) {
      return []
    }

    /**
     * 1. Use mention list if mention list is available
     */
    if (this.payload
        && 'mentionIdList' in this.payload
        && Array.isArray(this.payload.mentionIdList)
    ) {
      const idToContact = (id: string) => this.wechaty.Contact.find({ id })
      const allContact = await Promise.all(
        this.payload.mentionIdList
          .map(idToContact),
      )
      // remove `undefined` types because we use a `filter(Boolean)`
      return allContact.filter(Boolean) as ContactInterface[]
    }

    /**
     * 2. Otherwise, process the message and get the mention list
     */

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

    let contactList: ContactInterface[] = []
    contactList = contactList.concat.apply([], contactListNested)

    if (contactList.length === 0) {
      log.silly('Message', `message.mentionList() can not found member using room.member() from mentionList, mention string: ${JSON.stringify(mentionNameList)}`)
    }
    return contactList
  }

  /**
   * @deprecated mention() DEPRECATED. use mentionList() instead.
   */
  async mention (): Promise<ContactInterface[]> {
    log.warn('Message', 'mention() DEPRECATED. use mentionList() instead. Call stack: %s',
      new Error().stack,
    )
    return this.mentionList()
  }

  async mentionText (): Promise<string> {
    const text = this.text()
    const room = this.room()

    const mentionList = await this.mentionList()

    if (!room || mentionList.length === 0) {
      return text
    }

    const toAliasName = async (member: ContactInterface) => {
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
  async mentionSelf (): Promise<boolean> {
    const currentUserId = this.wechaty.puppet.currentUserId
    const mentionList = await this.mentionList()
    return mentionList.some(contact => contact.id === currentUserId)
  }

  /**
   * @ignore
   */
  isReady (): boolean {
    return !!this.payload
  }

  /**
   * @ignore
   */
  async ready (): Promise<void> {
    log.verbose('Message', 'ready()')

    if (this.isReady()) {
      return
    }

    this.payload = await this.wechaty.puppet.messagePayload(this.id)

    let talkerId = this.payload.talkerId
    if (!talkerId) {
      /**
       * `fromId` is deprecated: this code block will be removed in v2.0
       */
      if (this.payload.fromId) {
        talkerId = this.payload.fromId
      } else {
        throw new Error('no talkerId found for talker')
      }

      log.warn('Message', 'ready() payload.talkerId not exist! See: https://github.com/wechaty/puppet/issues/187')
      console.error('Puppet: %s@%s', this.wechaty.puppet.name(), this.wechaty.puppet.version())
      console.error(new Error().stack)
    }

    const roomId = this.payload.roomId

    let listenerId = this.payload.listenerId
    if (!listenerId && this.payload.toId) {
      /**
       * `fromId` is deprecated: this code block will be removed in v2.0
       */
      listenerId = this.payload.toId

      log.warn('Message', 'ready() payload.listenerId should be set! See: https://github.com/wechaty/puppet/issues/187')
      console.error('Puppet: %s@%s', this.wechaty.puppet.name(), this.wechaty.puppet.version())
      console.error(new Error().stack)
    }

    if (roomId) {
      await this.wechaty.Room.find({ id: roomId })
    }
    if (talkerId) {
      await this.wechaty.Contact.find({ id: talkerId })
    }
    if (listenerId) {
      await this.wechaty.Contact.find({ id: listenerId })
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
  async forward (to: RoomInterface | ContactInterface): Promise<void | MessageInterface> {
    log.verbose('Message', 'forward(%s)', to)

    // let roomId
    // let contactId

    try {
      const msgId = await this.wechaty.puppet.messageForward(
        to.id,
        this.id,
      )
      if (msgId) {
        const msg = await this.wechaty.Message.find({ id: msgId })
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
  date (): Date {
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
  age (): number {
    const ageMilliseconds = Date.now() - this.date().getTime()
    const ageSeconds = Math.floor(ageMilliseconds / 1000)
    return ageSeconds
  }

  /**
   * Extract the Media File from the Message, and put it into the FileBox.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @returns {Promise<FileBoxInterface>}
   *
   * @example <caption>Save media file from a message</caption>
   * const fileBox = await message.toFileBox()
   * const fileName = fileBox.name
   * fileBox.toFile(fileName)
   */
  async toFileBox (): Promise<FileBoxInterface> {
    log.verbose('Message', 'toFileBox()')
    if (this.type() === PUPPET.types.Message.Text) {
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
   * @returns {ImageInterface}
   *
   * @example <caption>Save image file from a message</caption>
   * const image = message.toImage()
   * const fileBox = await image.artwork()
   * const fileName = fileBox.name
   * fileBox.toFile(fileName)
   */
  toImage (): ImageInterface {
    log.verbose('Message', 'toImage() for message id: %s', this.id)
    if (this.type() !== PUPPET.types.Message.Image) {
      throw new Error(`not a image type message. type: ${this.type()}`)
    }
    return this.wechaty.Image.create(this.id)
  }

  /**
   * Get Share Card of the Message
   * Extract the Contact Card from the Message, and encapsulate it into Contact class
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   * @returns {Promise<ContactInterface>}
   */
  async toContact (): Promise<ContactInterface> {
    log.verbose('Message', 'toContact()')

    if (this.type() !== PUPPET.types.Message.Contact) {
      throw new Error('message not a ShareCard')
    }

    const contactId = await this.wechaty.puppet.messageContact(this.id)

    if (!contactId) {
      throw new Error(`can not get Contact id by message: ${contactId}`)
    }

    const contact = await this.wechaty.Contact.find({ id: contactId })
    if (!contact) {
      throw new Error(`can not get Contact payload by from id: ${contactId}`)
    }

    return contact
  }

  async toUrlLink (): Promise<UrlLinkInterface> {
    log.verbose('Message', 'toUrlLink()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.type() !== PUPPET.types.Message.Url) {
      throw new Error('message not a Url Link')
    }

    const urlPayload = await this.wechaty.puppet.messageUrl(this.id)

    return new this.wechaty.UrlLink(urlPayload)
  }

  async toMiniProgram (): Promise<MiniProgramInterface> {
    log.verbose('Message', 'toMiniProgram()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.type() !== PUPPET.types.Message.MiniProgram) {
      throw new Error('message not a MiniProgram')
    }

    const miniProgramPayload = await this.wechaty.puppet.messageMiniProgram(this.id)

    return new this.wechaty.MiniProgram(miniProgramPayload)
  }

  async toLocation (): Promise<LocationInterface> {
    log.verbose('Message', 'toLocation()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.type() !== PUPPET.types.Message.Location) {
      throw new Error('message not a Location')
    }

    const locationPayload = await this.wechaty.puppet.messageLocation(this.id)

    return new LocationImpl(locationPayload)
  }

  public async toPost (): Promise<PostInterface> {
    log.verbose('Message', 'toPost()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.type() !== PUPPET.types.Message.Post) {
      throw new Error('message type not a Post')
    }

    const post = PostImpl.load(this.id)
    await post.ready()
    return post
  }

  async toSayable (): Promise<undefined | Sayable> {
    log.verbose('Message', 'toSayable()')
    return messageToSayable(this)
  }

}

class MessageImplBase extends validationMixin(MessageMixin)<MessageImplInterface>() {}
interface MessageImplInterface extends MessageImplBase {}

type MessageProtectedProperty =
  | 'ready'

type MessageInterface = Omit<MessageImplInterface, MessageProtectedProperty>
class MessageImpl extends validationMixin(MessageImplBase)<MessageInterface>() {}

type MessageConstructor = Constructor<
  MessageInterface,
  Omit<typeof MessageImpl, 'load'>
>

export type {
  MessageInterface,
  MessageProtectedProperty,
  MessageConstructor,
}
export {
  MessageImpl,
}
