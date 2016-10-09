/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
// const co = require('co')

import Config   from './config'
import Message  from './message'
import UtilLib  from './util-lib'

import log      from './brolog-env'

class MediaMessage extends Message {
  constructor(rawObj) {
    super(rawObj)
    this.bridge = Config.puppetInstance()
                        .bridge
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
      return UtilLib.downloadStream(this.obj.url, cookies)
    })
    .catch(e => {
      log.warn('MediaMessage', 'stream() exception: %s', e.message)
      throw e
    })
  }
}

// module.exports = MediaMessage.default = MediaMessage.MediaMessage = MediaMessage
export default MediaMessage
