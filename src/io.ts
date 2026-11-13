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

/**
 * Cloud WebSocket bridge (`Io`) connecting a `Wechaty` instance to a remote
 * Chatie/Wechaty IO endpoint.
 *
 * Owns its WebSocket connection, keep-alive ping timer, exponential-backoff
 * reconnect timer, and per-run `Wechaty` event subscriptions through
 * `LifecycleController` and `ResourceScope` without `state-switch`:
 *   - Detaches all 8 `Wechaty` listeners on `stop()` or failed `start()`
 *   - Reconnects on socket close only while genuinely `running` (never during
 *     an uncompleted `starting` handshake)
 *   - Settles `stop()` immediately if the WebSocket is already `CLOSED`
 *   - Routes remote `reset` and `shutdown` commands through `Wechaty` lifecycle
 *     methods instead of bypassing authority or calling `process.exit(0)`
 */
import WebSocket        from 'ws'

import type * as PUPPET from 'wechaty-puppet'

import * as jsonRpcPeer from 'json-rpc-peer'

import {
  type LifecycleCallOptions,
  LifecycleController,
  type LifecycleState,
  toAbortError,
}                           from './lifecycle/mod.ts'
import type {
  MessageInterface,
}                     from './user-modules/mod.ts'
import type { WechatyInterface } from './wechaty/mod.ts'

import {
  log,
  config,
}                 from './config.ts'

import {
  getPeer,
  isJsonRpcRequest,
}                   from './io-peer/io-peer.ts'

export interface WebSocketLike {
  readonly protocol: string
  readonly readyState: number
  on (event: string, listener: (...args: any[]) => void): unknown
  once (event: string, listener: (...args: any[]) => void): unknown
  off? (event: string, listener: (...args: any[]) => void): unknown
  ping (): void
  send (data: string, cb: (err?: Error) => void): void
  close (): void
  terminate? (): void
}

export interface IoOptions {
  wechaty          : WechatyInterface,
  token            : string,
  apihost?         : string,
  protocol?        : string,
  servicePort?     : number,
  createWebSocket? : (
    endpoint: string,
    protocol: string,
    options: { headers: { Authorization: string } },
  ) => WebSocketLike,
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
  payload : PUPPET.payloads.EventScan,
}

interface IoEventJsonRpc {
  name    : 'jsonrpc',
  payload : jsonRpcPeer.JsonRpcPayload,
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

  protected options: IoOptions

  protected readonly id       : string
  protected readonly protocol : string
  protected eventBuffer       : IoEvent[] = []
  protected ws                : undefined | WebSocketLike

  readonly #lifecycle         : LifecycleController

  protected reconnectTimer?   : ReturnType<typeof setTimeout>
  protected reconnectTimeout? : number
  #runSignal?                 : AbortSignal

  protected lifeTimer? : ReturnType<typeof setInterval>

  protected onMessage: undefined | Function

  protected scanPayload?: PUPPET.payloads.EventScan

  protected jsonRpc?: jsonRpcPeer.Peer

  constructor (
    options: IoOptions,
  ) {
    this.options = options
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

    this.#lifecycle = new LifecycleController({
      hooks: {
        start: async ({ scope, signal }) => {
          if (this.lifeTimer) {
            throw new Error('lifeTimer exist')
          }

          this.#runSignal = signal
          scope.onDispose(
            () => { this.#runSignal = undefined },
            () => { this.#runSignal = undefined },
          )

          this.registerEventHooks(scope)

          const ws = await scope.acquire({
            create: ({ signal: wsSignal }) => this.initWebSocket(wsSignal),
            dispose: async () => {
              this.clearTimers()
              if (this.connected()) {
                try {
                  await this.send()
                } catch (e) {
                  log.warn('Io', 'stop() buffer flush failed: %s', (e as Error).message)
                }
              }
              this.eventBuffer = []
              await this.closeWebSocket()
            },
            interrupt: () => {
              this.clearTimers()
            },
            name: 'ioWebSocket',
          })

          this.ws = ws
          if (signal.aborted) {
            throw toAbortError(signal.reason)
          }

          this.lifeTimer = setInterval(() => {
            if (this.ws && this.connected()) {
              log.silly('Io', 'start() setInterval() ws.ping()')
              this.ws.ping()
            }
          }, 1000 * 10)
          scope.onDispose(
            () => this.clearTimers(),
            () => this.clearTimers(),
          )
        },
      },
      name: 'Io',
    })
  }

  /**
   * Read-only lifecycle state snapshot of this `Io` instance.
   */
  public get state (): LifecycleState {
    return this.#lifecycle.state
  }

  public toString () {
    return `Io<${this.options.token}>`
  }

  private connected () {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN)
  }

  private clearTimers (): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    if (this.lifeTimer) {
      clearInterval(this.lifeTimer)
      this.lifeTimer = undefined
    }
  }

  private async closeWebSocket (): Promise<void> {
    const ws = this.ws
    this.ws = undefined
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      return
    }

    await new Promise<void>(resolve => {
      let settled = false
      const finish = () => {
        if (settled) {
          return
        }
        settled = true
        resolve()
      }
      ws.once('close', finish)
      ws.close()
      if (ws.readyState === WebSocket.CLOSED) {
        finish()
      }
    })
  }

  public async start (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('Io', 'start()')
    return this.#lifecycle.start(options)
  }

  private registerEventHooks (scope: { listen: (target: any, event: string, listener: (...args: any[]) => any) => void }) {
    log.verbose('Io', 'registerEventHooks()')
    const wechaty = this.options.wechaty
    const safeSend = (ioEvent: IoEvent) => {
      void this.send(ioEvent).catch(e => {
        log.warn('Io', 'event forward failed (%s): %s', ioEvent.name, (e as Error).message)
      })
    }

    scope.listen(wechaty, 'error',     error => safeSend({ name: 'error',     payload: error }))
    scope.listen(wechaty, 'heartbeat', data  => safeSend({ name: 'heartbeat', payload: { cuid: this.id, data } }))
    scope.listen(wechaty, 'login',     user  => {
      this.scanPayload = undefined
      safeSend({ name: 'login', payload: wechaty.puppet.contactPayload(user.id) })
    })
    scope.listen(wechaty, 'logout',    user  => safeSend({ name: 'logout',    payload: wechaty.puppet.contactPayload(user.id) }))
    scope.listen(wechaty, 'message',   message => {
      void this.ioMessage(message).catch(e => {
        log.warn('Io', 'ioMessage() exception: %s', (e as Error).message)
      })
    })
    scope.listen(wechaty, 'scan',      (qrcode, status) => {
      this.scanPayload = {
        ...this.scanPayload,
        qrcode,
        status,
      }
      safeSend({ name: 'scan', payload: { qrcode, status } } as IoEventScan)
    })
  }

  private async initWebSocket (signal?: AbortSignal): Promise<WebSocketLike> {
    log.verbose('Io', 'initWebSocket()')
    if (signal?.aborted) {
      throw toAbortError(signal.reason)
    }

    const auth = 'Token ' + this.options.token
    const headers = { Authorization: auth }

    if (!this.options.apihost) {
      throw new Error('no apihost')
    }
    let endpoint = 'wss://' + this.options.apihost + '/v0/websocket'

    if (!/api\.chatie\.io/.test(this.options.apihost)) {
      endpoint = 'ws://' + this.options.apihost + '/v0/websocket'
    }

    const ws: WebSocketLike = this.options.createWebSocket
      ? this.options.createWebSocket(endpoint, this.protocol, { headers })
      : new WebSocket(endpoint, this.protocol, { headers })
    this.ws = ws

    ws.on('open',     () => this.wsOnOpen(ws))
    ws.on('message',  data => this.wsOnMessage(data))
    ws.on('error',    e => this.wsOnError(e))
    ws.on('close',    (code: number, reason?: Buffer | string) => {
      this.wsOnClose(ws, code, reason ? reason.toString() : '')
    })

    await new Promise<void>((resolve, reject) => {
      let onAbort: (() => void) | undefined
      const cleanupAbort = () => {
        if (onAbort && signal) {
          signal.removeEventListener('abort', onAbort)
        }
      }
      if (signal) {
        onAbort = () => {
          ws.close()
          reject(toAbortError(signal.reason))
        }
        signal.addEventListener('abort', onAbort, { once: true })
      }
      ws.once('open', () => {
        cleanupAbort()
        resolve()
      })
      ws.once('error', (err: unknown) => {
        cleanupAbort()
        reject(err)
      })
      ws.once('close', (code: number, reason?: Buffer | string) => {
        cleanupAbort()
        reject(new Error(`WebSocket closed before open (${code}): ${reason ? reason.toString() : ''}`))
      })
    })

    return ws
  }

  private wsOnOpen (ws: WebSocketLike): void {
    if (this.protocol !== ws.protocol) {
      log.error('Io', 'wsOnOpen() require protocol[%s] failed', this.protocol)
    }
    log.verbose('Io', 'wsOnOpen() connected with protocol [%s]', ws.protocol)

    this.reconnectTimeout = undefined

    const name    = 'sys'
    const payload = 'Wechaty version ' + this.options.wechaty.version() + ` with CUID: ${this.id}`

    const initEvent: IoEvent = {
      name,
      payload,
    }
    this.send(initEvent).catch(console.error)
  }

  private wsOnMessage (data: WebSocket.Data): void {
    log.silly('Io', 'wsOnMessage() ws.on(message): %s', data)
    this.wsOnMessageAsync(data).catch(console.error)
  }

  private async wsOnMessageAsync (data: WebSocket.Data): Promise<void> {
    log.silly('Io', 'wsOnMessageAsync() ws.on(message): %s', data)

    // flags.binary will be set if a binary data is received.
    // flags.masked will be set if the data was masked.
    let payload: string

    if (Array.isArray(data)) {
      payload = data[0]?.toString() ?? 'NODATA'
    } else {
      payload = data.toString()
    }

    const ioEvent: IoEvent = {
      name    : 'raw',
      payload : data,
    }

    try {
      const obj = JSON.parse(payload)
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
            this.options.wechaty.emitError(e)
          }
        }
        break

      case 'reset':
        log.verbose('Io', 'on(reset): %s', ioEvent.payload)
        this.options.wechaty.emitError(
          new Error(
            'reset by server: '
            + JSON.stringify(ioEvent.payload),
          ),
        )
        await this.options.wechaty.reset()
        break

      case 'shutdown':
        log.info('Io', 'on(shutdown): %s', ioEvent.payload)
        // Route remote shutdown through authoritative bot shutdown; never terminate
        // the host process unilaterally inside a library resource component.
        await this.options.wechaty.stop()
        break

      case 'update':
        log.verbose('Io', 'on(update): %s', ioEvent.payload)
        {
          const wechaty = this.options.wechaty
          if (wechaty.isLoggedIn) {
            const loginEvent: IoEvent = {
              name    : 'login',
              payload : await wechaty.puppet.contactPayload(
                wechaty.puppet.currentUserId,
              ),
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
          const payload = jsonRpcPeer.parse(response) as jsonRpcPeer.JsonRpcPayloadResponse

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
    log.warn('Io', 'wsOnError() error event[%s]', e && e.message)
    if (!e) {
      return
    }

    if (!this.ws) {
      log.error('Io', 'wsOnError() ws.on(error) this.ws is `undefined`', e.message)
      return
    }

    if (this.ws.readyState === WebSocket.CONNECTING) {
      log.error('Io', 'wsOnError() ws.on(error) ws.readyState is CONNECTING: %s', e.message)
      return
    }

    if (this.ws.readyState  === WebSocket.CLOSING) {
      log.error('Io', 'wsOnError() ws.on(error) ws.readyState is CLOSING: %s', e.message)
      return
    }

    this.options.wechaty.emitError(e)

    // when `error`, there must have already a `close` event
    // we should not call this.reconnect() again
    //
    // this.close()
    // this.reconnect()
  }

  private wsOnClose (
    ws      : WebSocketLike,
    code    : number,
    message : string,
  ): void {
    // Reconnect only when `Io` is genuinely `running` (never during a failed
    // initial `starting` handshake or an active `stopping` teardown).
    if (this.#lifecycle.state.kind === 'running') {
      log.warn('Io', 'wsOnClose() close event[%d: %s]', code, message)
      ws.close()
      this.reconnect()
    }
  }

  private reconnect () {
    log.verbose('Io', 'reconnect()')

    if (this.#lifecycle.state.kind !== 'running') {
      log.warn('Io', 'reconnect() canceled because state is %s', this.#lifecycle.state.kind)
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
    const signal = this.#runSignal
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      if (this.#lifecycle.state.kind === 'running' && !signal?.aborted) {
        this.initWebSocket(signal).catch(err => {
          if (!signal?.aborted) {
            log.warn('Io', 'reconnect() initWebSocket failed: %s', (err as Error).message)
          }
        })
      }
    }, this.reconnectTimeout)
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

  public async stop (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('Io', 'stop()')
    return this.#lifecycle.stop(options)
  }

  /**
   *
   * Prepare to be overwritten by server setting
   *
   */
  private async ioMessage (m: MessageInterface): Promise<void> {
    log.silly('Io', 'ioMessage() is a nop function before be overwritten from cloud')
    if (typeof this.onMessage === 'function') {
      await this.onMessage(m)
    }
  }

  protected async syncMessage (m: MessageInterface): Promise<void> {
    log.silly('Io', 'syncMessage(%s)', m)

    const messageEvent: IoEvent = {
      name    : 'message',
      payload : await m.wechaty.puppet.messagePayload(m.id),
    }
    await this.send(messageEvent)
  }

}
