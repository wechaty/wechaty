/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Web Server for puppet
 *
 * Class PuppetWebServer
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

const log = require('./npmlog-env')

const Express       = require('express')
const EventEmitter  = require('events')

class Server extends EventEmitter {
  constructor(options) {
    super()
    options       = options || {}
    this.port     = options.port || 8788 // W(87) X(88), ascii char code ;-]
  }

  toString() { return `Server({port:${this.port}})` }

  init() {
    log.verbose('PuppetwebServer', 'init()')
    return new Promise((resolve, reject) => {
      // this.initEventsToClient()

      this.express      = this.createExpress()
      this.httpsServer  = this.createHttpsServer(this.express
        , r => resolve(r), e => reject(e)
      )
      this.socketServer = this.createSocketIo(this.httpsServer)
    }).then(r => {
      log.verbose('PuppetWebServer', 'full init()-ed')
      return true
    }).catch(e => {
      log.error('PuppetWebServer', 'init() exception: %s', e.message)
      throw e
    })
  }

  /**
   * Https Server
   */
  createHttpsServer(express, resolve, reject) {
    return https.createServer({
      key:    require('./ssl-pem').key
      , cert: require('./ssl-pem').cert
    }, express) // XXX: is express must exist here? try to get rid it later. 2016/6/11
    .listen(this.port, err => {
      if (err) {
        log.error('PuppetWebServer', 'createHttpsServer() exception: %s', err)
        if (typeof reject === 'function') {
          reject(err)
        }
        return
      }
      log.verbose('PuppetwebServer', `createHttpsServer() listen on port ${this.port}`)
      if (typeof resolve === 'function') {
        resolve(this)
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
      log.silly('PuppetwebServer', 'createExpress() %s GET /ding', new Date())
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
      log.verbose('PuppetWebServer', 'createSocketIo() got connection from browser')
      if (this.socketClient) { this.socketClient = null } // close() ???
      this.socketClient = s
      this.initEventsFromClient(s)
    })
    return socketServer
  }

  initEventsFromClient(client) {
    log.verbose('PuppetWebServer', 'initEventFromClient()')

    this.emit('connection', client)

    client.on('disconnect', e => {
      log.verbose('PuppetwebServer', 'socket.io disconnect: %s', e)
      // 1. Browser reload / 2. Lost connection(Bad network)
      this.socketClient = null
      this.emit('disconnect', e)
    })

    client.on('error' , e => log.error('PuppetwebServer', 'initEventsFromClient() client on error: %s', e.message))
    // client.on('ding'  , e => log.silly('PuppetwebServer', 'initEventsFromClient() client on ding: %s', e))

    // Events from Wechaty@Broswer --to--> Server
    ;[
      'message'
      , 'scan'
      , 'login'
      , 'logout'
      , 'log'
      , 'unload'
      , 'ding'
    ].map(e => {
      client.on(e, data => {
        log.silly('PuppetwebServer', `initEventsFromClient() client on event[${e}](${data}) from browser, emit it`)
        this.emit(e, data)
      })
    })
  }

  // initEventsToClient() {
  //   log.verbose('PuppetwebServer', 'initEventToClient()')
  //   this.on('ding', data => {
  //     log.silly('PuppetwebServer', `recv event[ding](${data}), sending to client`)
  //     if (this.socketClient)  { this.socketClient.emit('ding', data) }
  //     else                    { log.warn('PuppetwebServer', 'this.socketClient not exist')}
  //   })
  // }

  quit() {
    log.verbose('PuppetwebServer', 'quit()')
    if (this.socketServer) {
      log.verbose('PuppetwebServer', 'closing socketServer')
      this.socketServer.close()
      this.socketServer = null
    }
    if (this.socketClient) {
      log.verbose('PuppetwebServer', 'closing socketClient')
      this.socketClient = null
    }
    if (this.httpsServer) {
      log.verbose('PuppetwebServer', 'closing httpsServer')
      this.httpsServer.close()
      this.httpsServer = null
    }
    return Promise.resolve(true)
  }
}

module.exports = Server
