import {
  Config,
  Sayable,
}                     from './config'
import {
  Message,
  MediaMessage,
}                     from './message'
import { PuppetWeb }  from './puppet-web'
import { UtilLib }    from './util-lib'
import { Wechaty }    from './wechaty'
import { log }        from './brolog-env'

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
 * @enum {number}
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
 */
const specialContactList: string[] = [
  'weibo', 'qqmail', 'fmessage', 'tmessage', 'qmessage', 'qqsync', 'floatbottle',
  'lbsapp', 'shakeapp', 'medianote', 'qqfriend', 'readerapp', 'blogapp', 'facebookapp',
  'masssendapp', 'meishiapp', 'feedsapp', 'voip', 'blogappweixin', 'weixin', 'brandsessionholder',
  'weixinreminder', 'wxid_novlwrv3lqwv11', 'gh_22b87fa7cb3c', 'officialaccounts', 'notification_messages',
]

/**
 * Class Contact
 *
 * `Contact` is `Sayable`
 */
export class Contact implements Sayable {
  private static pool = new Map<string, Contact>()

  public obj: ContactObj | null
  private dirtyObj: ContactObj | null
  private rawObj: ContactRawObj

  constructor(public readonly id: string) {
    log.silly('Contact', `constructor(${id})`)

    if (typeof id !== 'string') {
      throw new Error('id must be string. found: ' + typeof id)
    }
  }

  public toString(): string {
    if (!this.obj) {
      return this.id
    }
    return this.obj.alias || this.obj.name || this.id
  }

  public toStringEx() { return `Contact(${this.obj && this.obj.name}[${this.id}])` }

  private parse(rawObj: ContactRawObj): ContactObj | null {
    if (!rawObj || !rawObj.UserName) {
      log.warn('Contact', 'parse() got empty rawObj!')
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
       */
      // tslint:disable-next-line
      official:      !!rawObj.UserName && !rawObj.UserName.startsWith('@@') && !!(rawObj.VerifyFlag & 8),
      /**
       * @see 1. https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3246
       */
      special:       specialContactList.indexOf(rawObj.UserName) > -1 || /@qqim$/.test(rawObj.UserName),
    }
  }

  /**
   * Get the weixin number from a contact
   * Sometimes cannot get weixin number due to weixin security mechanism, not recommend.
   * @returns {string | null}
   *
   * @example
   * ```ts
   * const weixin = contact.weixin()
   * ```
   */
  public weixin(): string | null {
    const wxId = this.obj && this.obj.weixin || null
    if (!wxId) {
      log.info('Contact', `weixin() is not able to always work, it's limited by Tencent API`)
      log.silly('Contact', 'weixin() If you want to track a contact between sessions, see FAQ at')
      log.silly('Contact', 'https://github.com/Chatie/wechaty/wiki/FAQ#1-how-to-get-the-permanent-id-for-a-contact')
    }
    return wxId
  }

  /**
   * Get the name from a contact
   *
   * @returns {string}
   *
   * @example
   * ```ts
   * const name = contact.name()
   * ```
   */
  public name()     { return UtilLib.plainText(this.obj && this.obj.name || '') }

  /**
   * Check if contact is stranger
   *
   * @returns {boolean | null} True for not friend of the bot, False for friend of the bot, null for cannot get the info.
   *
   * @example
   * ```ts
   * const isStranger = contact.stranger()
   * ```
   */
  public stranger(): boolean|null {
    if (!this.obj) return null
    return this.obj.stranger
  }

  /**
   * Check if it's a offical account
   *
   * @returns {boolean|null} True for official account, Flase for contact is not a official account
   *
   * @example
   * ```ts
   * const isOfficial = contact.official()
   * ```
   */
  public official(): boolean {
    return !!this.obj && this.obj.official
  }

  /**
   * Check if it's a special contact
   *
   * the contact who's id in following list will be identify as a special contact
   *
   * ```ts
   * 'weibo', 'qqmail', 'fmessage', 'tmessage', 'qmessage', 'qqsync', 'floatbottle',
   * 'lbsapp', 'shakeapp', 'medianote', 'qqfriend', 'readerapp', 'blogapp', 'facebookapp',
   * 'masssendapp', 'meishiapp', 'feedsapp', 'voip', 'blogappweixin', 'weixin', 'brandsessionholder',
   * 'weixinreminder', 'wxid_novlwrv3lqwv11', 'gh_22b87fa7cb3c', 'officialaccounts', 'notification_messages',
   * ```
   * @see https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3848
   *
   * @returns {boolean|null} True for brand, Flase for contact is not a brand
   *
   * @example
   * ```ts
   * const isSpecial = contact.special()
   * ```
   */
  public special(): boolean {
    return !!this.obj && this.obj.special
  }

  /**
   * Check if it's a personal account
   *
   * @returns {boolean|null} True for personal account, Flase for contact is not a personal account
   *
   * @example
   * ```ts
   * const isPersonal = contact.personal()
   * ```
   */
  public personal(): boolean {
    return !this.official()
  }

  /**
   * Check if the contact is star contact.
   *
   * @returns {boolean} True for star friend, False for no star friend, null for cannot get the info.
   *
   * @example
   * ```ts
   * const isStar = contact.star()
   * ```
   */
  public star(): boolean|null {
    if (!this.obj) return null
    return this.obj.star
  }

  /**
   * Contact gender
   *
   * @returns Gender.Male(2) | Gender.Female(1) | Gender.Unknown(0)
   *
   * @example
   * ```ts
   * const gender = contact.gender()
   * ```
   */
  public gender(): Gender   { return this.obj ? this.obj.sex : Gender.Unknown }

  /**
   * Get the region 'province' from a contact
   *
   * @returns {string | undefined}
   *
   * @example
   * ```ts
   * const province = contact.province()
   * ```
   */
  public province() { return this.obj && this.obj.province }

  /**
   * Get the region 'city' from a contact
   *
   * @returns {string | undefined}
   *
   * @example
   * ```ts
   * const city = contact.city()
   * ```
   */
  public city()     { return this.obj && this.obj.city }

  /**
   * Get avatar picture file stream
   *
   * @returns {Promise<NodeJS.ReadableStream>}
   *
   * @example
   * ```ts
   * const avatarFileName = contact.name() + `.jpg`
   * const avatarReadStream = await contact.avatar()
   * const avatarWriteStream = createWriteStream(avatarFileName)
   * avatarReadStream.pipe(avatarWriteStream)
   * log.info('Bot', 'Contact: %s: %s with avatar file: %s', contact.weixin(), contact.name(), avatarFileName)
   * ```
   */
  public async avatar(): Promise<NodeJS.ReadableStream> {
    log.verbose('Contact', 'avatar()')

    if (!this.obj || !this.obj.avatar) {
      throw new Error('Can not get avatar: not ready')
    }

    try {
      const hostname = (Config.puppetInstance() as PuppetWeb).browser.hostname
      const avatarUrl = `http://${hostname}${this.obj.avatar}`
      const cookies = await (Config.puppetInstance() as PuppetWeb).browser.readCookie()
      log.silly('Contact', 'avatar() url: %s', avatarUrl)

      return UtilLib.urlStream(avatarUrl, cookies)
    } catch (err) {
      log.warn('Contact', 'avatar() exception: %s', err.stack)
      throw err
    }
  }

  public get(prop)  { return this.obj && this.obj[prop] }

  public isReady(): boolean {
    return !!(this.obj && this.obj.id && this.obj.name)
  }

  // public refresh() {
  //   log.warn('Contact', 'refresh() DEPRECATED. use reload() instead.')
  //   return this.reload()
  // }

  /**
   * Force reload data for Contact
   *
   * @returns {Promise<this>}
   *
   * @example
   * ```ts
   * await contact.refresh()
   * ```
   */
  public async refresh(): Promise<this> {
    if (this.isReady()) {
      this.dirtyObj = this.obj
    }
    this.obj = null
    return this.ready()
  }

  // public ready() {
  //   log.warn('Contact', 'ready() DEPRECATED. use load() instead.')
  //   return this.load()
  // }

  public async ready(contactGetter?: (id: string) => Promise<ContactRawObj>): Promise<this> {
    log.silly('Contact', 'ready(' + (contactGetter ? typeof contactGetter : '') + ')')
    if (!this.id) {
      const e = new Error('ready() call on an un-inited contact')
      throw e
    }

    if (this.isReady()) { // already ready
      return Promise.resolve(this)
    }

    if (!contactGetter) {
      log.silly('Contact', 'get contact via ' + Config.puppetInstance().constructor.name)
      contactGetter = Config.puppetInstance()
                            .getContact.bind(Config.puppetInstance())
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
      throw e
    }
  }

  public dumpRaw() {
    console.error('======= dump raw contact =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }

  public dump()    {
    console.error('======= dump contact =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj && this.obj[k]}`))
  }

  /**
   * Check if contact is self
   *
   * @returns {boolean} True for contact is self, False for contact is others
   *
   * @example
   * ```ts
   * const isSelf = contact.self()
   * ```
   */
  public self(): boolean {
    const userId = Config.puppetInstance()
                          .userId

    const selfId = this.id

    if (!userId || !selfId) {
      throw new Error('no user or no self id')
    }

    return selfId === userId
  }

  /**
   * find contact by `name` or `alias`
   *
   * If use Contact.findAll() get the contact list of the bot.
   *
   * #### definition
   * - `name` the name-string set by user-self, should be called name
   * - `alias` the name-string set by bot for others, should be called alias
   *
   * @static
   * @param {ContactQueryFilter} [queryArg]
   * @returns {Promise<Contact[]>}
   *
   * @example
   * ```ts
   * // get the contact list of the bot
   * const contactList = await Contact.findAll()
   * // find allof the contacts whose name is 'ruirui'
   * const contactList = await Contact.findAll({name: 'ruirui'})
   * // find allof the contacts whose alias is 'lijiarui'
   * const contactList = await Contact.findAll({alias: 'lijiarui'})
   * ```
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

    const list = await Config.puppetInstance()
                              .contactFind(filterFunction)
                              .catch(e => {
                                log.error('Contact', 'findAll() rejected: %s', e.message)
                                return [] // fail safe
                              })
    await Promise.all(list.map(c => c.ready()))

    return list
  }

  /**
   * GET the alias for contact
   *
   * @returns {(string | null)}
   *
   * @example
   * ```ts
   * const alias = contact.alias()
   * ```
   */
  public alias(): string | null

  /**
   * SET the alias for contact
   *
   * tests show it will failed if set alias too frequently(60 times in one minute).
   *
   * @param {string} newAlias
   * @returns {Promise<boolean>} A promise to the result. true for success, false for failure
   *
   * @example
   * ```ts
   * const ret = await contact.alias('lijiarui')
   * if (ret) {
   *   console.log(`change ${contact.name()}'s alias successfully!`)
   * } else {
   *   console.error('failed to change ${contact.name()}'s alias!')
   * }
   * ```
   */
  public alias(newAlias: string): Promise<boolean>

  /**
   * DELETE the alias for a contact
   *
   * @param {null} empty
   * @returns {Promise<boolean>}
   *
   * @example
   * ```ts
   * const ret = await contact.alias(null)
   * if (ret) {
   *   console.log(`delete ${contact.name()}'s alias successfully!`)
   * } else {
   *   console.log(`failed to delete ${contact.name()}'s alias!`)
   * }
   * ```
   */
  public alias(empty: null): Promise<boolean>

  /**
   * GET / SET / DELETE the alias for a contact
   *
   * @param {(none | string | null)} newAlias ,
   * @returns {(string | null | Promise<boolean>)}
   *
   * @example GET the alias for a contact
   * ```ts
   * const alias = contact.alias()
   * if (alias === null) {
   *   console.log('You have not yet set any alias for contact ' + contact.name())
   * } else {
   *   console.log('You have already set an alias for contact ' + contact.name() + ':' + alias)
   * }
   * ```
   *
   * @example SET the alias for a contact
   * ```ts
   * const ret = await contact.alias('lijiarui')
   * if (ret) {
   *   console.log(`change ${contact.name()}'s alias successfully!`)
   * } else {
   *   console.error('failed to change ${contact.name()}'s alias!')
   * }
   * ```
   *
   * @example DELETE the alias for a contact
   * ```ts
   * const ret = await contact.alias(null)
   * if (ret) {
   *   console.log(`delete ${contact.name()}'s alias successfully!`)
   * } else {
   *   console.log(`failed to delete ${contact.name()}'s alias!`)
   * }
   * ```
   */
  public alias(newAlias?: string|null): Promise<boolean> | string | null {
    log.silly('Contact', 'alias(%s)', newAlias || '')

    if (newAlias === undefined) {
      return this.obj && this.obj.alias || null
    }

    return Config.puppetInstance()
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
                    return false // fail safe
                  })
  }

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
   * try to find a contact by filter: {name: string | RegExp} / {alias: string | RegExp}
   * @description Find contact by name or alias, if the result more than one, return the first one.
   * @static
   * @param {ContactQueryFilter} query
   * @returns {(Promise<Contact | null>)} If can find the contact, return Contact, or return null
   *
   * @example
   * ```ts
   * const contactFindByName = await Contact.find({ name:"ruirui"} )
   * const contactFindByAlias = await Contact.find({ alias:"lijiarui"} )
   * ```
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
   * Load data for Contact by id
   *
   * @static
   * @param {string} id
   * @returns {Contact}
   *
   * @example
   * ```ts
   * // fake: contactId = @0bb3e4dd746fdbd4a80546aef66f4085
   * const contact = Contact.load('@0bb3e4dd746fdbd4a80546aef66f4085')
   * ```
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
   * Say `content` to Contact
   *
   * @param {string} content
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * await contact.say('welcome to wechaty!')
   * ```
   */
  public async say(text: string)
  public async say(mediaMessage: MediaMessage)

  public async say(textOrMedia: string | MediaMessage): Promise<boolean> {
    const content = textOrMedia instanceof MediaMessage ? textOrMedia.filename() : textOrMedia
    log.verbose('Contact', 'say(%s)', content)

    const wechaty = Wechaty.instance()
    const user = wechaty.user()

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

    return await wechaty.send(m)
  }

}

// Contact.search = function(options) {
//   if (options.name) {
//     const regex = new RegExp(options.name)
//     return Object.keys(Contact.pool)
//     .filter(k => regex.test(Contact.pool[k].name()))
//     .map(k => Contact.pool[k])
//   }

//   return []
// }

export default Contact
