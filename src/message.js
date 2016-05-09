//const EventEmitter = require('events')
const Contact = require('./contact')
const Group   = require('./group')

class Message {
  constructor(rawObj) {
    this.rawObj = rawObj = rawObj || {}

    // Transform rawObj to local m
    this.m = {
      id:         rawObj.MsgId
      , type:     rawObj.MsgType
      , from:     new Contact(rawObj.MMActualSender)
      , to:       new Contact(rawObj.MMPeerUserName)
      , group:    rawObj.MMIsChatRoom ? new Group(rawObj.FromUserName) : null
      , content:  rawObj.MMActualContent
      , status:   rawObj.Status

      , digest:   rawObj.MMDigest
      , actual_content: rawObj.MMActualContent
      , date:     new Date(rawObj.MMDisplayTime*1000)
    }
  }

  toString() {
    const id    = this.m.id
    // Contact
    const from  = this.m.from.getId()
    const to    = this.m.to.getId()
    //return `Class Message({id:${id}, from:${from}, to:${to})`
    const content = this.m.content
    if (content.length > 20) content = content.substring(0,17) + '...';
    return `Class Message("${content}")`
  }

  get(prop) {
    if (!prop || !(prop in this.m)) {
      const s = '[' + Object.keys(this.m).join(',') + ']'
      throw new Error(`Message.get(${prop}) must be in: ${s}`)
    }
    return this.m[prop]
  }

  set(prop, value) {
    this.m[prop] = value
  }

  dump() { 
    console.error('======= dump message =======') 
    Object.keys(this.m).forEach(k => console.error(`${k}: ${this.m[k]}`)) 
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
