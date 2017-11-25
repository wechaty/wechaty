/**
 *
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
  config,
  Raven,
  Sayable,
  log,
}                 from './config'
import {
  Message,
  MediaMessage,
}                 from './message'
import Misc       from './misc'
import PuppetWeb  from './puppet-web'
import Wechaty    from './wechaty'

export interface ContactObj {
  address:    string,
  city:       string,
  id:         string,
  name:       string,
  province:   string,
  alias:      string|null,
  sex:        Gender,
  signature:  string,
  star:       boolean,
  stranger:   boolean,
  uin:        string,
  weixin:     string,
  avatar:     string,  // XXX URL of HeadImgUrl
  official:   boolean,
  special:    boolean,
}

export interface ContactRawObj {
  Alias:        string,
  City:         string,
  NickName:     string,
  Province:     string,
  RemarkName:   string,
  Sex:          Gender,
  Signature:    string,
  StarFriend:   string,
  Uin:          string,
  UserName:     string,
  HeadImgUrl:   string,

  stranger:     string, // assign by injectio.js
  VerifyFlag:   number,
}

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
  // remark is DEPRECATED
  remark?: string | RegExp,
}

/**
 * @see https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3848
 * @ignore
 */
const specialContactList: string[] = [
  'weibo', 'qqmail', 'fmessage', 'tmessage', 'qmessage', 'qqsync', 'floatbottle',
  'lbsapp', 'shakeapp', 'medianote', 'qqfriend', 'readerapp', 'blogapp', 'facebookapp',
  'masssendapp', 'meishiapp', 'feedsapp', 'voip', 'blogappweixin', 'weixin', 'brandsessionholder',
  'weixinreminder', 'wxid_novlwrv3lqwv11', 'gh_22b87fa7cb3c', 'officialaccounts', 'notification_messages',
]

/**
 * All wechat contacts(friend) will be encapsulated as a Contact.
 *
 * `Contact` is `Sayable`,
 * [Example/Contact-Bot]{@link https://github.com/Chatie/wechaty/blob/master/example/contact-bot.ts}
 */
export class Contact implements Sayable {
  private static pool = new Map<string, Contact>()

  public obj: ContactObj | null
  // private dirtyObj: ContactObj | null
  private rawObj: ContactRawObj

  /**
   * @private
   */
  constructor(
    public readonly id: string,
  ) {
    log.silly('Contact', `constructor(${id})`)

    if (typeof id !== 'string') {
      throw new Error('id must be string. found: ' + typeof id)
    }
  }

  /**
   * @private
   */
  public toString(): string {
    if (!this.obj) {
      return `Contact<this.id>`
    }
    const obj  = this.obj
    const name = obj.alias || obj.name || this.id
    return `Contact<${name}>`
  }

  /**
   * @private
   */
  public toStringEx() { return `Contact(${this.obj && this.obj.name}[${this.id}])` }

  /**
   * @private
   */
  private parse(rawObj: ContactRawObj): ContactObj | null {
    if (!rawObj || !rawObj.UserName) {
      log.warn('Contact', 'parse() got empty rawObj!')
      // config.puppetInstance().emit('error', e)
      return null
    }

    return !rawObj ? null : {
      id:         rawObj.UserName, // MMActualSender??? MMPeerUserName??? `getUserContact(message.MMActualSender,message.MMPeerUserName).HeadImgUrl`
      uin:        rawObj.Uin,    // stable id: 4763975 || getCookie("wxuin")
      weixin:     rawObj.Alias,  // Wechat ID
      name:       rawObj.NickName,
      alias:      rawObj.RemarkName,
      sex:        rawObj.Sex,
      province:   rawObj.Province,
      city:       rawObj.City,
      signature:  rawObj.Signature,

      address:    rawObj.Alias, // XXX: need a stable address for user

      star:       !!rawObj.StarFriend,
      stranger:   !!rawObj.stranger, // assign by injectio.js
      avatar:     rawObj.HeadImgUrl,
      /**
       * @see 1. https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3243
       * @see 2. https://github.com/Urinx/WeixinBot/blob/master/README.md
       * @ignore
       */
      // tslint:disable-next-line
      official:      !!rawObj.UserName && !rawObj.UserName.startsWith('@@') && !!(rawObj.VerifyFlag & 8),
      /**
       * @see 1. https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3246
       * @ignore
       */
      special:       specialContactList.indexOf(rawObj.UserName) > -1 || /@qqim$/.test(rawObj.UserName),
    }
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
  public static async find(query: ContactQueryFilter): Promise<Contact | null> {
    log.verbose('Contact', 'find(%s)', JSON.stringify(query))

    const contactList = await Contact.findAll(query)
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
  public static async findAll(queryArg?: ContactQueryFilter): Promise<Contact[]> {
    let query: ContactQueryFilter
    if (queryArg) {
      if (queryArg.remark) {
        log.warn('Contact', 'Contact.findAll({remark:%s}) DEPRECATED, use Contact.findAll({alias:%s}) instead.', queryArg.remark, queryArg.remark)
        query = { alias: queryArg.remark}
      } else {
        query = queryArg
      }
    } else {
      query = { name: /.*/ }
    }

    // log.verbose('Cotnact', 'findAll({ name: %s })', query.name)
    log.verbose('Cotnact', 'findAll({ %s })',
                            Object.keys(query)
                                  .map(k => `${k}: ${query[k]}`)
                                  .join(', '),
              )

    if (Object.keys(query).length !== 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    let filterKey                     = Object.keys(query)[0]
    let filterValue: string | RegExp  = query[filterKey]

    const keyMap = {
      name:   'NickName',
      alias:  'RemarkName',
    }

    filterKey = keyMap[filterKey]
    if (!filterKey) {
      throw new Error('unsupport filter key')
    }

    if (!filterValue) {
      throw new Error('filterValue not found')
    }

    /**
     * must be string because we need inject variable value
     * into code as variable name
     */
    let filterFunction: string

    if (filterValue instanceof RegExp) {
      filterFunction = `(function (c) { return ${filterValue.toString()}.test(c.${filterKey}) })`
    } else if (typeof filterValue === 'string') {
      filterValue = filterValue.replace(/'/g, '\\\'')
      filterFunction = `(function (c) { return c.${filterKey} === '${filterValue}' })`
    } else {
      throw new Error('unsupport name type')
    }

    try {
      const contactList = await config.puppetInstance()
                                  .contactFind(filterFunction)

      await Promise.all(contactList.map(c => c.ready()))
      return contactList

    } catch (e) {
      log.error('Contact', 'findAll() rejected: %s', e.message)
      return [] // fail safe
    }
  }

  /**
   * Sent Text to contact
   *
   * @param {string} text
   */
  public async say(text: string): Promise<boolean>

  /**
   * Send Media File to Contact
   *
   * @param {MediaMessage} mediaMessage
   * @memberof Contact
   */
  public async say(mediaMessage: MediaMessage): Promise<boolean>

  /**
   * Send Text or Media File to Contact.
   *
   * @param {(string | MediaMessage)} textOrMedia
   * @returns {Promise<boolean>}
   * @example
   * const contact = await Contact.find({name: 'lijiarui'})         // change 'lijiarui' to any of your contact name in wechat
   * await contact.say('welcome to wechaty!')
   * await contact.say(new MediaMessage(__dirname + '/wechaty.png') // put the filePath you want to send here
   */
  public async say(textOrMedia: string | MediaMessage): Promise<boolean> {
    const content = textOrMedia instanceof MediaMessage ? textOrMedia.filename() : textOrMedia
    log.verbose('Contact', 'say(%s)', content)

    const bot = Wechaty.instance()
    const user = bot.self()

    if (!user) {
      throw new Error('no user')
    }
    let m
    if (typeof textOrMedia === 'string') {
      m = new Message()
      m.content(textOrMedia)
    } else if (textOrMedia instanceof MediaMessage) {
      m = textOrMedia
    } else {
      throw new Error('not support args')
    }
    m.from(user)
    m.to(this)
    log.silly('Contact', 'say() from: %s to: %s content: %s', user.name(), this.name(), content)

    return await bot.send(m)
  }

  /**
   * Get the name from a contact
   *
   * @returns {string}
   * @example
   * const name = contact.name()
   */
  public name()     { return Misc.plainText(this.obj && this.obj.name || '') }

  public alias(): string | null

  public alias(newAlias: string): Promise<boolean>

  public alias(empty: null): Promise<boolean>

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
   * const ret = await contact.alias('lijiarui')
   * if (ret) {
   *   console.log(`change ${contact.name()}'s alias successfully!`)
   * } else {
   *   console.log(`failed to change ${contact.name()} alias!`)
   * }
   *
   * @example <caption>DELETE the alias for a contact</caption>
   * const ret = await contact.alias(null)
   * if (ret) {
   *   console.log(`delete ${contact.name()}'s alias successfully!`)
   * } else {
   *   console.log(`failed to delete ${contact.name()}'s alias!`)
   * }
   */
  public alias(newAlias?: string|null): Promise<boolean> | string | null {
    // log.silly('Contact', 'alias(%s)', newAlias || '')

    if (newAlias === undefined) {
      return this.obj && this.obj.alias || null
    }

    return config.puppetInstance()
                  .contactAlias(this, newAlias)
                  .then(ret => {
                    if (ret) {
                      if (this.obj) {
                        this.obj.alias = newAlias
                      } else {
                        log.error('Contact', 'alias() without this.obj?')
                      }
                    } else {
                      log.warn('Contact', 'alias(%s) fail', newAlias)
                    }
                    return ret
                  })
                  .catch(e => {
                    log.error('Contact', 'alias(%s) rejected: %s', newAlias, e.message)
                    Raven.captureException(e)
                    return false // fail safe
                  })
  }

  /**
   * Check if contact is stranger
   *
   * @returns {boolean | null} - True for not friend of the bot, False for friend of the bot, null for unknown.
   * @example
   * const isStranger = contact.stranger()
   */
  public stranger(): boolean|null {
    if (!this.obj) return null
    return this.obj.stranger
  }

  /**
   * Check if it's a offical account
   *
   * @returns {boolean|null} - True for official account, Flase for contact is not a official account, null for unknown
   * @see {@link https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3243|webwxApp.js#L324}
   * @see {@link https://github.com/Urinx/WeixinBot/blob/master/README.md|Urinx/WeixinBot/README}
   * @example
   * const isOfficial = contact.official()
   */
  public official(): boolean {
    return !!this.obj && this.obj.official
  }

  /**
   * Check if it's a special contact
   *
   * The contact who's id in following list will be identify as a special contact
   * `weibo`, `qqmail`, `fmessage`, `tmessage`, `qmessage`, `qqsync`, `floatbottle`,
   * `lbsapp`, `shakeapp`, `medianote`, `qqfriend`, `readerapp`, `blogapp`, `facebookapp`,
   * `masssendapp`, `meishiapp`, `feedsapp`, `voip`, `blogappweixin`, `weixin`, `brandsessionholder`,
   * `weixinreminder`, `wxid_novlwrv3lqwv11`, `gh_22b87fa7cb3c`, `officialaccounts`, `notification_messages`,
   *
   * @see {@link https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3848|webwxApp.js#L3848}
   * @see {@link https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3246|webwxApp.js#L3246}
   * @returns {boolean|null} True for brand, Flase for contact is not a brand
   * @example
   * const isSpecial = contact.special()
   */
  public special(): boolean {
    return !!this.obj && this.obj.special
  }

  /**
   * Check if it's a personal account
   *
   * @returns {boolean|null} - True for personal account, Flase for contact is not a personal account
   * @example
   * const isPersonal = contact.personal()
   */
  public personal(): boolean {
    return !this.official()
  }

  /**
   * Check if the contact is star contact.
   *
   * @returns {boolean} - True for star friend, False for no star friend.
   * @example
   * const isStar = contact.star()
   */
  public star(): boolean|null {
    if (!this.obj) return null
    return this.obj.star
  }

  /**
   * Contact gender
   *
   * @returns {Gender.Male(2)|Gender.Female(1)|Gender.Unknown(0)}
   * @example
   * const gender = contact.gender()
   */
  public gender(): Gender   { return this.obj ? this.obj.sex : Gender.Unknown }

  /**
   * Get the region 'province' from a contact
   *
   * @returns {string | undefined}
   * @example
   * const province = contact.province()
   */
  public province() { return this.obj && this.obj.province }

  /**
   * Get the region 'city' from a contact
   *
   * @returns {string | undefined}
   * @example
   * const city = contact.city()
   */
  public city()     { return this.obj && this.obj.city }

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
  public async avatar(): Promise<NodeJS.ReadableStream> {
    log.verbose('Contact', 'avatar()')

    if (!this.obj) {
      throw new Error('Can not get avatar: no this.obj!')
    } else if (!this.obj.avatar) {
      throw new Error('Can not get avatar: no this.obj.avatar!')
    }

    try {
      const hostname = await (config.puppetInstance() as PuppetWeb).hostname()
      const avatarUrl = `http://${hostname}${this.obj.avatar}&type=big` // add '&type=big' to get big image
      const cookies = await (config.puppetInstance() as PuppetWeb).cookies()
      log.silly('Contact', 'avatar() url: %s', avatarUrl)

      return Misc.urlStream(avatarUrl, cookies)
    } catch (err) {
      log.warn('Contact', 'avatar() exception: %s', err.stack)
      Raven.captureException(err)
      throw err
    }
  }

  /**
   * @private
   */
  public get(prop)  { return this.obj && this.obj[prop] }

  /**
   * @private
   */
  public isReady(): boolean {
    return !!(this.obj && this.obj.id && this.obj.name)
  }

  /**
   * Force reload data for Contact
   *
   * @returns {Promise<this>}
   * @example
   * await contact.refresh()
   */
  public async refresh(): Promise<this> {
    // TODO: make sure the contact.* works when we are refreshing the data
    // if (this.isReady()) {
    //   this.dirtyObj = this.obj
    // }
    this.obj = null
    await this.ready()
    return this
  }

  /**
   * @private
   */
  public async ready(contactGetter?: (id: string) => Promise<ContactRawObj>): Promise<this> {
    // log.silly('Contact', 'ready(' + (contactGetter ? typeof contactGetter : '') + ')')
    if (!this.id) {
      const e = new Error('ready() call on an un-inited contact')
      throw e
    }

    if (this.isReady()) { // already ready
      return Promise.resolve(this)
    }

    if (!contactGetter) {
      log.silly('Contact', 'get contact via ' + config.puppetInstance().constructor.name)
      contactGetter = config.puppetInstance()
                            .getContact.bind(config.puppetInstance())
    }
    if (!contactGetter) {
      throw new Error('no contatGetter')
    }

    try {
      const rawObj = await contactGetter(this.id)
      log.silly('Contact', `contactGetter(${this.id}) resolved`)
      this.rawObj = rawObj
      this.obj    = this.parse(rawObj)
      return this

    } catch (e) {
      log.error('Contact', `contactGetter(${this.id}) exception: %s`, e.message)
      Raven.captureException(e)
      throw e
    }
  }

  /**
   * @private
   */
  public dumpRaw() {
    console.error('======= dump raw contact =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }

  /**
   * @private
   */
  public dump()    {
    console.error('======= dump contact =======')
    if (!this.obj) {
      throw new Error('no this.obj')
    }
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj && this.obj[k]}`))
  }

  /**
   * Check if contact is self
   *
   * @returns {boolean} True for contact is self, False for contact is others
   * @example
   * const isSelf = contact.self()
   */
  public self(): boolean {
    const userId = config.puppetInstance()
                          .userId

    const selfId = this.id

    if (!userId || !selfId) {
      throw new Error('no user or no self id')
    }

    return selfId === userId
  }

  /**
   * @private
   */
  // function should be deprecated
  public remark(newRemark?: string|null): Promise<boolean> | string | null {
    log.warn('Contact', 'remark(%s) DEPRECATED, use alias(%s) instead.')
    log.silly('Contact', 'remark(%s)', newRemark || '')

    switch (newRemark) {
      case undefined:
        return this.alias()
      case null:
        return this.alias(null)
      default:
        return this.alias(newRemark)
    }
  }

  /**
   * @private
   */
  public static load(id: string): Contact {
    if (!id || typeof id !== 'string') {
      throw new Error('Contact.load(): id not found')
    }

    if (!(id in Contact.pool)) {
      Contact.pool[id] = new Contact(id)
    }
    return Contact.pool[id]
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
  public weixin(): string | null {
    const wxId = this.obj && this.obj.weixin || null
    if (!wxId) {
      log.verbose('Contact', `weixin() is not able to always work, it's limited by Tencent API`)
      log.verbose('Contact', 'weixin() If you want to track a contact between sessions, see FAQ at')
      log.verbose('Contact', 'https://github.com/Chatie/wechaty/wiki/FAQ#1-how-to-get-the-permanent-id-for-a-contact')
    }
    return wxId
  }

}

export default Contact
