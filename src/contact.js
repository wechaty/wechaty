/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

class Contact {
  constructor(id) {
    if (!Contact.puppet) throw new Error('no puppet attached to Contact');

    this.id = id
    this.obj = {}

    Contact.puppet.getContact(id)
    .then(data => {
      this.rawObj = data
      this.obj = this.parse(this.rawObj)
    }).catch(e => { 
      throw new Error('getContact: ' + e) 
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
    return `Contact({id:${this.id})`
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

Contact.pool = {}
Contact.load = function (id) {
  if (id in Contact.pool) {
    return Contact.pool[id]
  }
  return Contact.pool[id] = new Contact(id)
}

Contact.attach = function (puppet) { Contact.puppet = puppet }

module.exports = Contact
