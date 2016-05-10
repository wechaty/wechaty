/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

const Contact = require('./contact')
const Group   = require('./group')
const log     = require('npmlog')

class Message {
  constructor(rawObj) {
    this.rawObj = rawObj = rawObj || {}

    Message.counter++

    // Transform rawObj to local m
    this.obj = {
      id:         rawObj.MsgId
      , type:     rawObj.MsgType
      , from:     Contact.load(rawObj.MMActualSender)
      , to:       Contact.load(rawObj.ToUserName)
      , group:    rawObj.MMIsChatRoom ? new Group(rawObj.FromUserName) : null // MMPeerUserName always eq FromUserName ?
      , content:  rawObj.MMActualContent // Content has @id prefix added by wx
      , status:   rawObj.Status

      , digest:   rawObj.MMDigest
      , actual_content: rawObj.MMActualContent
      , date:     new Date(rawObj.MMDisplayTime*1000)
    }
  }

  toString() {
    const name  = this.obj.from.get('name')
    const group = this.obj.group
    let content = this.obj.content
    if (content.length > 20) content = content.substring(0,17) + '...';
    if (group)  return `Message(${name}@${group}: ${content})`
    else        return `Message(${name}: ${content})`
  }

  ready() {
    return new Promise((resolve, reject) => {
      this.obj.from.ready()           // Contact from
      .then(r => this.obj.to.ready()) // Contact to
      .then(r => resolve(this))
      .catch(e => reject(e))
    })
  }

  get(prop) {
    if (!prop || !(prop in this.obj)) {
      const s = '[' + Object.keys(this.obj).join(',') + ']'
      throw new Error(`Message.get(${prop}) must be in: ${s}`)
    }
    return this.obj[prop]
  }

  set(prop, value) {
    this.obj[prop] = value
  }

  dump() { 
    console.error('======= dump message =======') 
    Object.keys(this.obj).forEach(k => console.error(`${k}: ${this.obj[k]}`)) 
  }
  dumpRaw() { 
    console.error('======= dump raw message =======')
    Object.keys(this.rawObj).forEach(k => console.error(`${k}: ${this.rawObj[k]}`)) 
  }

  getCount() { return Message.counter }

  static find(selector, option) {
    return new Message({MsgId: '-1'})
  }

  static findAll(selector, option) {
    return [
      new Message   ({MsgId: '-2'})
      , new Message ({MsgId: '-3'})
    ]
  }
}

Message.counter = 0

module.exports = Message
