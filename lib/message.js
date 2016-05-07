//const EventEmitter = require('events')

class Message {
  constructor(rawObj) {
    this.rawObj = rawObj

    // Transform rawObj to local m
    this.m = {
      id:         rawObj.MsgId
      , type:     rawObj.MsgType
      , from:     rawObj.MMActualSender
      , content:  rawObj.MMActualContent
      , status:   rawObj.Status

      , digest:   rawObj.MMDigest
      , to:       rawObj.MMPeerUserName
      , actual_content: rawObj.MMActualContent
      , group:    rawObj.MMIsChatRoom ? rawObj.FromUserName : null
      , date:     new Date(rawObj.MMDisplayTime*1000)
    }
  }

  get(prop) {
    if (!prop || !(prop in this.m)) {
      const s = '[' + Object.keys(this.m).join(',') + ']'
      throw new Error(`Message.get(${prop}) must be in: ${s}`)
    }
    return this.m[prop]
  }

  dump() { 
    console.log('======= dump message =======') 
    Object.keys(this.m).forEach(k => console.log(`${k}: ${this.m[k]}`)) 
  }
  dumpRaw() { 
    console.log('======= dump raw message =======')
    Object.keys(this.rawObj).forEach(k => console.log(`${k}: ${this.rawObj[k]}`)) 
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
