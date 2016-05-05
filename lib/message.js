//const EventEmitter = require('events')

class Message {
  constructor(rawObj) {
    this.rawObj = rawObj

    // Transform rawObj to local m
    this.m = {
      id:         rawObj.MsgId
      , from:     rawObj.FromUserName
      , type:     rawObj.MsgType
      , content:  rawObj.Content
      , status:   rawObj.Status

      , digest:   rawObj.MMDigest
      , to:       rawObj.MMPeerUserName
      , actual_content: rawObj.MMActualContent
      , group:    rawObj.MMIsChatRoom ? rawObj.ToUserName : null
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
