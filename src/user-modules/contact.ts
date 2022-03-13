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
import * as PUPPET      from 'wechaty-puppet'
import type {
  FileBoxInterface,
}                       from 'file-box'
import {
  concurrencyExecuter,
}                       from 'rx-queue'
import type {
  Constructor,
}                       from 'clone-class'

import {
  log,
}                           from '../config.js'

import { ContactEventEmitter }        from '../schemas/mod.js'

import {
  poolifyMixin,
  wechatifyMixin,
  validationMixin,
}                                     from '../user-mixins/mod.js'
import {
  deliverSayableConversationPuppet,
}                                     from '../sayable/mod.js'
import type {
  SayableSayer,
  Sayable,
}                                     from '../sayable/mod.js'
import { stringifyFilter }            from '../helper-functions/stringify-filter.js'

import type { MessageInterface }  from './message.js'
import type { TagInterface }      from './tag.js'
import type { ContactSelfImpl }   from './contact-self.js'

const MixinBase = wechatifyMixin(
  poolifyMixin(
    ContactEventEmitter,
  )<ContactImplInterface>(),
)

/**
 * All wechat contacts(friend) will be encapsulated as a Contact.
 * [Examples/Contact-Bot]{@link https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/contact-bot.ts}
 *
 * @property {string}  id               - Get Contact id.
 * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
 */
class ContactMixin extends MixinBase implements SayableSayer {

  static Type   = PUPPET.types.Contact
  static Gender = PUPPET.types.ContactGender

  /**
   * The way to search Contact
   *
   * @typedef    ContactQueryFilter
   * @property   {string} name    - The name-string set by user-self, should be called name
   * @property   {string} alias   - The name-string set by bot for others, should be called alias
   * [More Detail]{@link https://github.com/wechaty/wechaty/issues/365}
   */

  /**
   * Try to find a contact by filter: {name: string | RegExp} / {alias: string | RegExp}
   *
   * Find contact by name or alias, if the result more than one, return the first one.
   *
   * @static
   * @param {string | ContactQueryFilter} query `string` will search `name` & `alias`
   * @returns {(Promise<undefined | ContactInterface>)} If can find the contact, return Contact, or return null
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * const contactFindByName = await bot.Contact.find({ name:"ruirui"} )
   * const contactFindByAlias = await bot.Contact.find({ alias:"lijiarui"} )
   */
  static async find (
    query : string | PUPPET.filters.Contact,
  ): Promise<undefined | ContactInterface> {
    log.silly('Contact', 'find(%s)', JSON.stringify(query, stringifyFilter))

    if (typeof query === 'object' && query.id) {
      let contact: ContactImpl
      if (this.wechaty.puppet.currentUserId === query.id) {
        /**
         * When the contact id is the currentUserId, return a ContactSelfImpl as the Contact
         */
        contact = (this.wechaty.ContactSelf as any as typeof ContactSelfImpl).load(query.id)
      } else {
        contact = (this.wechaty.Contact as any as typeof ContactImpl).load(query.id)
      }

      // const contact = (this.wechaty.Contact as any as typeof ContactImpl).load(query.id)
      try {
        await contact.ready()
      } catch (e) {
        this.wechaty.emitError(e)
        return undefined
      }

      return contact
    }

    const contactList = await this.findAll(query)

    if (contactList.length <= 0) {
      return
    }

    if (contactList.length > 1) {
      log.warn('Contact', 'find() got more than 1 result: %d total', contactList.length)
    }

    for (const [idx, contact] of contactList.entries()) {
      // use puppet.contactValidate() to confirm double confirm that this contactId is valid.
      // https://github.com/wechaty/wechaty-puppet-padchat/issues/64
      // https://github.com/wechaty/wechaty/issues/1345
      const valid = await this.wechaty.puppet.contactValidate(contact.id)
      if (valid) {
        log.silly('Contact', 'find() contact<id=%s> is valid, return it', idx, contact.id)
        return contact
      } else {
        log.silly('Contact', 'find() contact<id=%s> is invalid, skip it', idx, contact.id)
      }

    }

    log.warn('Contact', 'find() all of %d contacts are invalid', contactList.length)
    return undefined
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
   * @param {string | ContactQueryFilter} [queryArg] `string` will search `name` & `alias`
   * @returns {Promise<ContactInterface[]>}
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * const contactList = await bot.Contact.findAll()                      // get the contact list of the bot
   * const contactList = await bot.Contact.findAll({ name: 'ruirui' })    // find all of the contacts whose name is 'ruirui'
   * const contactList = await bot.Contact.findAll({ alias: 'lijiarui' }) // find all of the contacts whose alias is 'lijiarui'
   */
  static async findAll (
    query? : string | PUPPET.filters.Contact,
  ): Promise<ContactInterface[]> {
    log.verbose('Contact', 'findAll(%s)', JSON.stringify(query, stringifyFilter) || '')

    try {
      const contactIdList: string[] = await this.wechaty.puppet.contactSearch(query)

      const idToContact = async (id: string) => this.wechaty.Contact.find({ id }).catch(e => this.wechaty.emitError(e))

      /**
       * we need to use concurrencyExecuter to reduce the parallel number of the requests
       */
      const CONCURRENCY = 17
      const contactIterator = concurrencyExecuter(CONCURRENCY)(idToContact)(contactIdList)

      const contactList: ContactInterface[] = []

      for await (const contact of contactIterator) {
        if (contact) {
          contactList.push(contact)
        }
      }

      return contactList

    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Contact', 'this.wechaty.puppet.contactFindAll() rejected: %s', (e as Error).message)
      return [] // fail safe
    }
  }

  // TODO
  // eslint-disable-next-line no-use-before-define
  static async delete (contact: ContactInterface): Promise<void> {
    log.verbose('Contact', 'static delete(%s)', contact.id)
  }

  /**
   * Get tags for all contact
   *
   * @static
   * @returns {Promise<TagInterface[]>}
   * @example
   * const tags = await wechaty.Contact.tags()
   */
  static async tags (): Promise<TagInterface[]> {
    log.verbose('Contact', 'static tags() for %s', this)

    try {
      const tagIdList = await this.wechaty.puppet.tagContactList()
      const tagList = tagIdList.map(id => this.wechaty.Tag.load(id))
      return tagList
    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Contact', 'static tags() exception: %s', (e as Error).message)
      return []
    }
  }

  /**
   *
   * Instance properties
   * @ignore
   *
   */
  payload?: PUPPET.payloads.Contact

  /**
   * @hideconstructor
   */
  constructor (
    public readonly id: string,
  ) {
    super()
    log.silly('Contact', `constructor(${id})`)
  }

  /**
   * @ignore
   */
  override toString (): string {
    if (!this.payload) {
      return this.constructor.name
    }

    const identity = this.payload.alias
                    || this.payload.name
                    || this.id
                    || 'loading...'

    return `Contact<${identity}>`
  }

  /**
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param {(string | ContactInterface | FileBox | UrlLink | MiniProgram | Location)} sayable
   * send text, Contact, or file to contact. </br>
   * You can use {@link https://www.npmjs.com/package/file-box|FileBox} to send file
   * @returns {Promise<void | MessageInterface>}
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * const contact = await bot.Contact.find({name: 'lijiarui'})  // change 'lijiarui' to any of your contact name in wechat
   *
   * // 1. send text to contact
   *
   * await contact.say('welcome to wechaty!')
   * const msg = await contact.say('welcome to wechaty!') // only supported by puppet-padplus
   *
   * // 2. send media file to contact
   *
   * import { FileBox }  from 'wechaty'
   * const fileBox1 = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
   * const fileBox2 = FileBox.fromFile('/tmp/text.txt')
   * await contact.say(fileBox1)
   * const msg1 = await contact.say(fileBox1) // only supported by puppet-padplus
   * await contact.say(fileBox2)
   * const msg2 = await contact.say(fileBox2) // only supported by puppet-padplus
   *
   * // 3. send contact card to contact
   *
   * const contactCard = bot.Contact.load('contactId')
   * const msg = await contact.say(contactCard) // only supported by puppet-padplus
   *
   * // 4. send url link to contact
   *
   * const urlLink = new UrlLink ({
   *   description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
   *   thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
   *   title       : 'Welcome to Wechaty',
   *   url         : 'https://github.com/wechaty/wechaty',
   * })
   * await contact.say(urlLink)
   * const msg = await contact.say(urlLink) // only supported by puppet-padplus
   *
   * // 5. send mini program to contact
   *
   * const miniProgram = new MiniProgram ({
   *   username           : 'gh_xxxxxxx',     //get from mp.weixin.qq.com
   *   appid              : '',               //optional, get from mp.weixin.qq.com
   *   title              : '',               //optional
   *   pagepath           : '',               //optional
   *   description        : '',               //optional
   *   thumbnailurl       : '',               //optional
   * })
   * await contact.say(miniProgram)
   * const msg = await contact.say(miniProgram) // only supported by puppet-padplus
   *
   * // 6. send location to contact
   * const location = new Location ({
   *   accuracy  : 15,
   *   address   : '北京市北京市海淀区45 Chengfu Rd',
   *   latitude  : 39.995120999999997,
   *   longitude : 116.334154,
   *   name      : '东升乡人民政府(海淀区成府路45号)',
   * })
   * await contact.say(location)
   * const msg = await contact.say(location)
   */
  async say (
    sayable: Sayable,
  ): Promise<void | MessageInterface> {
    log.verbose('Contact', 'say(%s)', sayable)

    const msgId = await deliverSayableConversationPuppet(this.wechaty.puppet)(this.id)(sayable)

    if (msgId) {
      const msg = await this.wechaty.Message.find({ id: msgId })
      if (msg) {
        return msg
      }
    }
  }

  /**
   * Get the name from a contact
   *
   * @returns {string}
   * @example
   * const name = contact.name()
   */
  name (): string {
    return (this.payload && this.payload.name) || ''
  }

  async alias ()                  : Promise<undefined | string>
  async alias (newAlias:  string) : Promise<void>
  async alias (empty:     null)   : Promise<void>

  /**
   * GET / SET / DELETE the alias for a contact
   *
   * Tests show it will failed if set alias too frequently(60 times in one minute).
   * @param {(none | string | null)} newAlias
   * @returns {(Promise<undefined | string | void>)}
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
  async alias (newAlias?: null | string): Promise<void | undefined | string> {
    log.silly('Contact', 'alias(%s)',
      newAlias === undefined
        ? ''
        : newAlias,
    )

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (typeof newAlias === 'undefined') {
      return this.payload.alias
    }

    try {
      await this.wechaty.puppet.contactAlias(this.id, newAlias)
      await this.wechaty.puppet.contactPayloadDirty(this.id)
      this.payload = await this.wechaty.puppet.contactPayload(this.id)
      if (newAlias && newAlias !== this.payload.alias) {
        log.warn('Contact', 'alias(%s) sync with server fail: set(%s) is not equal to get(%s)',
          newAlias,
          newAlias,
          this.payload.alias,
        )
      }
    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Contact', 'alias(%s) rejected: %s', newAlias, (e as Error).message)
    }
  }

  /**
   * GET / SET / DELETE the phone list for a contact
   *
   * @param {(none | string[])} phoneList
   * @returns {(Promise<string[] | void>)}
   * @example <caption> GET the phone list for a contact, return {(Promise<string[]>)}</caption>
   * const phoneList = await contact.phone()
   * if (phone.length === 0) {
   *   console.log('You have not yet set any phone number for contact ' + contact.name())
   * } else {
   *   console.log('You have already set phone numbers for contact ' + contact.name() + ':' + phoneList.join(','))
   * }
   *
   * @example <caption>SET the phoneList for a contact</caption>
   * try {
   *   const phoneList = ['13999999999', '13888888888']
   *   await contact.alias(phoneList)
   *   console.log(`change ${contact.name()}'s phone successfully!`)
   * } catch (e) {
   *   console.log(`failed to change ${contact.name()} phone!`)
   * }
   */
  async phone (): Promise<string[]>
  async phone (phoneList: string[]): Promise<void>
  async phone (phoneList?: string[]): Promise<string[] | void> {
    log.silly('Contact', 'phone(%s)', phoneList === undefined ? '' : JSON.stringify(phoneList))

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (typeof phoneList === 'undefined') {
      return this.payload.phone
    }

    try {
      await this.wechaty.puppet.contactPhone(this.id, phoneList)
      await this.wechaty.puppet.contactPayloadDirty(this.id)
      this.payload = await this.wechaty.puppet.contactPayload(this.id)
    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Contact', 'phone(%s) rejected: %s', JSON.stringify(phoneList), (e as Error).message)
    }
  }

  async corporation (): Promise<undefined | string>
  async corporation (remark: string | null): Promise<void>
  async corporation (remark?: string | null): Promise<void | undefined | string> {
    log.silly('Contact', 'corporation(%s)', remark)

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (typeof remark === 'undefined') {
      return this.payload.corporation
    }

    if (this.payload.type !== PUPPET.types.Contact.Individual) {
      throw new Error('Can not set corporation remark on non individual contact.')
    }

    try {
      await this.wechaty.puppet.contactCorporationRemark(this.id, remark)
      await this.wechaty.puppet.contactPayloadDirty(this.id)
      this.payload = await this.wechaty.puppet.contactPayload(this.id)
    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Contact', 'corporation(%s) rejected: %s', remark, (e as Error).message)
    }
  }

  async description (): Promise<undefined | string>
  async description (newDescription: string | null): Promise<void>
  async description (newDescription?: string | null): Promise<void | undefined | string> {
    log.silly('Contact', 'description(%s)', newDescription)

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (typeof newDescription === 'undefined') {
      return this.payload.description
    }

    try {
      await this.wechaty.puppet.contactDescription(this.id, newDescription)
      await this.wechaty.puppet.contactPayloadDirty(this.id)
      this.payload = await this.wechaty.puppet.contactPayload(this.id)
    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Contact', 'description(%s) rejected: %s', newDescription, (e as Error).message)
    }
  }

  title (): string | null {
    if (!this.payload) {
      throw new Error('no payload')
    }

    return this.payload.title || null
  }

  coworker (): boolean {
    if (!this.payload) {
      throw new Error('no payload')
    }

    return !!this.payload.coworker
  }

  /**
   * Check if contact is friend
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @returns {boolean | null}
   *
   * <br>True for friend of the bot <br>
   * False for not friend of the bot, null for unknown.
   * @example
   * const isFriend = contact.friend()
   */
  friend (): undefined | boolean {
    log.verbose('Contact', 'friend()')
    return this.payload?.friend
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
  type (): PUPPET.types.Contact {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.type
  }

  /**
   * @ignore
   * TODO: Check if the contact is star contact.
   *
   * @returns {boolean | null} - True for star friend, False for no star friend.
   * @example
   * const isStar = contact.star()
   */
  star (): undefined | boolean {
    return this.payload?.star
  }

  /**
   * Contact gender
   * > Tips: ContactGender is enum here. </br>
   *
   * @returns {ContactGender.Unknown | ContactGender.Male | ContactGender.Female}
   * @example
   * const gender = contact.gender() === bot.Contact.Gender.Male
   */
  gender (): PUPPET.types.ContactGender {
    return this.payload
      ? this.payload.gender
      : PUPPET.types.ContactGender.Unknown
  }

  /**
   * Get the region 'province' from a contact
   *
   * @returns {string | null}
   * @example
   * const province = contact.province()
   */
  province (): undefined | string {
    return this.payload?.province
  }

  /**
   * Get the region 'city' from a contact
   *
   * @returns {string | null}
   * @example
   * const city = contact.city()
   */
  city (): undefined | string {
    return this.payload?.city
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
  async avatar (): Promise<FileBoxInterface> {
    log.verbose('Contact', 'avatar()')

    const fileBox = await this.wechaty.puppet.contactAvatar(this.id)
    return fileBox
  }

  /**
   * Get all tags of contact
   *
   * @returns {Promise<TagInterface[]>}
   * @example
   * const tags = await contact.tags()
   */
  async tags (): Promise<TagInterface[]> {
    log.verbose('Contact', 'tags() for %s', this)

    try {
      const tagIdList = await this.wechaty.puppet.tagContactList(this.id)
      const tagList = tagIdList.map(id => this.wechaty.Tag.load(id))
      return tagList
    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Contact', 'tags() exception: %s', (e as Error).message)
      return []
    }
  }

  /**
   * Force reload data for Contact, Sync data from low-level API again.
   *
   * @returns {Promise<this>}
   * @example
   * await contact.sync()
   */
  async sync (): Promise<void> {
    await this.wechaty.puppet.contactPayloadDirty(this.id)
    await this.ready(true)
  }

  /**
   * `ready()` is For FrameWork ONLY!
   *
   * Please not to use `ready()` at the user land.
   * If you want to sync data, use `sync()` instead.
   *
   * @ignore
   */
  async ready (
    forceSync = false,
  ): Promise<void> {
    log.silly('Contact', 'ready() @ %s with id="%s"', this.wechaty.puppet, this.id)

    if (!forceSync && this.isReady()) { // already ready
      log.silly('Contact', 'ready() isReady() true')
      return
    }

    try {
      this.payload = await this.wechaty.puppet.contactPayload(this.id)
      // log.silly('Contact', `ready() this.wechaty.puppet.contactPayload(%s) resolved`, this)

    } catch (e) {
      this.wechaty.emitError(e)
      log.verbose('Contact', 'ready() this.wechaty.puppet.contactPayload(%s) exception: %s',
        this.id,
        (e as Error).message,
      )
      throw e
    }
  }

  async readMark (hasRead: boolean): Promise<void>
  async readMark (): Promise<boolean>

  /**
   * Mark the conversation as read
   * @param { undefined | boolean } hasRead
   *
   * @example
   * const bot = new Wechaty()
   * const contact = await bot.Contact.find({name: 'xxx'})
   * await contact.readMark()
   */

  async readMark (hasRead?: boolean): Promise<void | boolean> {
    try {
      if (typeof hasRead === 'undefined') {
        return this.wechaty.puppet.conversationReadMark(this.id)
      } else {
        await this.wechaty.puppet.conversationReadMark(this.id, hasRead)
      }
    } catch (e) {
      this.wechaty.emitError(e)
      log.error('Contact', 'readMark() exception: %s', (e as Error).message)
    }
  }

  /**
   * @ignore
   */
  isReady (): boolean {
    return !!(this.payload && this.payload.name)
  }

  /**
   * Check if contact is self
   *
   * @returns {boolean} True for contact is self, False for contact is others
   * @example
   * const isSelf = contact.self()
   */
  self (): boolean {
    return this.id === this.wechaty.puppet.currentUserId
  }

  /**
   * Get the handle from a contact.
   *
   * > A Twitter handle is the username that appears at the end of your unique Twitter URL.
   *
   * Sometimes cannot get handle due to the puppet implementation.
   *
   * @ignore
   * @returns {string | null}
   * @example
   * const handle = contact.handle()
   */
  handle (): undefined | string {
    return this.payload?.handle
  }

  /**
   * Huan(202203): `weixin()` will be removed in v2.0
   *  @link https://github.com/wechaty/puppet/issues/181
   * @deprecated use `handle()` instead
   */
  weixin (): undefined | string {
    log.warn('Contact', 'weixin() is deprecated, use `handle()` instead.')
    console.error(new Error().stack)
    return this.payload?.weixin
  }

}

class ContactImplBase extends validationMixin(ContactMixin)<ContactImplInterface>() {}
interface ContactImplInterface extends ContactImplBase {}

type ContactProtectedProperty =
  | 'ready'

type ContactInterface = Omit<ContactImplInterface, ContactProtectedProperty>
class ContactImpl extends validationMixin(ContactImplBase)<ContactInterface>() {}

type ContactConstructor = Constructor<
  ContactImplInterface,
  Omit<typeof ContactImpl, 'load'>
>

export type {
  ContactConstructor,
  ContactProtectedProperty,
  ContactInterface,
}
export {
  ContactImpl,
}
