/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const Wechaty = require('./wechaty')
const { log }     = require('./brolog-env')
const { UtilLib } = require('./util-lib')
const { Config }  = require('./config')

class Contact {
  constructor(id) {
    log.silly('Contact', `constructor(${id})`)

    if (id && typeof id !== 'string') { throw new Error('id must be string if provided. we got: ' + typeof id) }
    this.id   = id
    this.obj  = {}
  }

  toString()  { return this.id }
  toStringEx() { return `Contact(${this.obj.name}[${this.id}])` }

  parse(rawObj) {
    return !rawObj ? {} : {
      id:           rawObj.UserName
      , uin:        rawObj.Uin    // stable id? 4763975 || getCookie("wxuin")
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

  name()    { return UtilLib.plainText(this.obj.name) }
  remark()  { return this.obj.remark }
  stranger()    { return this.obj.stranger }
  star()        { return this.obj.star }
  get(prop) { return this.obj[prop] }

  ready(contactGetter) {
    log.silly('Contact', 'ready(' + (contactGetter ? typeof contactGetter : '') + ')')
    if (!this.id) {
      log.warn('Contact', 'ready() call on an un-inited contact')
      return Promise.resolve(this)
    }

    if (this.obj.id) { // already ready
      return Promise.resolve(this)
    }

    if (!contactGetter) {
      if (!Config.puppetInstance()) { throw new Error('Config.puppetInstance() is not found by Contact') }

      log.silly('Contact', 'get contact via ' + Config.puppetInstance().constructor.name)
      contactGetter = Config.puppetInstance()
                              .getContact.bind(Config.puppetInstance())
    }
    return contactGetter(this.id)
            .then(data => {
              log.silly('Contact', `contactGetter(${this.id}) resolved`)
              this.rawObj = data
              this.obj    = this.parse(data)
              return this
            }).catch(e => {
              log.error('Contact', `contactGetter(${this.id}) exception: %s`, e.message)
              throw e
            })
  }

  dumpRaw() {
    console.error('======= dump raw contact =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }
  dump()    {
    console.error('======= dump contact =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
  }

  static find() {
    return new Contact('-1')
  }

  static findAll() {
    return [
      new Contact   ('-2')
      , new Contact ('-3')
    ]
  }
}

Contact.init = function() { Contact.pool = {} }
Contact.init()

Contact.load = function(id) {
  if (!id) { return null }

  if (!(id in Contact.pool)) {
    Contact.pool[id] = new Contact(id)
  }
  return Contact.pool[id]
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

// Contact.attach = function(puppet) {
//   log.warn('Contact', '@deprecated attach() to %s', puppet && puppet.constructor.name)
//   // Config.puppetInstance(puppet)
// }

module.exports = Contact.default = Contact.Contact = Contact
