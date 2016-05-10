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
    if (!Contact.puppet) throw new Error('no puppet attached to Contact');
    log.silly('Contact', `constructor(${id})`)

    this.id = id
    this.obj = {}

    this.loading = Contact.puppet.getContact(id)
    .then(data => {
      log.silly('Contact', `Contact.puppet.getContact(${id}) resolved`)
      this.rawObj = data
      this.obj    = this.parse(data)
      return new Promise(r => r())
    }).catch(e => { 
      log.error('Contact', `Contact.puppet.getContact(${id}) rejected: ` + e)
      throw new Error('getContact: ' + e) 
    })
  }

  ready() {
    const timeout   = 1 * 1000  // 1 seconds
    const sleepTime = 500       // 100 ms
    let   spentTime = 0

    return new Promise((resolve, reject) => {
      return readyChecker.apply(this)
      function readyChecker() {
        log.verbose('Contact', `readyChecker(${spentTime})`)
        if (this.obj.id) return resolve(this);

        spentTime += sleepTime
        if (spentTime > timeout) 
          return reject('Contact.ready() timeout after ' + timeout + ' ms');

        return setTimeout(readyChecker.bind(this), sleepTime)
      }
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

Contact.init = function () { Contact.pool = {} } 
Contact.init()
Contact.load = function (id) {
  if (id in Contact.pool) {
    return Contact.pool[id]
  }
  return Contact.pool[id] = new Contact(id)
}

Contact.attach = function (puppet) { Contact.puppet = puppet }

module.exports = Contact
