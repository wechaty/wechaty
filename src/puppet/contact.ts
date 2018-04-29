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
 *
 *   @ignore
 */
import {
  log,
  Sayable,
}                       from '../config'
import PuppetAccessory  from '../puppet-accessory'

import Message          from './message'

/**
 * Enum for Gender values.
 *
 * @enum {number}
 * @property {number} Unknown   - 0 for Unknown
 * @property {number} Male      - 1 for Male
 * @property {number} Female    - 2 for Female
 */
export enum Gender {
  Unknown = 0,
  Male    = 1,
  Female  = 2,
}

export interface ContactQueryFilter {
  name?:   string | RegExp,
  alias?:  string | RegExp,
}

/**
 * All wechat contacts(friend) will be encapsulated as a Contact.
 *
 * `Contact` is `Sayable`,
 * [Examples/Contact-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/contact-bot.ts}
 */
export abstract class Contact extends PuppetAccessory implements Sayable {
  protected static readonly pool = new Map<string, Contact>()

  /**
   * @private
   * About the Generic: https://stackoverflow.com/q/43003970/1123955
   */
  public static load<T extends typeof Contact>(this: T, id: string): T['prototype'] {
    if (!id || typeof id !== 'string') {
      throw new Error('Contact.load(): id not found')
    }

    if (!(id in this.pool)) {
      // when we call `load()`, `this` should already be extend-ed a child class.
      // so we force `this as any` at here to make the call.
      Contact.pool[id] = new (this as any)(id)
    }
    return this.pool[id]
  }

  /**
   * The way to search Contact
   *
   * @typedef    ContactQueryFilter
   * @property   {string} name    - The name-string set by user-self, should be called name
   * @property   {string} alias   - The name-string set by bot for others, should be called alias
   * [More Detail]{@link https://github.com/Chatie/wechaty/issues/365}
   */

  /**
   * Try to find a contact by filter: {name: string | RegExp} / {alias: string | RegExp}
   *
   * Find contact by name or alias, if the result more than one, return the first one.
   *
   * @static
   * @param {ContactQueryFilter} query
   * @returns {(Promise<Contact | null>)} If can find the contact, return Contact, or return null
   * @example
   * const contactFindByName = await Contact.find({ name:"ruirui"} )
   * const contactFindByAlias = await Contact.find({ alias:"lijiarui"} )
   */
  public static async find<T extends typeof Contact>(
    this  : T,
    query : ContactQueryFilter,
  ): Promise<T['prototype'] | null> {
    log.verbose('Contact', 'find(%s)', JSON.stringify(query))

    const contactList = await this.findAll(query)
    if (!contactList || !contactList.length) {
      return null
    }

    if (contactList.length > 1) {
      log.warn('Contact', 'function find(%s) get %d contacts, use the first one by default', JSON.stringify(query), contactList.length)
    }
    return contactList[0]
  }

  /**
   * Find contact by `name` or `alias`
   *
   * If use Contact.findAll() get the contact list of the bot.
   *
   * #### definition
   * - `name`   the name-string set by user-self, should be called name
   * - `alias`  the name-string set by bot for others, should be called alias
   *
   * @static
   * @param {ContactQueryFilter} [queryArg]
   * @returns {Promise<Contact[]>}
   * @example
   * const contactList = await Contact.findAll()                    // get the contact list of the bot
   * const contactList = await Contact.findAll({name: 'ruirui'})    // find allof the contacts whose name is 'ruirui'
   * const contactList = await Contact.findAll({alias: 'lijiarui'}) // find all of the contacts whose alias is 'lijiarui'
   */
  public static async findAll<T extends typeof Contact>(
    this  : T,
    query : ContactQueryFilter = { name: /.*/ },
  ): Promise<T['prototype'][]> {
    // log.verbose('Cotnact', 'findAll({ name: %s })', query.name)
    log.verbose('Cotnact', 'findAll({ %s })',
                            Object.keys(query)
                                  .map(k => `${k}: ${query[k]}`)
                                  .join(', '),
              )

    if (Object.keys(query).length !== 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    try {
      const contactList: Contact[] = await this.puppet.contactFindAll(query)

      await Promise.all(contactList.map(c => c.ready()))
      return contactList

    } catch (e) {
      log.error('Contact', 'this.puppet.contactFindAll() rejected: %s', e.message)
      return [] // fail safe
    }
  }

  /**
   * @private
   */
  constructor(
    public readonly id: string,
  ) {
    super()
    log.silly('Contact', `constructor(${id})`)
  }

  /**
   * @private
   */
  public toString(): string {
    const identity = this.alias() || this.name() || this.id
    return `Contact<${identity}>`
  }

  /**
   * Sent Text to contact
   *
   * @param {string} text
   */
  public abstract async say(text: string): Promise<void>

  /**
   * Send Media File to Contact
   *
   * @param {Message} Message
   * @memberof Contact
   */
  public abstract async say(message: Message): Promise<void>

  /**
   * Send Text or Media File to Contact.
   *
   * @param {(string | Message)} textOrMessage
   * @returns {Promise<void>}
   * @example
   * const contact = await Contact.find({name: 'lijiarui'})         // change 'lijiarui' to any of your contact name in wechat
   * try {
   *   await contact.say('welcome to wechaty!')
   *   await contact.say(new Message(__dirname + '/wechaty.png') // put the filePath you want to send here
   * } catch (e) {
   *   console.error(e)
   * }
   */
  public abstract async say(textOrMessage: string | Message): Promise<void>

  /**
   * Get the name from a contact
   *
   * @returns {string}
   * @example
   * const name = contact.name()
   */
  public abstract name(): string

  public abstract alias():                        string | null
  public abstract async alias(newAlias: string):  Promise<void>
  public abstract async alias(empty: null):       Promise<void>

  /**
   * GET / SET / DELETE the alias for a contact
   *
   * Tests show it will failed if set alias too frequently(60 times in one minute).
   * @param {(none | string | null)} newAlias
   * @returns {(string | null | Promise<boolean>)}
   * @example <caption> GET the alias for a contact, return {(string | null)}</caption>
   * const alias = contact.alias()
   * if (alias === null) {
   *   console.log('You have not yet set any alias for contact ' + contact.name())
   * } else {
   *   console.log('You have already set an alias for contact ' + contact.name() + ':' + alias)
   * }
   *
   * @example <caption>SET the alias for a contact</caption>
   * try {
   *   await contact.alias('lijiarui')
   *   console.log(`change ${contact.name()}'s alias successfully!`)
   * } catch (e) {
   *   console.log(`failed to change ${contact.name()} alias!`)
   * }
   *
   * @example <caption>DELETE the alias for a contact</caption>
   * try {
   *   const oldAlias = await contact.alias(null)
   *   console.log(`delete ${contact.name()}'s alias successfully!`)
   *   console.log('old alias is ${oldAlias}`)
   * } catch (e) {
   *   console.log(`failed to delete ${contact.name()}'s alias!`)
   * }
   */
  public abstract alias(newAlias?: string|null): Promise<void | string | null> | string | null

  /**
   * Check if contact is stranger
   *
   * @returns {boolean | null} - True for not friend of the bot, False for friend of the bot, null for unknown.
   * @example
   * const isStranger = contact.stranger()
   */
  public abstract stranger(): boolean | null

  /**
   * Check if it's a offical account
   *
   * @returns {boolean | null} - True for official account, Flase for contact is not a official account, null for unknown
   * @see {@link https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3243|webwxApp.js#L324}
   * @see {@link https://github.com/Urinx/WeixinBot/blob/master/README.md|Urinx/WeixinBot/README}
   * @example
   * const isOfficial = contact.official()
   */
  public abstract official(): boolean | null

  /**
   * Check if it's a personal account
   *
   * @returns {boolean | null} - True for personal account, Flase for contact is not a personal account
   * @example
   * const isPersonal = contact.personal()
   */
  public abstract personal(): boolean | null

  /**
   * Check if the contact is star contact.
   *
   * @returns {boolean | null} - True for star friend, False for no star friend.
   * @example
   * const isStar = contact.star()
   */
  public abstract star(): boolean | null

  /**
   * Contact gender
   *
   * @returns {Gender.Male(2)|Gender.Female(1)|Gender.Unknown(0)}
   * @example
   * const gender = contact.gender()
   */
  public abstract gender(): Gender

  /**
   * Get the region 'province' from a contact
   *
   * @returns {string | null}
   * @example
   * const province = contact.province()
   */
  public abstract province(): string | null

  /**
   * Get the region 'city' from a contact
   *
   * @returns {string | null}
   * @example
   * const city = contact.city()
   */
  public abstract city(): string | null

  /**
   * Get avatar picture file stream
   *
   * @returns {Promise<NodeJS.ReadableStream>}
   * @example
   * const avatarFileName = contact.name() + `.jpg`
   * const avatarReadStream = await contact.avatar()
   * const avatarWriteStream = createWriteStream(avatarFileName)
   * avatarReadStream.pipe(avatarWriteStream)
   * log.info('Bot', 'Contact: %s: %s with avatar file: %s', contact.weixin(), contact.name(), avatarFileName)
   */
  public abstract async avatar(): Promise<NodeJS.ReadableStream>

  /**
   * Force reload(re-ready()) data for Contact
   *
   * @returns {Promise<this>}
   * @example
   * await contact.refresh()
   */
  public abstract async refresh(): Promise<this>

  /**
   * @private
   */
  public abstract async ready(): Promise<this>

  /**
   * @private
   */
  public abstract isReady(): boolean

  /**
   * Check if contact is self
   *
   * @returns {boolean} True for contact is self, False for contact is others
   * @example
   * const isSelf = contact.self()
   */
  public abstract self(): boolean

  /**
   * Get the weixin number from a contact.
   *
   * Sometimes cannot get weixin number due to weixin security mechanism, not recommend.
   *
   * @private
   * @returns {string | null}
   * @example
   * const weixin = contact.weixin()
   */
  public abstract weixin(): string | null

}

export default Contact
