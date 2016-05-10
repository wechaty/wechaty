/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const log = require('npmlog')
const Contact = require('./contact')

class Group {
  constructor(id) {
    this.id = id

    if (!Group.puppet) throw new Error('no puppet attached to Group');
    log.silly('Group', `constructor(${id})`)

    this.id = id
    this.obj = {}

    this.loading = Group.puppet.getContact(id)
    .then(data => {
      log.silly('Group', `Group.puppet.getContact(${id}) resolved`)
      this.rawObj = data
      this.obj    = this.parse(data)
    }).catch(e => { 
      log.error('Group', `Group.puppet.getContact(${id}) rejected: ` + e)
      throw new Error('getContact: ' + e) 
    })

  }

  toString() { return this.obj.name ? this.obj.name : this.id }

  getId() { return this.id }

  ready() {
    const timeout   = 1 * 1000  // 1 seconds
    const sleepTime = 100       // 100 ms
    let   spentTime = 0

    return new Promise((resolve, reject) => {
      return readyChecker.apply(this)
      function readyChecker() {
        log.verbose('Group', `readyChecker(${spentTime})`)
        if (this.obj.id) return resolve(this);

        spentTime += sleepTime
        if (spentTime > timeout) 
          return reject('Group.ready() timeout after ' + timeout + ' ms');

        return setTimeout(readyChecker.bind(this), sleepTime)
      }
    })
  }

  parse(rawObj) {
    return !rawObj ? {} : {
      id:         rawObj.UserName
      , name:     rawObj.NickName
      , members:  rawObj.MemberList.map(m => {
        return {
          contact:  Contact.load(m.UserName)
          , name:   m.DisplayName
        }
      })
    }
  }

  dumpRaw() { 
    console.error('======= dump raw group =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`)) 
  }
  dump()    { 
    console.error('======= dump group =======')
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`)) 
  }

  toString() {
    return `Group(${this.id})`
  }

  getId() { return this.id }

  get(prop) { return this.obj[prop] }



  static find() {
  }

  static findAll() {
  }
}
Group.init = function () { Group.pool = {} } 
Group.init()
Group.load = function (id) {
  if (id in Group.pool) {
    return Group.pool[id]
  }
  return Group.pool[id] = new Group(id)
}
Group.attach = function (puppet) { Group.puppet = puppet }

module.exports = Group
