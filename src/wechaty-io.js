/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class WechatyIo
 * http://www.wechaty.io
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const EventEmitter  = require('events')
const WebSocket     = require('ws');
const co            = require('co')

const log           = require('./npmlog-env')

class WechatyIo {

  constructor({
    wechaty = null
    , token = null
  }) {
    // super()
    if (!wechaty || !token) {
      throw new Error('WechatyIo must has wechaty & token set')
    }
    this.wechaty  = wechaty
    this.token    = token
    log.verbose('WechatyIo', 'instantiated with token: ' + token)
  }

  toString() { return 'Class WechatyIo(' + this.token + ')'}

  init() {
    log.verbose('WechatyIo', 'init()')

    return co.call(this, function* () {
      yield this.initWechaty()
      yield this.initWebSocket()

      return this
    }).catch(e => {
      log.warn('WechatyIo', 'init() exception: %s', e.message)
      throw e
    })
  }

  initWebSocket(endpoint) {
    endpoint = endpoint || 'ws://api.wechaty.io/v0/websocket'
    const ws = this.ws = new WebSocket(endpoint)

    ws.on('open', function open() {
      log.verbose('WechatyIo', 'WebSocket connected')

      ws.send('Wechaty version ' + this.wechaty.version())
    })

    ws.on('message', function(data, flags) {
      log.verbose('WechatyIo', 'WebSocket got message')
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.
      console.log('io message: %s', data)

      if (data.onMessage) {
        const script = data.script
        const fn = eval(script)
        if (typeof fn === 'function') {
          this.onMessage = fn
        } else {
          log.warn('WechatyIo', 'onMessage server push function invalid')
        }
      }
    })

    return Promise.resolve()
  }

  initWechaty() {
    const wechaty = this.wechaty

    wechaty.on('message', this.ioMessage)

    const ioEvents = [
      'scan'
      , 'login'
      , 'logout'
      , 'error'
    ]
    ioEvents.map(event => {
      wechaty.on(event, data => {
        this.ws.send({
          event
          , data
        })
      })
    })

    return Promise.resolve()
  }

  /**
   *
   * Prepare to be overwriten by server setting
   *
   */
  ioMessage(m) {
    log.verbose('WechatyIo', 'ioMessage() is a nop function before be overwriten from cloud')
  }
}

/**
 * Expose `Wechaty`.
 */
module.exports = WechatyIo.default = WechatyIo.WechatyIo = WechatyIo
/*

www.wechaty.io

www
api
test

*/
