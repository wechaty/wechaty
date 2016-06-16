/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const co = require('co')

const log = require('./npmlog-env')
const webUtil = require('./web-util')
const Message = require('./message')

class MediaMessage extends Message {
  constructor(rawObj) {
    super(rawObj)
    this.bridge = Message.puppet.bridge
  }
  ready() {
    log.silly('MediaMessage', 'ready()')

    const parentReady = super.ready.bind(this)
    return co.call(this, function* () {
      yield parentReady()
      const url = yield this.getMsgImg(this.id)
      this.obj.url = url

      return this // IMPORTANT!
    })
    .catch(e => {
      log.warn('MediaMessage', 'ready() exception: %s', e.message)
      throw e
    })
  }
  getMsgImg(id) {
    return this.bridge.getMsgImg(id)
    .catch(e => {
      log.warn('MediaMessage', 'getMsgImg(%d) exception: %s', id, e.message)
      throw e
    })
  }

  readyStream() {
    return this.ready()
    .then(() => {
      return Message.puppet.browser.checkSession()
    })
    .then(cookies => {
      return webUtil.downloadStream(this.obj.url, cookies)
    })
    .catch(e => {
      log.warn('MediaMessage', 'stream() exception: %s', e.message)
      throw e
    })
  }
}

module.exports = MediaMessage
