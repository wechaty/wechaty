/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const log = require('./npmlog-env')

const Message = require('./message')

class ImageMessage extends Message {
  constructor(rawObj) {
    super(rawObj)
  }
}

module.exports = ImageMessage
