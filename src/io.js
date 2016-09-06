/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class Io
 * http://www.wechaty.io
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const EventEmitter  = require('events')
const WebSocket     = require('ws')
const co            = require('co')

const log           = require('./brolog-env')
const Contact       = require('./contact')
const Config        = require('./config')

class Io {

  constructor({
    wechaty = null
    , token = null
    , endpoint = Config.endpoint
    , protocol = Config.DEFAULT_PROTOCOL
  } = {}) {
    if (!wechaty || !token) {
      throw new Error('Io must has wechaty & token set')
    }
    this.wechaty  = wechaty
    this.uuid     = wechaty.uuid

    this.token    = token
    this.endpoint = endpoint
    
    this.protocol = protocol + '|' + wechaty.uuid
    log.verbose('Io', 'instantiated with endpoint[%s], token[%s], protocol[%s], uuid[%s]', endpoint, token, protocol, this.uuid)

    this._eventBuffer = []

    // this.purpose('offline')
    this.targetState('disconnected')
    this.currentState('disconnected')
  }

  // targetState : 'connected' | 'disconnected'
  targetState(newState) {
    if (newState) {
      log.verbose('Io', 'targetState(%s)', newState)
      this._targetState = newState
    }
    return this._targetState
  }

  // currentState : 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
  currentState(newState) {
    if (newState) {
      log.verbose('Io', 'currentState(%s)', newState)
      this._currentState = newState
    }
    return this._currentState
  }

  // purpose(newPurpose) {
  //   if (newPurpose) {
  //     this._purpose = newPurpose
  //   }
  //   return this._purpose
  // }

  toString() { return 'Class Io(' + this.token + ')'}

  connected() { return this.ws && this.ws.readyState === WebSocket.OPEN }

  init() {
    log.verbose('Io', 'init()')

    // this.purpose('online')
    this.targetState('connected')
    this.currentState('connecting')

    return co.call(this, function* () {
      yield this.initEventHook()
      yield this.initWebSocket()

      this.currentState('connected')
      return this
    }).catch(e => {
      log.warn('Io', 'init() exception: %s', e.message)
      this.currentState('disconnected')
      throw e
    })
  }

  initWebSocket() {
    log.verbose('Io', 'initWebSocket()')
    this.currentState('connecting')

    // const auth = 'Basic ' + new Buffer(this.token + ':X').toString('base64')
    const auth = 'Token ' + this.token
    const headers = { 'Authorization': auth }

    const ws = this.ws = new WebSocket(this.endpoint, this.protocol, { headers })

    ws.on('open', function open() {
      if (this.protocol !== ws.protocol) {
        log.error('Io', 'initWebSocket() require protocol[%s] failed', this.protocol)
        // XXX deal with error?
      }
      log.verbose('Io', 'initWebSocket() connected with protocol [%s]', ws.protocol)
      this.currentState('connected')

      // FIXME: how to keep alive???
      ws._socket.setKeepAlive(true, 100)

      this.reconnectTimeout = null

      const initEvent = {
        name: 'sys'
        , payload: 'Wechaty version ' + this.wechaty.version() + ` with UUID: ${this.uuid}`
      }
      this.send(initEvent)
      
    }.bind(this))

    ws.on('message', (data, flags) => {
      log.silly('Io', 'initWebSocket() ws.on(message): %s', data)
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.
      
      const ioEvent = {
        name: 'raw'
        , payload: data
      }
      
      try {
        const obj = JSON.parse(data)
        ioEvent.name    = obj.name
        ioEvent.payload = obj.payload
      } catch (e) {
        log.verbose('Io', 'on(message) recv a non IoEvent data[%s]', data)
      }

      switch (ioEvent.name) {
        case 'botie':
          const payload = ioEvent.payload
          if (payload.onMessage) {
            const script = payload.script
            const fn = eval(script)
            if (typeof fn === 'function') {
              this.onMessage = fn
            } else {
              log.warn('Io', 'server pushed function is invalid')
            }
          }
          break
        
        case 'reset':
          log.verbose('Io', 'on(reset): %s', ioEvent.payload)
          this.wechaty.reset()
          break
          
        case 'shutdown':
          log.warn('Io', 'on(shutdown): %s', ioEvent.payload)
          process.exit(0)
          break

        case 'update':
          log.verbose('Io', 'on(report): %s', ioEvent.payload)
          const user = this.wechaty.user()
          if (user) {
            const loginEvent = {
              name:       'login'
              , payload:  user.obj
            }
            this.send(loginEvent)
          } 
          
          const scan = this.wechaty && this.wechaty.puppet && this.wechaty.puppet.scan
          if (scan) {
            const scanEvent = {
              name: 'scan'
              , payload: scan
            }
            this.send(scanEvent)
          }
          
          break
          
        case 'sys':
          // do nothing
          break
          
        default:
          log.warn('Io', 'UNKNOWN on(%s): %s', ioEvent.name, ioEvent.payload)
          break
      }
    })

    ws.on('error', e => {
      log.warn('Io', 'initWebSocket() error event[%s]', e.message)
      this.wechaty.emit('error', e)

      // when `error`, there must have already a `close` event
      // we should not call this.reconnect() again
      //
      // this.close()
      // this.reconnect()
    })
    .on('close', (code, message) => {
      log.warn('Io', 'initWebSocket() close event[%d: %s]', code, message)
      ws.close()
      this.reconnect()
    })

    return Promise.resolve(ws)
  }

  reconnect() {
    log.verbose('Io', 'reconnect()')

    // if (this.purpose() === 'offline') {
    //   log.verbose('Io', 'reconnect() canceled because purpose() === offline')
    //   return
    // }
    if (this.targetState() === 'disconnected') {
      log.verbose('Io', 'reconnect() canceled because targetState() === disconnected')
      return
    }

    if (this.connected()) {
      log.warn('Io', 'reconnect() on a already connected io')
      return
    }
    if (this.reconnectTimer) {
      log.warn('Io', 'reconnect() on a already re-connecting io')
      return
    }

    if (!this.reconnectTimeout) {
      this.reconnectTimeout = 1
    } else if (this.reconnectTimeout < 10000) {
      this.reconnectTimeout *= 3
    }
    
    log.warn('Io', 'reconnect() will reconnect after %d s', Math.floor(this.reconnectTimeout/1000))
    this.reconnectTimer = setTimeout(_ => {
      this.reconnectTimer = null
      this.initWebSocket()
    }, this.reconnectTimeout)
  }

  initEventHook() {
    const wechaty = this.wechaty

    wechaty.on('message', this.ioMessage)

    const hookEvents = [
      'scan'
      , 'login'
      , 'logout'
      , 'heartbeat'
      , 'error'
    ]
    hookEvents.map(event => {
      wechaty.on(event, data => {
        const ioEvent = {
          name:       event
          , payload:  data
        }
        
        switch (event) {
          case 'login':
          case 'logout':
            if (data instanceof Contact) {
              ioEvent.payload = data.obj
            }
            break
          
          case 'error':
            ioEvent.payload = data.toString()
            break

          case 'heartbeat':
            ioEvent.payload = {
              uuid: this.uuid
              , data: data
            }
            break
            
          default:
            break
        }
      
        this.send(ioEvent)
      })
    })

    // wechaty.on('message', m => {
    //   const text = (m.room() ? '['+m.room().name()+']' : '')
    //               + '<'+m.from().name()+'>'
    //               + ':' + m.toStringDigest()
    //   const messageEvent = {
    //     name:       'message'
    //     , payload:  text
    //   }
    //   this.send(messageEvent)
    // })
    
    return Promise.resolve()
  }

  send(ioEvent) {
    if (ioEvent) {
      log.silly('Io', 'send(%s: %s)', ioEvent.name, ioEvent.payload)
      this._eventBuffer.push(ioEvent)
    } else { log.silly('Io', 'send()') }

    if (!this.connected()) {
      log.verbose('Io', 'send() without a connected websocket, eventBuffer.length = %d', this._eventBuffer.length)
      return false
    }

    while (this._eventBuffer.length) {
      this.ws.send(
        JSON.stringify(
          this._eventBuffer.shift()
        )
      )
    }
  }
  
  close() {
    log.verbose('Io', 'close()')
    this.targetState('disconnected')
    this.currentState('disconnecting')

    this.ws.close()
    this.currentState('disconnected')
    // TODO: remove listener for this.wechaty.on(message )
    return Promise.resolve()
  }

  quit() {
    // this.purpose('offline')
    this.targetState('disconnected')
    this.currentState('disconnecting')

    // try to send IoEvents in buffer
    this.send()
    this._eventBuffer = []

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.recnnectTimer = null
    }
    this.close()

    this.currentState('disconnected')
    return Promise.resolve()
  }
  /**
   *
   * Prepare to be overwriten by server setting
   *
   */
  ioMessage(m) {
    log.verbose('Io', 'ioMessage() is a nop function before be overwriten from cloud')
  }
  
}

/**
 * Expose `Wechaty`.
 */
module.exports = Io.default = Io.Io = Io
