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
    this.obj = {}
    log.silly('Group', `constructor(${id})`)
    if (!Group.puppet) throw new Error('no puppet attached to Group');
  }

  toString()  { return this.obj.name ? this.obj.name : this.id }
  getId()     { return this.id }

  ready(contactGetter) {
    log.silly('Group', 'ready()')
    if (this.obj.id) return resolve(this);

    contactGetter = contactGetter || Group.puppet.getContact.bind(Group.puppet)
    return Group.puppet.getContact(this.id)
    .then(data => {
      log.silly('Group', `Group.puppet.getContact(${this.id}) resolved`)
      this.rawObj = data
      this.obj    = this.parse(data)
      return this
    }).catch(e => { 
      log.error('Group', `Group.puppet.getContact(${this.id}) rejected: ` + e)
      throw new Error('getContact: ' + e) 
    })
  }

  parse(rawObj) {
    return !rawObj ? {} : {
      id:         rawObj.UserName
      , encryId:  rawObj.EncryChatRoomId // ???
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
