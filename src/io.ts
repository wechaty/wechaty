/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
import WebSocket        from 'ws'

import {
  StateSwitch,
  EventScanPayload,
}                         from 'wechaty-puppet'

import {
  Peer,
  JsonRpcPayload,
  JsonRpcPayloadResponse,
  parse,
}                         from 'json-rpc-peer'

import {
  Message,
}                 from './user/mod.js'

import {
  config,
  log,
}                 from './config.js'
import {
  AnyFunction,
}                 from './types.js'
import {
  Wechaty,
}                 from './wechaty.js'

import {
  getPeer,
  isJsonRpcRequest,
}                   from './io-peer/io-peer.js'

export interface IoOptions {
  wechaty      : Wechaty,
  token        : string,
  apihost?     : string,
  protocol?    : string,
  servicePort? : number,
}

export const IO_EVENT_DICT = {
  botie     : 'tbw',
  error     : 'tbw',
  heartbeat : 'tbw',
  jsonrpc   : 'JSON RPC',
  login     : 'tbw',
  logout    : 'tbw',
  message   : 'tbw',
  raw       : 'tbw',
  reset     : 'tbw',
  scan      : 'tbw',
  shutdown  : 'tbw',
  sys       : 'tbw',
  update    : 'tbw',
}

type IoEventName = keyof typeof IO_EVENT_DICT

interface IoEventScan {
  name    : 'scan',
  payload : EventScanPayload,
}

interface IoEventJsonRpc {
  name: 'jsonrpc',
  payload: JsonRpcPayload,
}

interface IoEventAny {
  name:     IoEventName,
  payload:  any,
}

type IoEvent = IoEventScan | IoEventJsonRpc | IoEventAny

/**
 * https://github.com/Chatie/botie/issues/2
 *  https://github.com/actions/github-script/blob/f035cea4677903b153fa754aa8c2bba66f8dc3eb/src/async-function.ts#L6
 */
const AsyncFunction = Object.getPrototypeOf(async () => null).constructor

// function callAsyncFunction<U extends {} = {}, V = unknown> (
//   args: U,
//   source: string
// ): Promise<V> {
//   const fn = new AsyncFunction(...Object.keys(args), source)
//   return fn(...Object.values(args))
// }

export class Io {

  private readonly id       : string
  private readonly protocol : string
  private eventBuffer       : IoEvent[] = []
  private ws                : undefined | WebSocket

  private readonly state = new StateSwitch('Io', { log })

  private reconnectTimer?   : ReturnType<typeof setTimeout>
  private reconnectTimeout? : number

  private lifeTimer? : ReturnType<typeof setTimeout>

  private onMessage: undefined | AnyFunction

  private scanPayload?: EventScanPayload

  protected jsonRpc?: Peer

  constructor (
    private options: IoOptions,
  ) {
    options.apihost   = options.apihost   || config.apihost
    options.protocol  = options.protocol  || config.default.DEFAULT_PROTOCOL

    this.id = options.wechaty.id

    this.protocol = options.protocol + '|' + options.wechaty.id + '|' + config.serviceIp + '|' + options.servicePort
    log.verbose('Io', 'instantiated with apihost[%s], token[%s], protocol[%s], cuid[%s]',
      options.apihost,
      options.token,
      options.protocol,
      this.id,
    )

    if (options.servicePort) {
      this.jsonRpc = getPeer({
        serviceGrpcPort: this.options.servicePort!,
      })
    }

  }

  public toString () {
    return `Io<${this.options.token}>`
  }

  private connected () {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }

  public async start (): Promise<void> {
    log.verbose('Io', 'start()')

    if (this.lifeTimer) {
      throw new Error('lifeTimer exist')
    }

    this.state.on('pending')

    try {
      this.initEventHook()

      this.ws = await this.initWebSocket()

      this.options.wechaty.on('login', () => { this.scanPayload = undefined })
      this.options.wechaty.on('scan', (qrcode, status) => {
        this.scanPayload = {
          ...this.scanPayload,
          qrcode,
          status,
        }
      })

      this.lifeTimer = setInterval(() => {
        if (this.ws && this.connected()) {
          log.silly('Io', 'start() setInterval() ws.ping()')
          // TODO: check 'pong' event on ws
          this.ws.ping()
        }
      }, 1000 * 10)

      this.state.on(true)

    } catch (e) {
      log.warn('Io', 'start() exception: %s', (e as Error).message)
      this.state.off(true)
      throw e
    }
  }

  private initEventHook () {
    log.verbose('Io', 'initEventHook()')
    const wechaty = this.options.wechaty

    wechaty.on('error',     error =>        this.send({ name: 'error',      payload: error }))
    wechaty.on('heartbeat', data  =>        this.send({ name: 'heartbeat',  payload: { cuid: this.id, data } }))
    wechaty.on('login',     user =>         this.send({ name: 'login',      payload: user.payload }))
    wechaty.on('logout',    user =>         this.send({ name: 'logout',     payload: user.payload }))
    wechaty.on('message',   message =>      this.ioMessage(message))

    // FIXME: payload schema need to be defined universal
    // wechaty.on('scan',      (url, code) =>  this.send({ name: 'scan',       payload: { url, code } }))
    wechaty.on('scan',      (qrcode, status) =>  this.send({ name: 'scan',  payload: { qrcode, status } } as IoEventScan))
  }

  private async initWebSocket (): Promise<WebSocket> {
    log.verbose('Io', 'initWebSocket()')
    // this.state.current('on', false)

    // const auth = 'Basic ' + new Buffer(this.setting.token + ':X').toString('base64')
    const auth = 'Token ' + this.options.token
    const headers = { Authorization: auth }

    if (!this.options.apihost) {
      throw new Error('no apihost')
    }
    let endpoint = 'wss://' + this.options.apihost + '/v0/websocket'

    // XXX quick and dirty: use no ssl for API_HOST other than official
    // FIXME: use a configurable VARIABLE for the domain name at here:
    if (!/api\.chatie\.io/.test(this.options.apihost)) {
      endpoint = 'ws://' + this.options.apihost + '/v0/websocket'
    }

    const ws = this.ws = new WebSocket(endpoint, this.protocol, { headers })

    ws.on('open',     () => this.wsOnOpen(ws))
    ws.on('message',  data => this.wsOnMessage(data))
    ws.on('error',    e => this.wsOnError(e))
    ws.on('close',    (code, reason) => this.wsOnClose(ws, code, reason))

    await new Promise((resolve, reject) => {
      ws.once('open', resolve)
      ws.once('error', reject)
      ws.once('close', reject)
    })

    return ws
  }

  private async wsOnOpen (ws: WebSocket): Promise<void> {
    if (this.protocol !== ws.protocol) {
      log.error('Io', 'initWebSocket() require protocol[%s] failed', this.protocol)
      // XXX deal with error?
    }
    log.verbose('Io', 'initWebSocket() connected with protocol [%s]', ws.protocol)
    // this.currentState('connected')
    // this.state.current('on')

    // FIXME: how to keep alive???
    // ws._socket.setKeepAlive(true, 100)

    this.reconnectTimeout = undefined

    const name    = 'sys'
    const payload = 'Wechaty version ' + this.options.wechaty.version() + ` with CUID: ${this.id}`

    const initEvent: IoEvent = {
      name,
      payload,
    }
    await this.send(initEvent)
  }

  private async wsOnMessage (data: WebSocket.Data) {
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
        {
          const payload = ioEvent.payload

          const args   = payload.args
          const source = payload.source

          try {
            if (args[0] === 'message' && args.length === 1) {
              const fn = new AsyncFunction(...args, source)
              this.onMessage = fn
            } else {
              log.warn('Io', 'server pushed function is invalid. args: %s', JSON.stringify(args))
            }
          } catch (e) {
            log.warn('Io', 'server pushed function exception: %s', e)
            this.options.wechaty.emit('error', (e as Error))
          }
        }
        break

      case 'reset':
        log.verbose('Io', 'on(reset): %s', ioEvent.payload)
        await this.options.wechaty.reset(ioEvent.payload)
        break

      case 'shutdown':
        log.info('Io', 'on(shutdown): %s', ioEvent.payload)
        process.exit(0)
        // eslint-disable-next-line
        break

      case 'update':
        log.verbose('Io', 'on(update): %s', ioEvent.payload)
        {
          const wechaty = this.options.wechaty
          if (wechaty.logonoff()) {
            const loginEvent: IoEvent = {
              name    : 'login',
              payload : (wechaty.userSelf() as any).payload,
            }
            await this.send(loginEvent)
          }

          if (this.scanPayload) {
            const scanEvent: IoEventScan = {
              name:     'scan',
              payload:  this.scanPayload,
            }
            await this.send(scanEvent)
          }
        }

        break

      case 'sys':
        // do nothing
        break

      case 'logout':
        log.info('Io', 'on(logout): %s', ioEvent.payload)
        await this.options.wechaty.logout()
        break

      case 'jsonrpc':
        log.info('Io', 'on(jsonrpc): %s', ioEvent.payload)

        try {
          const request = (ioEvent as IoEventJsonRpc).payload
          if (!isJsonRpcRequest(request)) {
            log.warn('Io', 'on(jsonrpc) payload is not a jsonrpc request: %s', JSON.stringify(request))
            return
          }

          if (!this.jsonRpc) {
            throw new Error('jsonRpc not initialized!')
          }

          const response = await this.jsonRpc.exec(request)
          if (!response) {
            log.warn('Io', 'on(jsonrpc) response is undefined.')
            return
          }
          const payload = parse(response) as JsonRpcPayloadResponse

          const jsonrpcEvent: IoEventJsonRpc = {
            name: 'jsonrpc',
            payload,
          }

          log.verbose('Io', 'on(jsonrpc) send(%s)', response)
          await this.send(jsonrpcEvent)

        } catch (e) {
          log.error('Io', 'on(jsonrpc): %s', e)
        }

        break

      default:
        log.warn('Io', 'UNKNOWN on(%s): %s', ioEvent.name, ioEvent.payload)
        break
    }
  }

  // FIXME: it seems the parameter `e` might be `undefined`.
  // @types/ws might has bug for `ws.on('error',    e => this.wsOnError(e))`
  private wsOnError (e?: Error) {
    log.warn('Io', 'initWebSocket() error event[%s]', e && e.message)
    if (!e) {
      return
    }
    this.options.wechaty.emit('error', e)

    // when `error`, there must have already a `close` event
    // we should not call this.reconnect() again
    //
    // this.close()
    // this.reconnect()
  }

  private wsOnClose (
    ws      : WebSocket,
    code    : number,
    message : string,
  ): void {
    if (this.state.on()) {
      log.warn('Io', 'initWebSocket() close event[%d: %s]', code, message)
      ws.close()
      this.reconnect()
    }
  }

  private reconnect () {
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
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined
      await this.initWebSocket()
    }, this.reconnectTimeout)// as any as NodeJS.Timer
  }

  private async send (ioEvent?: IoEvent): Promise<void> {
    if (!this.ws) {
      throw new Error('no ws')
    }

    const ws = this.ws

    if (ioEvent) {
      log.silly('Io', 'send(%s)', JSON.stringify(ioEvent))
      this.eventBuffer.push(ioEvent)
    } else { log.silly('Io', 'send()') }

    if (!this.connected()) {
      log.verbose('Io', 'send() without a connected websocket, eventBuffer.length = %d', this.eventBuffer.length)
      return
    }

    const list: Array<Promise<any>> = []
    while (this.eventBuffer.length) {
      const data = JSON.stringify(
        this.eventBuffer.shift(),
      )
      const p = new Promise<void>((resolve, reject) => ws.send(
        data,
        (err: undefined | Error) => {
          if (err)  {
            reject(err)
          } else {
            resolve()
          }
        },
      ))
      list.push(p)
    }

    try {
      await Promise.all(list)
    } catch (e) {
      log.error('Io', 'send() exception: %s', (e as Error).stack)
      throw e
    }
  }

  public async stop (): Promise<void> {
    log.verbose('Io', 'stop()')

    if (!this.ws) {
      throw new Error('no ws')
    }

    this.state.off('pending')

    // try to send IoEvents in buffer
    await this.send()
    this.eventBuffer = []

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (this.lifeTimer) {
      clearInterval(this.lifeTimer)
      this.lifeTimer = undefined
    }

    this.ws.close()
    await new Promise<void>(resolve => {
      if (this.ws) {
        this.ws.once('close', resolve)
      } else {
        resolve()
      }
    })
    this.ws = undefined

    this.state.off(true)
  }

  /**
   *
   * Prepare to be overwritten by server setting
   *
   */
  private async ioMessage (m: Message): Promise<void> {
    log.silly('Io', 'ioMessage() is a nop function before be overwritten from cloud')
    if (typeof this.onMessage === 'function') {
      await this.onMessage(m)
    }
  }

  protected async syncMessage (m: Message): Promise<void> {
    log.silly('Io', 'syncMessage(%s)', m)

    const messageEvent: IoEvent = {
      name    : 'message',
      payload : (m as any).payload,
    }
    await this.send(messageEvent)
  }

}
