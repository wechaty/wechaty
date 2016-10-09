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
import * as io          from 'socket.io'
import * as https       from 'https'
import * as bodyParser  from 'body-parser'

import * as Express       from 'express'
import { EventEmitter } from 'events'

import log     from '../brolog-env'

class Server extends EventEmitter {
  private express:      Express.Application
  private httpsServer:  https.Server

  private socketServer: SocketIO.Server
  private socketClient: SocketIO.Socket

  constructor(
    private port: number
  ) {
    super()

    if (!port) {
      throw new Error('port not found')
    }

    // this.port = port
  }

  public toString() { return `Server({port:${this.port}})` }

  public async init(): Promise<Server> {
    log.verbose('PuppetWebServer', `init() on port ${this.port}`)

    // return new Promise((resolve, reject) => {
      // this.initEventsToClient()
    try {
      this.express      = this.createExpress()
      this.httpsServer  = await this.createHttpsServer(this.express)
        // , r => resolve(r), e => reject(e)
      this.socketServer = this.createSocketIo(this.httpsServer)

      log.verbose('PuppetWebServer', 'init()-ed')
      return this
    } catch (e) {
    // .catch(e => {
      log.error('PuppetWebServer', 'init() exception: %s', e.message)
      throw e
    }
  }

  /**
   * Https Server
   */
  private createHttpsServer(express: Express.Application): Promise<https.Server> {
    return new Promise((resolve, reject) => {
      https.createServer({
                            key:    require('./ssl-pem').key
                            , cert: require('./ssl-pem').cert
                          }
                        , express
                        ) // XXX: is express must exist here? try to get rid it later. 2016/6/11
          .listen(this.port, err => {
            if (err) {
              log.error('PuppetWebServer', 'createHttpsServer() exception: %s', err)
              return reject(err)
            } else {
              log.verbose('PuppetWebServer', `createHttpsServer() listen on port ${this.port}`)
              resolve(this)
            }
          })
    })
  }

  /**
   * Express Middleware
   */
  private createExpress() {
    const e = Express()
    e.use(bodyParser.json())
    e.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      next()
    })
    e.get('/ding', function(req, res) {
      log.silly('PuppetWebServer', 'createExpress() %s GET /ding', new Date())
      res.end('dong')
    })
    return e
  }

  /**
   * Socket IO
   */
  private createSocketIo(httpsServer) {
    const socketServer = io.listen(httpsServer, {
      // log: true
    })
    socketServer.sockets.on('connection', (s) => {
      log.verbose('PuppetWebServer', 'createSocketIo() got connection from browser')
      // console.log(s.handshake)
      if (this.socketClient) { this.socketClient = undefined } // close() ???
      this.socketClient = s
      this.initEventsFromClient(s)
    })
    return socketServer
  }

  private initEventsFromClient(client) {
    log.verbose('PuppetWebServer', 'initEventFromClient()')

    this.emit('connection', client)

    client.on('disconnect', e => {
      log.silly('PuppetWebServer', 'socket.io disconnect: %s', e)
      // 1. Browser reload / 2. Lost connection(Bad network)
      this.socketClient = undefined
      this.emit('disconnect', e)
    })

    client.on('error' , e => {
      // log.error('PuppetWebServer', 'initEventsFromClient() client on error: %s', e)
      log.error('PuppetWebServer', 'initEventsFromClient() client on error: %s', e.stack)
    })

    // Events from Wechaty@Broswer --to--> Server
    ; [
      'message'
      , 'scan'
      , 'login'
      , 'logout'
      , 'log'
      , 'unload'  // @depreciated 20160825 zixia
                  // when `unload` there should always be a `disconnect` event?
      , 'ding'
    ].map(e => {
      client.on(e, data => {
        // log.silly('PuppetWebServer', `initEventsFromClient() forward client event[${e}](${data}) from browser by emit it`)
        this.emit(e, data)
      })
    })
  }

  public quit() {
    log.verbose('PuppetWebServer', 'quit()')
    if (this.socketServer) {
      log.verbose('PuppetWebServer', 'closing socketServer')
      this.socketServer.close()
      this.socketServer = null
    }
    if (this.socketClient) {
      log.verbose('PuppetWebServer', 'closing socketClient')
      this.socketClient = null
    }
    if (this.httpsServer) {
      log.verbose('PuppetWebServer', 'closing httpsServer')
      this.httpsServer.close()
      this.httpsServer = null
    }
    return Promise.resolve(true)
  }
}

// module.exports = Server
export default Server
