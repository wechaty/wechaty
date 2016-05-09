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

class Message {
  constructor(rawObj) {
    this.rawObj = rawObj = rawObj || {}

    // Transform rawObj to local m
    this.obj = {
      id:         rawObj.MsgId
      , type:     rawObj.MsgType
      , from:     Contact.load(rawObj.MMActualSender)
      , to:       Contact.load(rawObj.MMPeerUserName)
      , group:    rawObj.MMIsChatRoom ? new Group(rawObj.FromUserName) : null
      , content:  rawObj.MMActualContent
      , status:   rawObj.Status

      , digest:   rawObj.MMDigest
      , actual_content: rawObj.MMActualContent
      , date:     new Date(rawObj.MMDisplayTime*1000)
    }
  }

  toString() {
    const name  = this.obj.from.get('name')
    let content = this.obj.content
    if (content.length > 20) content = content.substring(0,17) + '...';
    return `Message("${name}: ${content}")`
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

module.exports = Message
