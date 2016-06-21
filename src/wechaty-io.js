/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class WechatyIo
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const EventEmitter  = require('events')
const WebSocket     = require('ws');
const co            = require('co')

const log           = require('./npmlog-env')

class WechatyIo extends EventEmitter {

  constructor({
    token = null
  }) {
    super()
    this.token = token
    log.verbose('WechatyIo', 'instantiated with token: ' + token)
  }

  toString() { return 'Class WechatyIo(' + this.token + ')'}

  init() {
    log.verbose('WechatyIo', 'init()')

    const END_POINT = 'ws://api.wechaty.io/v0/websocket'
    var ws = new WebSocket(END_POINT)
    ws.on('open', function open() {
      ws.send('something')
    })

    ws.on('message', function(data, flags) {
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.
    })

    return Promise.resolve(this)
  }
}

/**
 * Expose `Wechaty`.
 */
module.exports = WechatyIo.default = WechatyIo.WechatyIo = WechatyIo
