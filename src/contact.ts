/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
import {
    Config
  , Sayable
}               from './config'
import { Message }  from './message'
import { UtilLib }  from './util-lib'
import { Wechaty }  from './wechaty'
import { log }      from './brolog-env'

type ContactObj = {
  address:    string
  city:       string
  id:         string
  name:       string
  province:   string
  remark:     string|null
  sex:        string
  signature:  string
  star:       boolean
  stranger:   boolean
  uin:        string
  weixin:     string
}

export type ContactRawObj = {
  Alias:        string
  City:         string
  NickName:     string
  Province:     string
  RemarkName:   string
  Sex:          string
  Signature:    string
  StarFriend:   string
  Uin:          string
  UserName:     string

  stranger:     string // assign by injectio.js
}

export type ContactQueryFilter = {
  name: string | RegExp
}

export class Contact implements Sayable {
  private static pool = new Map<string, Contact>()

  private obj: ContactObj | null
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
    return this.obj.remark || this.obj.name || this.id
  }

  public toStringEx() { return `Contact(${this.obj && this.obj.name}[${this.id}])` }

  private parse(rawObj: ContactRawObj): ContactObj | null {
    if (!rawObj) {
      log.warn('Contact', 'parse() got empty rawObj!')
    }

    return !rawObj ? null : {
      id:           rawObj.UserName // MMActualSender??? MMPeerUserName??? `getUserContact(message.MMActualSender,message.MMPeerUserName).HeadImgUrl`
      , uin:        rawObj.Uin    // stable id: 4763975 || getCookie("wxuin")
      , weixin:     rawObj.Alias  // Wechat ID
      , name:       rawObj.NickName
      , remark:     rawObj.RemarkName
      , sex:        rawObj.Sex
      , province:   rawObj.Province
      , city:       rawObj.City
      , signature:  rawObj.Signature

      , address:    rawObj.Alias // XXX: need a stable address for user

      , star:       !!rawObj.StarFriend
      , stranger:   !!rawObj.stranger // assign by injectio.js
    }
  }

  public weixin()    { return this.obj && this.obj.weixin || '' }
  public name()      { return UtilLib.plainText(this.obj && this.obj.name || '') }
  public stranger()  { return this.obj && this.obj.stranger }
  public star()      { return this.obj && this.obj.star }

  public get(prop)   { return this.obj && this.obj[prop] }

  public isReady(): boolean {
    return !!(this.obj && this.obj.id && this.obj.name !== undefined)
  }

  // public refresh() {
  //   log.warn('Contact', 'refresh() DEPRECATED. use reload() instead.')
  //   return this.reload()
  // }

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

  public self(): boolean {
    const userId = Config.puppetInstance()
                          .userId

    const selfId = this.id

    if (!userId || !selfId) {
      throw new Error('no user or no self id')
    }

    return selfId === userId
  }

  public static findAll(query?: ContactQueryFilter): Promise<Contact[]> {
    if (!query) {
      query = { name: /.*/ }
    }
    log.verbose('Cotnact', 'findAll({ name: %s })', query.name)

    const nameFilter = query.name

    if (!nameFilter) {
      throw new Error('nameFilter not found')
    }

    /**
     * must be string because we need inject variable value
     * into code as variable name
     */
    let filterFunction: string

    if (nameFilter instanceof RegExp) {
      filterFunction = `(function (c) { return ${nameFilter.toString()}.test(c) })`
    } else if (typeof nameFilter === 'string') {
      filterFunction = `(function (c) { return c === '${nameFilter}' })`
    } else {
      throw new Error('unsupport name type')
    }

    return Config.puppetInstance()
                  .contactFind(filterFunction)
                  .catch(e => {
                    log.error('Contact', 'findAll() rejected: %s', e.message)
                    return [] // fail safe
                  })
  }

  /**
   * get the remark for contact
   */
  public remark(): string
  /**
   * set the remark for contact
   */
  public remark(newRemark: string): Promise<boolean>
  /**
   * delete the remark for a contact
   */
  public remark(empty: null): Promise<boolean>

  public remark(newRemark?: string|null): Promise<boolean> | string {
    log.silly('Contact', 'remark(%s)', newRemark || '')

    if (newRemark === undefined) {
      return this.obj && this.obj.remark || ''
    }

    return Config.puppetInstance()
                  .contactRemark(this, newRemark)
                  .then(ret => {
                    if (ret) {
                      if (this.obj) {
                        this.obj.remark = newRemark
                      } else {
                        log.error('Contact', 'remark() with null this.obj?')
                      }
                    } else {
                      log.warn('Contact', 'remark(%s) fail', newRemark)
                    }
                    return ret
                  })
                  .catch(e => {
                    log.error('Contact', 'remark(%s) rejected: %s', newRemark, e.message)
                    return false // fail safe
                  })
  }

  /**
   * try to find a contact by filter: {name: string | RegExp}
   */
  public static async find(query: ContactQueryFilter): Promise<Contact> {
    log.verbose('Contact', 'find(%s)', query.name)

    const contactList = await Contact.findAll(query)
    if (!contactList || !contactList.length) {
      throw new Error('find not found any contact')
    }
    return contactList[0]
  }

  public static load(id: string): Contact {
    if (!id || typeof id !== 'string') {
      throw new Error('Contact.load(): id not found')
    }

    if (!(id in Contact.pool)) {
      Contact.pool[id] = new Contact(id)
    }
    return Contact.pool[id]
  }

  public async say(content: string): Promise<void> {
    log.verbose('Contact', 'say(%s)', content)

    const wechaty = Wechaty.instance()
    const user = wechaty.user()

    if (!user) {
      throw new Error('no user')
    }
    const m = new Message()
    m.from(user)
    m.to(this)
    m.content(content)

    log.silly('Contact', 'say() from: %s to: %s content: %s', user.name(), this.name(), content)

    await wechaty.send(m)
    return
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
