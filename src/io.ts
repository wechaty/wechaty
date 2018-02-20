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
import * as WebSocket from 'ws'
import StateSwitch    from 'state-switch'

import PuppetWeb  from './puppet-web/'

import {
  config,
  log,
}                 from './config'
import Wechaty    from './wechaty'

export interface IoOptions {
  wechaty:    Wechaty,
  token:      string,
  apihost?:   string,
  protocol?:  string,
}

type IoEventName =  'botie'
                  | 'error'
                  | 'heartbeat'
                  | 'login'
                  | 'logout'
                  | 'message'
                  | 'update'
                  | 'raw'
                  | 'reset'
                  | 'scan'
                  | 'sys'
                  | 'shutdown'

interface IoEvent {
  name:     IoEventName,
  payload:  any,
}

export class Io {
  public uuid: string

  private protocol    : string
  private eventBuffer : IoEvent[] = []
  private ws          : WebSocket

  private state = new StateSwitch('Io', log)

  private reconnectTimer: NodeJS.Timer | null
  private reconnectTimeout: number | null

  private onMessage: Function

  constructor(
    private options: IoOptions,
  ) {
    options.apihost   = options.apihost   || config.apihost
    options.protocol  = options.protocol  || config.default.DEFAULT_PROTOCOL

    this.uuid = options.wechaty.uuid

    this.protocol = options.protocol + '|' + options.wechaty.uuid
    log.verbose('Io', 'instantiated with apihost[%s], token[%s], protocol[%s], uuid[%s]',
                      options.apihost,
                      options.token,
                      options.protocol,
                      this.uuid,
              )
  }

  public toString() {
    return `Io<${this.options.token}>`
  }

  private connected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }

  public async init(): Promise<void> {
    log.verbose('Io', 'init()')

    this.state.on('pending')

    try {
      await this.initEventHook()
      this.ws = this.initWebSocket()

      this.state.on(true)

      return
    } catch (e) {
      log.warn('Io', 'init() exception: %s', e.message)
      this.state.off(true)
      throw e
    }
  }

  private initEventHook() {
    log.verbose('Io', 'initEventHook()')
    const wechaty = this.options.wechaty

    wechaty.on('error'    , error =>        this.send({ name: 'error',      payload: error }))
    wechaty.on('heartbeat', data  =>        this.send({ name: 'heartbeat',  payload: { uuid: this.uuid, data } }))
    wechaty.on('login',     user =>         this.send({ name: 'login',      payload: user }))
    wechaty.on('logout' ,   user =>         this.send({ name: 'logout',     payload: user }))
    wechaty.on('message',   message =>      this.ioMessage(message))
    wechaty.on('scan',      (url, code) =>  this.send({ name: 'scan',       payload: { url, code } }))

    // const hookEvents: WechatyEventName[] = [
    //   'scan'
    //   , 'login'
    //   , 'logout'
    //   , 'heartbeat'
    //   , 'error'
    // ]
    // hookEvents.map(event => {
    //   wechaty.on(event, (data) => {
    //     const ioEvent: IoEvent = {
    //       name:       event
    //       , payload:  data
    //     }

    //     switch (event) {
    //       case 'login':
    //       case 'logout':
    //         if (data instanceof Contact) {
    //           // ioEvent.payload = data.obj
    //           ioEvent.payload = data
    //         }
    //         break

    //       case 'error':
    //         ioEvent.payload = data.toString()
    //         break

        //   case 'heartbeat':
        //     ioEvent.payload = {
        //       uuid: this.uuid
        //       , data: data
        //     }
        //     break

        //   default:
        //     break
        // }

    //     this.send(ioEvent)
    //   })
    // })

    // wechaty.on('message', m => {
    //   const text = (m.room() ? '[' + m.room().topic() + ']' : '')
    //               + '<' + m.from().name() + '>'
    //               + ':' + m.toStringDigest()

    //   this.send({ name: 'message', payload:  text })
    // })

    return
  }

  private initWebSocket() {
    log.verbose('Io', 'initWebSocket()')
    // this.state.current('on', false)

    // const auth = 'Basic ' + new Buffer(this.setting.token + ':X').toString('base64')
    const auth = 'Token ' + this.options.token
    const headers = { 'Authorization': auth }

    if (!this.options.apihost) {
      throw new Error('no apihost')
    }
    let endpoint = 'wss://' + this.options.apihost + '/v0/websocket'

    // XXX quick and dirty: use no ssl for APIHOST other than official
    // FIXME: use a configuarable VARIABLE for the domain name at here:
    if (!/api\.chatie\.io/.test(this.options.apihost)) {
      endpoint = 'ws://' + this.options.apihost + '/v0/websocket'
    }

    const ws = this.ws = new WebSocket(endpoint, this.protocol, { headers })

    ws.on('open',     () => this.wsOnOpen(ws))
    ws.on('message',  data => this.wsOnMessage(data))
    ws.on('error',    e => this.wsOnError(e))
    ws.on('close',    (code, reason) => this.wsOnClose(ws, code, reason))

    return ws
  }

  private wsOnOpen(ws: WebSocket): void {
    if (this.protocol !== ws.protocol) {
      log.error('Io', 'initWebSocket() require protocol[%s] failed', this.protocol)
      // XXX deal with error?
    }
    log.verbose('Io', 'initWebSocket() connected with protocol [%s]', ws.protocol)
    // this.currentState('connected')
    // this.state.current('on')

    // FIXME: how to keep alive???
    // ws._socket.setKeepAlive(true, 100)

    this.reconnectTimeout = null

    const name    = 'sys'
    const payload = 'Wechaty version ' + this.options.wechaty.version() + ` with UUID: ${this.uuid}`

    const initEvent: IoEvent = {
      name,
      payload,
    }
    this.send(initEvent)
  }

  private wsOnMessage(data: WebSocket.Data) {
    log.silly('Io', 'initWebSocket() ws.on(message): %s', data)
    // flags.binary will be set if a binary data is received.
    // flags.masked will be set if the data was masked.

    if (typeof data !== 'string') {
      throw new Error('data should be string...')
    }

    const ioEvent: IoEvent = {
      name    : 'raw',
      payload : data,
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
          try {
            /* tslint:disable:no-eval */
            const fn = eval(script)
            if (typeof fn === 'function') {
              this.onMessage = fn
            } else {
              log.warn('Io', 'server pushed function is invalid')
            }
          } catch (e) {
            log.warn('Io', 'server pushed function exception: %s', e)
            this.options.wechaty.emit('error', e)
          }
        }
        break

      case 'reset':
        log.verbose('Io', 'on(reset): %s', ioEvent.payload)
        this.options.wechaty.reset(ioEvent.payload)
        break

      case 'shutdown':
        log.info('Io', 'on(shutdown): %s', ioEvent.payload)
        process.exit(0)
        break

      case 'update':
        log.verbose('Io', 'on(report): %s', ioEvent.payload)
        const user = this.options.wechaty.puppet ? this.options.wechaty.puppet.user : null

        if (user) {
          const loginEvent: IoEvent = {
            name    : 'login',
            payload : user.obj,
          }
          this.send(loginEvent)
        }

        const puppet = this.options.wechaty.puppet
        if (puppet instanceof PuppetWeb) {
          const scanInfo = puppet.scanInfo
          if (scanInfo) {
            const scanEvent: IoEvent = {
              name: 'scan',
              payload: scanInfo,
            }
            this.send(scanEvent)
          }
        }

        break

      case 'sys':
        // do nothing
        break

      case 'logout':
        log.info('Io', 'on(logout): %s', ioEvent.payload)
        this.options.wechaty.logout()
        break

      default:
        log.warn('Io', 'UNKNOWN on(%s): %s', ioEvent.name, ioEvent.payload)
        break
    }
  }

  // FIXME: it seems the parameter `e` might be `undefined`.
  // @types/ws might has bug for `ws.on('error',    e => this.wsOnError(e))`
  private wsOnError(e?: Error) {
    log.warn('Io', 'initWebSocket() error event[%s]', e && e.message)
    this.options.wechaty.emit('error', e)

    // when `error`, there must have already a `close` event
    // we should not call this.reconnect() again
    //
    // this.close()
    // this.reconnect()
  }

  private wsOnClose(
    ws      : WebSocket,
    code    : number,
    message : string,
  ): void {
    log.warn('Io', 'initWebSocket() close event[%d: %s]', code, message)
    ws.close()
    this.reconnect()
  }

  private reconnect() {
    log.verbose('Io', 'reconnect()')

    if (this.state.off()) {
      log.warn('Io', 'reconnect() canceled because state.target() === offline')
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
    } else if (this.reconnectTimeout < 10 * 1000) {
      this.reconnectTimeout *= 3
    }

    log.warn('Io', 'reconnect() will reconnect after %d s', Math.floor(this.reconnectTimeout / 1000))
    this.reconnectTimer = setTimeout(_ => {
      this.reconnectTimer = null
      this.initWebSocket()
    }, this.reconnectTimeout)// as any as NodeJS.Timer
  }

  private async send(ioEvent?: IoEvent): Promise<void> {
    if (ioEvent) {
      log.silly('Io', 'send(%s: %s)', ioEvent.name, ioEvent.payload)
      this.eventBuffer.push(ioEvent)
    } else { log.silly('Io', 'send()') }

    if (!this.connected()) {
      log.verbose('Io', 'send() without a connected websocket, eventBuffer.length = %d', this.eventBuffer.length)
      return
    }

    const list: Promise<any>[] = []
    while (this.eventBuffer.length) {
      const p = new Promise((resolve, reject) => this.ws.send(
        JSON.stringify(
          this.eventBuffer.shift(),
        ),
        (err: Error) => {
          if (err)  { reject(err) }
          else      { resolve()   }
        },
      ))
      list.push(p)
    }

    try {
      await Promise.all(list)
    } catch (e) {
      log.error('Io', 'send() exceptio: %s', e.stack)
      throw e
    }
  }

  public async quit(): Promise<void> {
    this.state.off('pending')

    // try to send IoEvents in buffer
    await this.send()
    this.eventBuffer = []

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.ws.close()

    this.state.off(true)

    return
  }
  /**
   *
   * Prepare to be overwriten by server setting
   *
   */
  private async ioMessage(m): Promise<void> {
    log.silly('Io', 'ioMessage() is a nop function before be overwriten from cloud')
    if (typeof this.onMessage === 'function') {
      await this.onMessage(m)
    }
  }

}

export default Io
