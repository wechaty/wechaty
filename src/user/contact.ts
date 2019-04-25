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
import { instanceToClass }  from 'clone-class'
import { FileBox }          from 'file-box'

import {
  ContactGender,
  ContactPayload,
  ContactQueryFilter,
  ContactType,
}                         from 'wechaty-puppet'

import {
  Accessory,
}                   from '../accessory'
import {
  log,
  qrCodeForChatie,
  Raven,
}                   from '../config'
import {
  Sayable,
}                   from '../types'

import { UrlLink }  from './url-link'

export const POOL = Symbol('pool')

/**
 * All wechat contacts(friend) will be encapsulated as a Contact.
 * [Examples/Contact-Bot]{@link https://github.com/Chatie/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/contact-bot.ts}
 *
 * @property {string}  id               - Get Contact id.
 * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
 */
export class Contact extends Accessory implements Sayable {

  // tslint:disable-next-line:variable-name
  public static Type   = ContactType
  // tslint:disable-next-line:variable-name
  public static Gender = ContactGender

  protected static [POOL]: Map<string, Contact>
  protected static get pool () {
    return this[POOL]
  }
  protected static set pool (newPool: Map<string, Contact>) {
    if (this === Contact) {
      throw new Error(
        'The global Contact class can not be used directly!'
        + 'See: https://github.com/Chatie/wechaty/issues/1217',
      )
    }
    this[POOL] = newPool
  }

  /**
   * @private
   * About the Generic: https://stackoverflow.com/q/43003970/1123955
   *
   * Get Contact by id
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @static
   * @param {string} id
   * @returns {Contact}
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * const contact = bot.Contact.load('contactId')
   */
  public static load<T extends typeof Contact> (
    this : T,
    id   : string,
  ): T['prototype'] {
    if (!this.pool) {
      log.verbose('Contact', 'load(%s) init pool', id)
      this.pool = new Map<string, Contact>()
    }
    if (this === Contact) {
      throw new Error(
        'The lgobal Contact class can not be used directly!'
        + 'See: https://github.com/Chatie/wechaty/issues/1217',
      )
    }
    if (this.pool === Contact.pool) {
      throw new Error('the current pool is equal to the global pool error!')
    }
    const existingContact = this.pool.get(id)
    if (existingContact) {
      return existingContact
    }

    // when we call `load()`, `this` should already be extend-ed a child class.
    // so we force `this as any` at here to make the call.
    const newContact = new (this as any)(id) as Contact

    this.pool.set(id, newContact)

    return newContact
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
   * const bot = new Wechaty()
   * await bot.start()
   * const contactFindByName = await bot.Contact.find({ name:"ruirui"} )
   * const contactFindByAlias = await bot.Contact.find({ alias:"lijiarui"} )
   */
  public static async find<T extends typeof Contact> (
    this  : T,
    query : string | ContactQueryFilter,
  ): Promise<T['prototype'] | null> {
    log.verbose('Contact', 'find(%s)', JSON.stringify(query))

    const contactList = await this.findAll(query)

    if (!contactList) {
      return null
    }
    if (contactList.length < 1) {
      return null
    }

    if (contactList.length > 1) {
      log.warn('Contact', 'find() got more than one(%d) result', contactList.length)
    }

    let n = 0
    for (n = 0; n < contactList.length; n++) {
      const contact = contactList[n]
      // use puppet.contactValidate() to confirm double confirm that this contactId is valid.
      // https://github.com/lijiarui/wechaty-puppet-padchat/issues/64
      // https://github.com/Chatie/wechaty/issues/1345
      const valid = await this.puppet.contactValidate(contact.id)
      if (valid) {
        log.verbose('Contact', 'find() confirm contact[#%d] with id=%d is vlaid result, return it.',
                            n,
                            contact.id,
                  )
        return contact
      } else {
        log.verbose('Contact', 'find() confirm contact[#%d] with id=%d is INVALID result, try next',
                            n,
                            contact.id,
                    )
      }
    }
    log.warn('Contact', 'find() got %d contacts but no one is valid.', contactList.length)
    return null
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
   * const bot = new Wechaty()
   * await bot.start()
   * const contactList = await bot.Contact.findAll()                      // get the contact list of the bot
   * const contactList = await bot.Contact.findAll({ name: 'ruirui' })    // find allof the contacts whose name is 'ruirui'
   * const contactList = await bot.Contact.findAll({ alias: 'lijiarui' }) // find all of the contacts whose alias is 'lijiarui'
   */
  public static async findAll<T extends typeof Contact> (
    this  : T,
    query? : string | ContactQueryFilter,
  ): Promise<Array<T['prototype']>> {
    log.verbose('Contact', 'findAll(%s)', JSON.stringify(query) || '')

    if (query && Object.keys(query).length !== 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    try {
      const contactIdList: string[] = await this.puppet.contactSearch(query)
      const contactList = contactIdList.map(id => this.load(id))

      const BATCH_SIZE = 16
      let   batchIndex = 0

      const invalidDict: { [id: string]: true } = {}

      while (batchIndex * BATCH_SIZE < contactList.length) {
        const batchContactList = contactList.slice(
          BATCH_SIZE * batchIndex,
          BATCH_SIZE * (batchIndex + 1),
        )
        await Promise.all(
          batchContactList.map(
            c => c.ready()
                  .catch(e => {
                    log.error('Contact', 'findAll() contact.ready() exception: %s', e.message)
                    invalidDict[c.id] = true
                  }),
          ),
        )

        batchIndex++
      }

      return contactList.filter(contact => !invalidDict[contact.id])

    } catch (e) {
      log.error('Contact', 'this.puppet.contactFindAll() rejected: %s', e.message)
      return [] // fail safe
    }
  }

  // TODO
  public static async delete (contact: Contact): Promise<void> {
    log.verbose('Contact', 'static delete(%s)', contact.id)
  }

  /**
   *
   * Instance properties
   * @private
   *
   */
  protected payload?: ContactPayload

  public readonly id: string // Contact Id

  /**
   * @private
   */
  constructor (
    id: string,
  ) {
    super()
    log.silly('Contact', `constructor(${id})`)

    this.id = id

    // tslint:disable-next-line:variable-name
    const MyClass = instanceToClass(this, Contact)

    if (MyClass === Contact) {
      throw new Error(
        'Contact class can not be instanciated directly!'
        + 'See: https://github.com/Chatie/wechaty/issues/1217',
      )
    }

    if (!this.puppet) {
      throw new Error('Contact class can not be instanciated without a puppet!')
    }
  }

  /**
   * @private
   */
  public toString (): string {
    if (!this.payload) {
      return this.constructor.name
    }

    const identity = this.payload.alias
                    || this.payload.name
                    || this.id
                    || 'loading...'

    return `Contact<${identity}>`
  }

  public async say (text: string)     : Promise<void>
  public async say (file: FileBox)    : Promise<void>
  public async say (contact: Contact) : Promise<void>
  public async say (url: UrlLink)     : Promise<void>

  /**
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param {(string | Contact | FileBox | UrlLink)} textOrContactOrFileOrUrl
   * send text, Contact, or file to contact. </br>
   * You can use {@link https://www.npmjs.com/package/file-box|FileBox} to send file
   * @returns {Promise<void>}
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * const contact = await bot.Contact.find({name: 'lijiarui'})  // change 'lijiarui' to any of your contact name in wechat
   *
   * // 1. send text to contact
   *
   * await contact.say('welcome to wechaty!')
   *
   * // 2. send media file to contact
   *
   * import { FileBox }  from 'file-box'
   * const fileBox1 = FileBox.fromUrl('https://chatie.io/wechaty/images/bot-qr-code.png')
   * const fileBox2 = FileBox.fromFile('/tmp/text.txt')
   * await contact.say(fileBox1)
   * await contact.say(fileBox2)
   *
   * // 3. send contact card to contact
   *
   * const contactCard = bot.Contact.load('contactId')
   * await contact.say(contactCard)
   *
   * // 4. send url link to contact
   *
   * const urlLink = new UrlLink ({
   *   description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
   *   thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
   *   title       : 'Welcome to Wechaty',
   *   url         : 'https://github.com/chatie/wechaty',
   * })
   * await contact.say(urlLink)
   */
  public async say (textOrContactOrFileOrUrl: string | Contact | FileBox | UrlLink): Promise<void> {
    log.verbose('Contact', 'say(%s)', textOrContactOrFileOrUrl)

    if (typeof textOrContactOrFileOrUrl === 'string') {
      /**
       * 1. Text
       */
      await this.puppet.messageSendText({
        contactId: this.id,
      }, textOrContactOrFileOrUrl)
    } else if (textOrContactOrFileOrUrl instanceof Contact) {
      /**
       * 2. Contact
       */
      await this.puppet.messageSendContact({
        contactId: this.id,
      }, textOrContactOrFileOrUrl.id)
    } else if (textOrContactOrFileOrUrl instanceof FileBox) {
      /**
       * 3. File
       */
      await this.puppet.messageSendFile({
        contactId: this.id,
      }, textOrContactOrFileOrUrl)
    } else if (textOrContactOrFileOrUrl instanceof UrlLink) {
      /**
       * 4. Link Message
       */
      await this.puppet.messageSendUrl({
        contactId : this.id
      }, textOrContactOrFileOrUrl.payload)
    } else {
      throw new Error('unsupported arg: ' + textOrContactOrFileOrUrl)
    }
  }

  /**
   * Get the name from a contact
   *
   * @returns {string}
   * @example
   * const name = contact.name()
   */
  public name (): string {
    return this.payload && this.payload.name || ''
  }

  public async alias ()                  : Promise<null | string>
  public async alias (newAlias:  string) : Promise<void>
  public async alias (empty:     null)   : Promise<void>

  /**
   * GET / SET / DELETE the alias for a contact
   *
   * Tests show it will failed if set alias too frequently(60 times in one minute).
   * @param {(none | string | null)} newAlias
   * @returns {(Promise<null | string | void>)}
   * @example <caption> GET the alias for a contact, return {(Promise<string | null>)}</caption>
   * const alias = await contact.alias()
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
  public async alias (newAlias?: null | string): Promise<null | string | void> {
    log.silly('Contact', 'alias(%s)',
                            newAlias === undefined
                              ? ''
                              : newAlias,
                )

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (typeof newAlias === 'undefined') {
      return this.payload.alias || null
    }

    try {
      await this.puppet.contactAlias(this.id, newAlias)
      await this.puppet.contactPayloadDirty(this.id)
      this.payload = await this.puppet.contactPayload(this.id)
      if (newAlias && newAlias !== this.payload.alias) {
        log.warn('Contact', 'alias(%s) sync with server fail: set(%s) is not equal to get(%s)',
                            newAlias,
                            this.payload.alias,
                )
      }
    } catch (e) {
      log.error('Contact', 'alias(%s) rejected: %s', newAlias, e.message)
      Raven.captureException(e)
    }
  }

  /**
   *
   * @description
   * Should use {@link Contact#friend} instead
   *
   * @deprecated
   * @private
   */
  public stranger (): null | boolean {
    log.warn('Contact', 'stranger() DEPRECATED. use friend() instead.')
    if (!this.payload) return null
    return !this.friend()
  }

  /**
   * Check if contact is friend
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @returns {boolean | null}
   *
   * <br>True for friend of the bot <br>
   * False for not friend of the bot, null for unknown.
   * @example
   * const isFriend = contact.friend()
   */
  public friend (): null | boolean {
    log.verbose('Contact', 'friend()')
    if (!this.payload) {
      return null
    }
    return this.payload.friend || null
  }

  /**
   * @ignore
   * @see {@link https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3243|webwxApp.js#L324}
   * @see {@link https://github.com/Urinx/WeixinBot/blob/master/README.md|Urinx/WeixinBot/README}
   */
  /**
   * @description
   * Check if it's a offical account, should use {@link Contact#type} instead
   * @deprecated
   * @private
   */
  public official (): boolean {
    log.warn('Contact', 'official() DEPRECATED. use type() instead')
    return !!this.payload && (this.payload.type === ContactType.Official)
  }

  /**
   * @description
   * Check if it's a personal account, should use {@link Contact#type} instead
   * @deprecated
   * @private
   */
  public personal (): boolean {
    log.warn('Contact', 'personal() DEPRECATED. use type() instead')
    return !!this.payload && this.payload.type === ContactType.Personal
  }

  /**
   * Enum for ContactType
   * @enum {number}
   * @property {number} Unknown    - ContactType.Unknown    (0) for Unknown
   * @property {number} Personal   - ContactType.Personal   (1) for Personal
   * @property {number} Official   - ContactType.Official   (2) for Official
   */

  /**
   * Return the type of the Contact
   * > Tips: ContactType is enum here.</br>
   * @returns {ContactType.Unknown | ContactType.Personal | ContactType.Official}
   *
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * const isOfficial = contact.type() === bot.Contact.Type.Official
   */
  public type (): ContactType {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.type
  }

  /**
   * @private
   * TODO
   * Check if the contact is star contact.
   *
   * @returns {boolean | null} - True for star friend, False for no star friend.
   * @example
   * const isStar = contact.star()
   */
  public star (): null | boolean {
    if (!this.payload) {
      return null
    }
    return this.payload.star === undefined
      ? null
      : this.payload.star
  }

  /**
   * Contact gender
   * > Tips: ContactGender is enum here. </br>
   *
   * @returns {ContactGender.Unknown | ContactGender.Male | ContactGender.Female}
   * @example
   * const gender = contact.gender() === bot.Contact.Gender.Male
   */
  public gender (): ContactGender {
    return this.payload
      ? this.payload.gender
      : ContactGender.Unknown
  }

  /**
   * Get the region 'province' from a contact
   *
   * @returns {string | null}
   * @example
   * const province = contact.province()
   */
  public province (): null | string {
    return this.payload && this.payload.province || null
  }

  /**
   * Get the region 'city' from a contact
   *
   * @returns {string | null}
   * @example
   * const city = contact.city()
   */
  public city (): null | string {
    return this.payload && this.payload.city || null
  }

  /**
   * Get avatar picture file stream
   *
   * @returns {Promise<FileBox>}
   * @example
   * // Save avatar to local file like `1-name.jpg`
   *
   * const file = await contact.avatar()
   * const name = file.name
   * await file.toFile(name, true)
   * console.log(`Contact: ${contact.name()} with avatar file: ${name}`)
   */
  public async avatar (): Promise<FileBox> {
    log.verbose('Contact', 'avatar()')

    try {
      const fileBox = await this.puppet.contactAvatar(this.id)
      return fileBox
    } catch (e) {
      log.error('Contact', 'avatar() exception: %s', e.message)
      return qrCodeForChatie()
    }
  }

  /**
   * @description
   * Force reload(re-ready()) data for Contact, use {@link Contact#sync} instead
   *
   * @deprecated
   * @private
   */
  public refresh (): Promise<void> {
    log.warn('Contact', 'refresh() DEPRECATED. use sync() instead.')
    return this.sync()
  }

  /**
   * Force reload data for Contact, Sync data from lowlevel API again.
   *
   * @returns {Promise<this>}
   * @example
   * await contact.sync()
   */
  public async sync (): Promise<void> {
    await this.ready(true)
  }

  /**
   * `ready()` is For FrameWork ONLY!
   *
   * Please not to use `ready()` at the user land.
   * If you want to sync data, uyse `sync()` instead.
   *
   * @private
   */
  public async ready (
    forceSync = false,
  ): Promise<void> {
    log.silly('Contact', 'ready() @ %s', this.puppet)

    if (!forceSync && this.isReady()) { // already ready
      log.silly('Contact', 'ready() isReady() true')
      return
    }

    try {
      if (forceSync) {
        await this.puppet.contactPayloadDirty(this.id)
      }
      this.payload = await this.puppet.contactPayload(this.id)
      // log.silly('Contact', `ready() this.puppet.contactPayload(%s) resolved`, this)

    } catch (e) {
      log.verbose('Contact', `ready() this.puppet.contactPayload(%s) exception: %s`,
                            this,
                            e.message,
                )
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * @private
   */
  public isReady (): boolean {
    return !!(this.payload && this.payload.name)
  }

  /**
   * Check if contact is self
   *
   * @returns {boolean} True for contact is self, False for contact is others
   * @example
   * const isSelf = contact.self()
   */
  public self (): boolean {
    const userId = this.puppet.selfId()

    if (!userId) {
      return false
    }

    return this.id === userId
  }

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
  public weixin (): null | string {
    return this.payload && this.payload.weixin || null
  }
}
