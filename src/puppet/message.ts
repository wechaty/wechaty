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
import {
  Readable,
}             from 'stream'

import {
  MsgType,
  AppMsgType,
}               from '../puppet-puppeteer/schema'

import {
  log,
  Sayable,
}                       from '../config'
import PuppetAccessory  from '../puppet-accessory'

import Contact          from './contact'
import Room             from './room'

/**
 * All wechat messages will be encapsulated as a Message.
 *
 * `Message` is `Sayable`,
 * [Examples/Ding-Dong-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts}
 */
export abstract class Message extends PuppetAccessory implements Sayable {
  // tslint:disable-next-line:variable-name
  public static readonly Type = MsgType

  /**
   * @todo add function
   */
  public static async find<T extends typeof Message>(
    this: T,
    query,
  ): Promise<T['prototype'] | null> {
    return this.findAll(query)[0]
  }

  /**
   * @todo add function
   */
  public static async findAll<T extends typeof Message>(
    this: T,
    query,
  ): Promise<T['prototype'][]> {
    return Promise.resolve([
      new (this as any)(1),
      new (this as any)(2),
    ])
  }

  /**
   * @private
   */
  constructor(
    readonly fileOrObj?: string | Object,
  ) {
    super()
    log.silly('Message', 'constructor(%s) for class %s',
                          fileOrObj || '',
                          this.constructor.name,
              )
  }

  /**
   * @private
   */
  public toString() {
    if (this.type() === Message.Type.TEXT) {
      return `Message#${MsgType[this.type()]}<${this.text()}>`
    } else {
      return `Message#${MsgType[this.type()]}<${this.filename()}>`
    }
  }

  /**
   * @private
   */
  public abstract from(contact: Contact): this
  /**
   * @private
   */
  public abstract from(): Contact
  /**
   * Get the sender from a message.
   * @returns {Contact}
   */
  public abstract from(contact?: Contact): this | Contact

  /**
   * @private
   */
  public abstract to(contact: Contact): this
  /**
   * @private
   */
  public abstract to(): Contact | null // if to is not set, then room must had set
  /**
   * Get the destination of the message
   * Message.to() will return null if a message is in a room, use Message.room() to get the room.
   * @returns {(Contact|null)}
   */
  public abstract to(contact?: Contact): this | Contact | null

  /**
   * @private
   */
  public abstract room(room: Room): this
  /**
   * @private
   */
  public abstract room(): Room | null
  /**
   * Get the room from the message.
   * If the message is not in a room, then will return `null`
   *
   * @returns {(Room | null)}
   */
  public abstract room(room?: Room): this | Room | null

  /**
   * Get the content of the message
   *
   * @deprecated: use `text()` instead
   * @returns {string}
   */
  public content(): string
  /**
   * @deprecated: use `text()` instead
   * @private
   */
  public content(text: string): this
  /**
   * Get the content of the message
   *
   * @deprecated: use `text()` instead
   * @returns {string}
   */
  public content(text?: string): this | string {
    throw new Error('Deprecated. Use `text()` instead of `content()`. See https://github.com/Chatie/wechaty/issues/1163')
  }

  /**
   * Get the text content of the message
   *
   * @returns {string}
   */
  public abstract text(): string
  /**
   * @private
   */
  public abstract text(text: string): this
  /**
   * Get the text content of the message
   *
   * @returns {string}
   */
  public abstract text(text: string): this | string

  /**
   * Reply a Text or Media File message to the sender.
   *
   * @see {@link https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts|Examples/ding-dong-bot}
   * @param {(string | Message)} textOrMessage
   * @param {(Contact|Contact[])} [replyTo]
   * @returns {Promise<void>}
   *
   * @example
   * const bot = new Wechaty()
   * bot
   * .on('message', async m => {
   *   if (/^ding$/i.test(m.text())) {
   *     await m.say('hello world')
   *     console.log('Bot REPLY: hello world')
   *     await m.say(new Message(__dirname + '/wechaty.png'))
   *     console.log('Bot REPLY: Image')
   *   }
   * })
   */
  public abstract async say(
    textOrMessage : string | Message,
    replyTo?      : Contact | Contact[],
  ): Promise<void>

  /**
   * Get the type from the message.
   *
   * If type is equal to `MsgType.RECALLED`, {@link Message#id} is the msgId of the recalled message.
   * @see {@link MsgType}
   * @returns {MsgType}
   */
  public abstract type(): MsgType

  /**
   * Get the typeSub from the message.
   *
   * If message is a location message: `m.type() === MsgType.TEXT && m.typeSub() === MsgType.LOCATION`
   *
   * @see {@link MsgType}
   * @returns {MsgType}
   */
  public abstract typeSub(): MsgType

  /**
   * Get the typeApp from the message.
   *
   * @returns {AppMsgType}
   * @see {@link AppMsgType}
   */
  public abstract typeApp(): AppMsgType

  /**
   * Check if a message is sent by self.
   *
   * @returns {boolean} - Return `true` for send from self, `false` for send from others.
   * @example
   * if (message.self()) {
   *  console.log('this message is sent by myself!')
   * }
   */
  public abstract self(): boolean

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
  public abstract mentioned(): Contact[]

  /**
   * @private
   */
  public abstract async ready(): Promise<this>

  /**
   * Get the MediaMessage filename, etc: `how to build a chatbot.pdf`..
   *
   * @returns {string | null}
   * @example
   * bot.on('message', async function (m) {
   *   if (m instanceof MediaMessage) {
   *     console.log('media message file name is: ' + m.filename())
   *   }
   * })
   */
  public abstract filename(): string | null

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
  public abstract ext(): string

  /**
   * return the MIME Type of this MediaMessage
   *
   */
  public abstract  mimeType(): string | null

  /**
   * Get the read stream for attachment file
   */
  public abstract async readyStream(): Promise<Readable>

  public abstract async forward(to: Room | Contact): Promise<void>

}

export default Message
