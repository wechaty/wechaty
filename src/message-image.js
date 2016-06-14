/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const log = require('./npmlog-env')
const co = require('co')

const Message = require('./message')

class ImageMessage extends Message {
  constructor(rawObj) {
    super(rawObj)
    this.bridge = Message.puppet.bridge
  }
  ready() {
    log.silly('ImageMessage', 'ready()')

    const parentReady = super.ready.bind(this)
    return co.call(this, function* () {
      yield parentReady()
      const url = yield this.getMsgImg(this.id)
      this.obj.url = url

      return this // IMPORTANT! 
    })
    .catch(e => {
      log.warn('ImageMessage', 'ready() exception: %s', e.message)
      throw e
    })
  }
  getMsgImg(id) {
    return this.bridge.getMsgImg(id)
    .catch(e => {
      log.warn('ImageMessage', 'getMsgImg(%d) exception: %s', id, e.message)
      throw e
    })
  }
}

module.exports = ImageMessage
