/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for puppet
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const fs          = require('fs')
const io          = require('socket.io')
const path        = require('path')
const https       = require('https')
const bodyParser  = require('body-parser')
const log         = require('npmlog')

const Express       = require('express')
const EventEmitter  = require('events')

class Server extends EventEmitter {
  constructor(options) {
    super()
    options       = options || {}
    this.port     = options.port || 8788 // W(87) X(88), ascii char code ;-]
  }

  toString() { return `Class Wechaty.Puppet.Web.Server({port:${this.port}})` }

  init() {
    log.verbose('Server', 'init()')
    this.initEventsToClient()
    return new Promise((resolve, reject) => {
      this.express      = this.createExpress()
      this.httpsServer  = this.createHttpsServer(this.express
        , r => resolve(r), e => reject(e)
      )
      this.socketServer = this.createSocketIo(this.httpsServer)
    })
  }

  /**
   * Https Server
   */
  createHttpsServer(express, resolve, reject) {
    return https.createServer({
      key:    require('./ssl-pem').key
      , cert: require('./ssl-pem').cert
    }, express)
    .listen(this.port, () => {
      log.verbose('Server', `createHttpsServer listen on port ${this.port}`)
      if (typeof resolve === 'function') {
        resolve(this)
      }
    })
    .on('error', e => {
      log.error('Server', 'createHttpsServer:' + e)
      if (typeof reject === 'function') {
        reject(e)
      }
    })
  }

  /**
   * Express Middleware
   */
  createExpress() {
    const e = new Express()
    e.use(bodyParser.json())
    e.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      next()
    })
    e.get('/ding', function(req, res) {
      log.silly('Server', '%s GET /ding', new Date())
      res.end('dong')
    })
    return e
  }

  /**
   * Socket IO
   */
  createSocketIo(httpsServer) {
    const socketServer = io.listen(httpsServer, {
      // log: true
    })
    socketServer.sockets.on('connection', (s) => {
      log.verbose('Server', 'got connection from browser')
      if (this.socketClient) { this.socketClient = null } // close() ???
      this.socketClient = s
      this.initEventsFromClient(s)
    })
    return socketServer
  }

  initEventsFromClient(client) {
    log.verbose('Server', 'initEventFromClient()')

    this.emit('connection', client)

    client.on('disconnect', e => {
      log.verbose('Server', 'socket.io disconnect: %s', e)
      // 1. Browser reload / 2. Lost connection(Bad network)
      this.socketClient = null
      this.emit('disconnect', e)
    })

    client.on('error', e => log.error('Server', 'socketio client error: %s', e))

    // Events from Wechaty@Broswer --to--> Server
    ;[
      'message'
      , 'scan'
      , 'login'
      , 'logout'
      , 'log'
      , 'unload'
      , 'dong'
    ].map(e => {
      client.on(e, data => {
        log.silly('Server', `recv event[${e}](${data}) from browser`)
        this.emit(e, data)
      })
    })
  }

  initEventsToClient() {
    log.verbose('Server', 'initEventToClient()')
    this.on('ding', data => {
      log.silly('Server', `recv event[ding](${data}), sending to client`)
      if (this.socketClient)  { this.socketClient.emit('ding', data) }
      else                    { log.warn('Server', 'this.socketClient not exist')}
    })
  }

  quit() {
    log.verbose('Server', 'quit()')
    if (this.socketServer) {
      log.verbose('Server', 'close socketServer')
      this.socketServer.close()
      this.socketServer = null
    }
    if (this.socketClient) {
      log.verbose('Server', 'close socketClient')
      this.socketClient = null
    }
    if (this.httpsServer) {
      log.verbose('Server', 'close httpsServer')
      this.httpsServer.close()
      this.httpsServer = null
    }
  }
}

module.exports = Server
