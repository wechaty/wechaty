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
// import path from 'path'
// import cuid from 'cuid'

import {
  FileBox,
}                     from 'file-box'
import {
  instanceToClass,
}                     from 'clone-class'

import {
  log,
  Sayable,
}                 from '../config'
import {
  Accessory,
}                 from '../accessory'

import {
  Contact,
}                 from './contact'
import {
  Room,
}                 from './room'

import {
  MessagePayload,
  MessageType,
}                 from '../puppet/'

/**
 * All wechat messages will be encapsulated as a Message.
 *
 * `Message` is `Sayable`,
 * [Examples/Ding-Dong-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts}
 */
export class Message extends Accessory implements Sayable {

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

 /**
  * Create a Mobile Terminated Message
  *
  * "mobile originated" or "mobile terminated"
  * https://www.tatango.com/resources/video-lessons/video-mo-mt-sms-messaging/
  */
  // TODO: rename create to load ??? Huan 201806
  public static create(id: string): Message {
    log.verbose('Message', 'static create(%s)', id)

    /**
     * Must NOT use `Message` at here
     * MUST use `this` at here
     *
     * because the class will be `cloneClass`-ed
     */
    const msg = new this(id)

    // msg.payload = this.puppet.cacheMessagePayload.get(id)

    return msg
  }

  /**
   *
   * Instance Properties
   *
   */
  private get payload(): undefined | MessagePayload {
    if (!this.id) {
      return undefined
    }

    return this.puppet.messagePayloadCache(this.id)
  }

  /**
   * @private
   */
  constructor(
    public readonly id: string,
  ) {
    super()
    log.verbose('Message', 'constructor(%s) for class %s',
                          id || '',
                          this.constructor.name,
              )

    // tslint:disable-next-line:variable-name
    const MyClass = instanceToClass(this, Message)

    if (MyClass === Message) {
      throw new Error('Message class can not be instanciated directly! See: https://github.com/Chatie/wechaty/issues/1217')
    }

    if (!this.puppet) {
      throw new Error('Message class can not be instanciated without a puppet!')
    }
  }

  /**
   * @private
   */
  public toString() {
    if (!this.isReady()) {
      return this.constructor.name
    }

    const msgStrList = [
      'Message',
      `#${MessageType[this.type()]}`,
      '(',
        this.room()
          ? '👥' + this.room()
          : '',
        this.from()
          ? ' 🗣️' + this.from()
          : '',
        this.to()
          ? '👤' + this.to()
          : '',
      ')',
    ]
    if (   this.type() === Message.Type.Text
        || this.type() === Message.Type.Unknown
    ) {
      msgStrList.push(`<${this.text().substr(0, 70)}>`)
    } else {
      log.silly('Message', 'toString() for message type: %s(%s)', Message.Type[this.type()], this.type())

      if (!this.payload) {
        throw new Error('no payload')
      }
      const filename = this.payload.filename
      // if (!filename) {
      //   throw new Error(
      //     'no file for message id: ' + this.id
      //     + ' with type: ' + Message.Type[this.payload.type]
      //     + '(' + this.payload.type + ')',
      //   )
      // }
      msgStrList.push(`<${filename || 'unknown file name'}>`)
    }

    return msgStrList.join('')
  }
  /**
   * Get the sender from a message.
   * @returns {Contact}
   */
  public from(): null | Contact {
    if (!this.payload) {
      throw new Error('no payload')
    }

    // if (contact) {
    //   this.payload.from = contact
    //   return
    // }

    const fromId = this.payload.fromId
    if (!fromId) {
      return null
    }

    const from = this.wechaty.Contact.load(fromId)
    return from
  }

  /**
   * Get the destination of the message
   * Message.to() will return null if a message is in a room, use Message.room() to get the room.
   * @returns {(Contact|null)}
   */
  public to(): null | Contact {
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
   */
  public room(): null | Room {
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
   * @deprecated use text() instead
   */
  public content(): string {
    log.warn('Message', 'content() DEPRECATED. use text() instead.')
    return this.text()
  }

  /**
   * Get the text content of the message
   *
   * @returns {string}
   */
  public text(): string {
    if (!this.payload) {
      throw new Error('no payload')
    }

    return this.payload.text || ''
  }

  public async say(text:    string, mention?: Contact | Contact[]) : Promise<void>
  public async say(contact: Contact)                               : Promise<void>
  public async say(file:    FileBox)                               : Promise<void>

  /**
   * Reply a Text or Media File message to the sender.
   *
   * @see {@link https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts|Examples/ding-dong-bot}
   * @param {(string | FileBox)} textOrContactOrFile
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
    textOrContactOrFile : string | Contact | FileBox,
    mention?   : Contact | Contact[],
  ): Promise<void> {
    log.verbose('Message', 'say(%s%s)',
                            textOrContactOrFile.toString(),
                            mention
                              ? ', ' + mention
                              : '',
                )

    // const user = this.puppet.userSelf()
    const from = this.from()
    // const to   = this.to()
    const room = this.room()

    const mentionList = mention
                          ? Array.isArray(mention)
                            ? mention
                            : [mention]
                          : []

    if (typeof textOrContactOrFile === 'string') {
      await this.sayText(
        textOrContactOrFile,
        from || undefined,
        room || undefined,
        mentionList,
      )
    } else if (textOrContactOrFile instanceof Contact) {
      /**
       * Contact Card
       */
      await this.puppet.messageSendContact({
        roomId    : room && room.id || undefined,
        contactId : from && from.id || undefined,
      }, textOrContactOrFile.id)
    } else {
      /**
       * File Message
       */
      await this.puppet.messageSendFile({
        roomId    : room && room.id || undefined,
        contactId : from && from.id || undefined,
      }, textOrContactOrFile)
    }
  }

  private async sayText(
    text         : string,
    to?          : Contact,
    room?        : Room,
    mentionList? : Contact[],
  ): Promise<void> {
    if (room && mentionList && mentionList.length > 0) {
      /**
       * 1 had mentioned someone
       */
      const mentionContact = mentionList[0]
      const textMentionList = mentionList.map(c => '@' + c.name()).join(' ')
      await this.puppet.messageSendText({
        contactId: mentionContact.id,
        roomId: room.id,
      }, textMentionList + ' ' + text)
    } else {
      /**
       * 2 did not mention anyone
       */
      await this.puppet.messageSendText({
        contactId : to && to.id,
        roomId    : room && room.id,
      }, text)
    }
  }

  /**
   * @deprecated use toFile() instead
   */
  public async file(): Promise<FileBox> {
    log.warn('Message', 'file() DEPRECATED. use toFileBox() instead.')
    return this.toFileBox()
  }

  public async toFileBox(): Promise<FileBox> {
    if (this.type() === Message.Type.Text) {
      throw new Error('text message no file')
    }
    const fileBox = await this.puppet.messageFile(this.id)
    return fileBox
  }

  public async toContact(): Promise<Contact> {
    log.warn('Message', 'toContact() to be implemented')

    if (this.type() === Message.Type.Contact) {
      throw new Error('message not a ShareCard')
    }

    // TODO: return the ShareCard Contact
    const contact = this.wechaty.userSelf()
    return contact
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
    const userId = this.puppet.selfId()
    const from = this.from()

    return !!from && from.id === userId
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
  public async mention(): Promise<Contact[]> {
    log.verbose('Message', 'mention()')

    const room = this.room()
    if (this.type() !== MessageType.Text || !room ) {
      return []
    }

    // define magic code `8197` to identify @xxx
    const AT_SEPRATOR = String.fromCharCode(8197)

    const atList = this.text().split(AT_SEPRATOR)
    // console.log('atList: ', atList)
    if (atList.length === 0) return []

    // Using `filter(e => e.indexOf('@') > -1)` to filter the string without `@`
    const rawMentionList = atList
      .filter(str => str.includes('@'))
      .map(str => multipleAt(str))

    // convert 'hello@a@b@c' to [ 'c', 'b@c', 'a@b@c' ]
    function multipleAt(str: string) {
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

    log.verbose('Message', 'mention() text = "%s", mentionNameList = "%s"',
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
      log.silly('Message', `message.mention() can not found member using room.member() from mentionList, metion string: ${JSON.stringify(mentionNameList)}`)
    }
    return contactList
  }

  /**
   * @deprecated: use mention() instead
   */
  public async mentioned(): Promise<Contact[]> {
    log.warn('Message', 'mentioned() DEPRECATED. use mention() instead.')
    return this.mention()
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

    if (this.isReady()) {
      return
    }

    await this.puppet.messagePayload(this.id)

    if (!this.payload) {
      throw new Error('no payload')
    }

    const fromId = this.payload.fromId
    const roomId = this.payload.roomId
    const toId   = this.payload.toId

    if (fromId) {
      await this.wechaty.Contact.load(fromId).ready()
    }
    if (roomId) {
      await this.wechaty.Room.load(roomId).ready()
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
   */
  public async forward(to: Room | Contact): Promise<void> {
    log.verbose('Message', 'forward(%s)', to)

    let roomId, contactId

    if (to instanceof Room) {
      roomId = to.id
    } else if (to instanceof Contact) {
      contactId = to.id
    }

    try {
      await this.puppet.messageForward(
        {
          contactId,
          roomId,
        },
        this.id,
      )
    } catch (e) {
      log.error('Message', 'forward(%s) exception: %s', to, e)
      throw e
    }
  }

  public date(): Date {
    if (!this.payload) {
      throw new Error('no payload')
    }

    // convert the unit timestamp to milliseconds
    // (from seconds to milliseconds)
    return new Date(1000 * this.payload.timestamp)
  }

  /**
   * Message Age:
   *  in seconds.
   */
  public age(): number {
    const ageMilliseconds = Date.now() - this.date().getTime()
    const ageSeconds = Math.floor(ageMilliseconds / 1000)
    return ageSeconds
  }

}

export default Message
