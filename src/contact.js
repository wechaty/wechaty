/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const log = require('npmlog')

class Contact {
  constructor(id) {
    if (!Contact.puppet) {
      throw new Error('no puppet attached to Contact')
    }
    log.silly('Contact', `constructor(${id})`)

    this.id = id
    this.obj = {}

  }

  ready(contactGetter) {
    log.silly('Contact', 'ready(' + typeof contactGetter + ')')
    if (this.obj.id) {
      return Promise.resolve(this)
    }
    contactGetter = contactGetter || Contact.puppet.getContact.bind(Contact.puppet)
    return contactGetter(this.id)
    .then(data => {
      log.silly('Contact', `contactGetter(${this.id}) resolved`)
      this.rawObj = data
      this.obj    = this.parse(data)
      return this
    }).catch(e => {
      log.error('Contact', `contactGetter(${this.id}) rejected: ` + e)
      throw new Error('contactGetter: ' + e)
    })
  }

  parse(rawObj) {
    return !rawObj ? {} : {
      id:       rawObj.UserName
      , weixin: rawObj.Alias
      , name:   rawObj.NickName
      , remark: rawObj.RemarkName
      , sex:    rawObj.Sex
      , province:   rawObj.Province
      , city:       rawObj.City
      , signature:  rawObj.Signature
    }
  }

  dumpRaw() {
    console.error('======= dump raw contact =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`))
  }
  dump()    {
    console.error('======= dump contact =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`))
  }

  toString() {
    return `Contact(${this.id})`
  }

  getId() { return this.id }

  get(prop) { return this.obj[prop] }

  send(message) {

  }

  static find() {
  }

  static findAll() {
  }
}

Contact.init = function() { Contact.pool = {} }
Contact.init()
Contact.load = function(id) {
  if (id in Contact.pool) {
    return Contact.pool[id]
  }
  return Contact.pool[id] = new Contact(id)
}

Contact.attach = function(puppet) { Contact.puppet = puppet }

module.exports = Contact
