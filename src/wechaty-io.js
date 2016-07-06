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
const WebSocket     = require('ws')
const co            = require('co')

const log           = require('./npmlog-env')

class WechatyIo {

  constructor({
    wechaty = null
    , token = null
    , endpoint = 'wss://api.wechaty.io/v0/websocket'
    , protocol = 'io|0.0.1'
  }) {
    // super()
    if (!wechaty || !token) {
      throw new Error('WechatyIo must has wechaty & token set')
    }
    this.wechaty  = wechaty
    this.token    = token
    this.endpoint = endpoint
    this.protocol = protocol
    log.verbose('WechatyIo', 'instantiated with endpoint[%s], token[%s], protocol[%s]', endpoint, token, protocol)
  }

  toString() { return 'Class WechatyIo(' + this.token + ')'}

  connected() { return this.ws && this.ws.readyState === WebSocket.OPEN }

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

  initWebSocket() {
    // const auth = 'Basic ' + new Buffer(this.token + ':X').toString('base64')
    const auth = 'Token ' + this.token
    const headers = { 'Authorization': auth }

    const ws = this.ws = new WebSocket(this.endpoint, this.protocol, { headers })

    ws.on('open', function open() {
      if (this.protocol !== ws.protocol) {
        log.error('WechatyIo', 'initWebSocket() require protocol[%s] failed', this.protocol)
        // XXX deal with error?
      }
      log.verbose('WechatyIo', 'initWebSocket() connected with protocol [%s]', ws.protocol)

      ws._socket.setKeepAlive(true, 30000)

      this.reconnectTimeout = null
      ws.send('Wechaty version ' + this.wechaty.version())
    }.bind(this))

    ws.on('message', function(data, flags) {
      log.verbose('WechatyIo', 'WebSocket got message')
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.
      log.verbose('WechatyIo', 'onMessage: %s', data)

      if (data.onMessage) {
        const script = data.script
        const fn = eval(script)
        if (typeof fn === 'function') {
          this.onMessage = fn
        } else {
          log.warn('WechatyIo', 'onMessage server push function invalid')
        }
      }
    }.bind(this))

    ws
    .on('close', e => {
      log.verbose('WechatyIo', 'initWebSocket() close event[%s]', e)
      ws.close()
      this.reconnect()
    })
    .on('error', e => {
      log.verbose('WechatyIo', 'initWebSocket() error event[%s]', e.message)
      this.wechaty.emit('error', e)

      this.close()
      this.reconnect()
    })

    return Promise.resolve()
  }

  reconnect() {
    if (this.connected()) {
      log.warn('WechatyIo', 'reconnect() on a already connected io')
    } else if (this.reconnectTimer) {
      log.warn('WechatyIo', 'reconnect() on a already re-connecting io')
    } else {
      if (!this.reconnectTimeout) {
        this.reconnectTimeout = 100
      } else if (this.reconnectTimeout < 10000) {
        this.reconnectTimeout *= 2
      }
      log.warn('WechatyIo', 'reconnect() will reconnect after %d s', Math.floor(this.reconnectTimeout/1000))
      this.reconnectTimer = setTimeout(_ => {
        this.reconnectTimer = null
        this.initWebSocket()
      }, this.reconnectTimeout)
    }
  }

  initWechaty() {
    const wechaty = this.wechaty

    wechaty.on('message', this.ioMessage)

    const ioEvents = [
      'scan'
      , 'login'
      , 'logout'
      , 'error'
      , 'heartbeat'
    ]
    ioEvents.map(event => {
      wechaty.on(event, data => {
        if (!this.connected()) {
          log.verbose('WechatyIo', 'initWechaty() on event[%s] without a connected websocket', event)
          return
        }
        this.ws.send(
          JSON.stringify(
            {
              event
              , data
            }
          )
        )
      })
    })

    return Promise.resolve()
  }

  close() {
    this.ws.close()
    // TODO: remove listener for this.wechaty.on(message )
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
