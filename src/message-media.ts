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

import { Bridge }   from './puppet-web/'

class MediaMessage extends Message {
  private bridge: Bridge

  constructor(rawObj) {
    super(rawObj)
    this.bridge = Config.puppetInstance()
                        .bridge
  }
  public async ready(): Promise<MediaMessage> {
    log.silly('MediaMessage', 'ready()')

    const parentReady = super.ready.bind(this)
    // return co.call(this, function* () {
    try {
      await parentReady()
      const url = await this.getMsgImg(this.id)
      this.obj.url = url

      return this // IMPORTANT!
    } catch (e) {
      log.warn('MediaMessage', 'ready() exception: %s', e.message)
      throw e
    }
    // return co.call(this, function* () {
    //   yield parentReady()
    //   const url = yield this.getMsgImg(this.id)
    //   this.obj.url = url

    //   return this // IMPORTANT!
    // })
    // .catch(e => {
    //   log.warn('MediaMessage', 'ready() exception: %s', e.message)
    //   throw e
    // })
  }
  private getMsgImg(id: string): Promise<string> {
    return this.bridge.getMsgImg(id)
    .catch(e => {
      log.warn('MediaMessage', 'getMsgImg(%d) exception: %s', id, e.message)
      throw e
    })
  }

  public readyStream(): Promise<NodeJS.ReadableStream> {
    return this.ready()
    .then(() => {
      return Config.puppetInstance()
                    .browser.checkSession()
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
