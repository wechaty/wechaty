/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import * as bodyParser  from 'body-parser'
import { EventEmitter } from 'events'
import * as express     from 'express'
import * as https       from 'https'
import * as WebSocket   from 'ws'

import { log }          from '../config'

export interface WechatyBroEvent {
  name: string,
  data: string | object,
}

export class Server extends EventEmitter {
  private express:      express.Application
  private httpsServer:  https.Server | null

  public socketServer: WebSocket.Server | null
  public socketClient: WebSocket | null

  constructor(private port: number) {
    super()
  }

  public toString() { return `Server({port:${this.port}})` }

  public async init(): Promise<void> {
    log.verbose('PuppetWebServer', `init() on port ${this.port}`)

    try {
      this.createExpress()
      await this.createHttpsServer(this.express)
      this.createWebSocketServer(this.httpsServer)

      return

    } catch (e) {
      log.error('PuppetWebServer', 'init() exception: %s', e.message)
      throw e
    }
  }

  /**
   * Https Server
   */
  public async createHttpsServer(express: express.Application): Promise<https.Server> {
    this.httpsServer = <https.Server>await new Promise((resolve, reject) => {

      const srv = https.createServer({
        key:  require('./ssl-pem').key,
        cert: require('./ssl-pem').cert,
      }, express) // XXX: is express must exist here? try to get rid it later. 2016/6/11

      srv.listen(this.port, err => {
        if (err) {
          log.error('PuppetWebServer', 'createHttpsServer() exception: %s', err)
          return reject(err)
        } else {
          log.verbose('PuppetWebServer', `createHttpsServer() listen on port ${this.port}`)
          resolve(srv)
        }
      })

    })

    return this.httpsServer
  }

  /**
   * express Middleware
   */
  public createExpress(): express.Application {
    this.express = express()
    this.express.use(bodyParser.json())
    this.express.use(function(req, res, next) {
      // cannot use `*` if angular is set `.withCredentials = true`
      // see also: https://github.com/whatwg/fetch/issues/251#issuecomment-199946808
      // res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Origin', req.headers['origin'] as string)
      res.header('Access-Control-Allow-Credentials', 'true')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      next()
    })
    this.express.get('/ding', function(req, res) {
      log.silly('PuppetWebServer', 'createexpress() %s GET /ding', new Date())
      res.end('dong')
    })
    return this.express
  }

  /**
   * Socket IO
   */
  public createWebSocketServer(httpsServer): WebSocket.Server {
    this.socketServer = new WebSocket.Server({
      server: httpsServer,
    })
    this.socketServer.on('connection', client => {
      log.verbose('PuppetWebServer', 'createWebSocketServer() got connection from browser')
      if (this.socketClient) {
        log.warn('PuppetWebServer', 'createWebSocketServer() on(connection) there already has a this.socketClient')
        this.socketClient = null // close() ???
      }
      this.socketClient = client
      this.initEventsFromClient(client)
    })
    return this.socketServer
  }

  private initEventsFromClient(client: WebSocket): void {
    log.verbose('PuppetWebServer', 'initEventFromClient()')

    this.emit('connection', client)
    client.on('open', () => {
      log.silly('PuppetWebServer', 'initEventsFromClient() on(open) WebSocket opened')
    })

    client.on('close', e => {
      log.silly('PuppetWebServer', 'initEventsFromClient() on(disconnect) WebSocket disconnect: %s', e)
      // 1. Browser reload / 2. Lost connection(Bad network)
      this.socketClient = null
      this.emit('disconnect', e)
    })

    client.on('error' , e => {
      // log.error('PuppetWebServer', 'initEventsFromClient() client on error: %s', e)
      log.error('PuppetWebServer', 'initEventsFromClient() on(error): %s', e.stack)
    })

    client.on('message', data => {
      const obj = JSON.parse(data as string) as WechatyBroEvent
      this.emit(obj.name, obj.data)
    })

    return
  }

  public async quit(): Promise<void> {
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
    return
  }
}

export default Server
export {
  Server as PuppetWebServer,
}
