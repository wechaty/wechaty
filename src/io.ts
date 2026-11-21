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
 * `Io`: the WebSocket link between a Wechaty bot and the Wechaty cloud (or a
 * gateway), built on the async lifecycle module (wechaty/wechaty#3022).
 *
 * Each run of the lifecycle owns one connected socket, the bot listeners that
 * forward events to it, and a keepalive task; all are released when the run
 * retires (`stop()`, `restart()`, or a recovery). When the socket closes, the
 * run recovers (`scope.recover()`): the next run reconnects with backoff inside
 * `onStart`, so the state stays `starting` while offline and `stop()` cancels
 * the wait. The backoff is this class's policy, not the lifecycle's (D7).
 *
 * Only a run started by such a recovery retries. A `start()` makes one
 * connection attempt and rejects if it fails, so a bot whose cloud is
 * unreachable fails to start rather than waiting forever.
 *
 * Events the bot emits while the socket is not connected are buffered and sent
 * once it is; `onStop()` flushes the buffer before the socket is closed.
 */
import WebSocket        from 'ws'

import type * as PUPPET from 'wechaty-puppet'

import * as jsonRpcPeer from 'json-rpc-peer'

import {
  AsyncLifecycle,
  listen,
  type LifecycleScope,
  type LifecycleState,
  type LifecycleStop,
}                     from './async-lifecycle/mod.ts'
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

/** What an {@link Io} connects with, and for which bot. */
export interface IoOptions {
  wechaty      : WechatyInterface,
  token        : string,
  apihost?     : string,
  protocol?    : string,
  servicePort? : number,
}

/** The Io event names exchanged with the server. */
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

/**
 * Resolve after `ms`; reject with `signal.reason` when `signal` aborts, at once
 * if it already has. No timer is left behind either way.
 */
function delay (ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(signal.reason)
  }
  if (ms <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** The WebSocket client a run connects with. See {@link Io.createWebSocket}. */
export type IoWebSocket = WebSocket

/**
 * The Io link of one bot. `start()`, `stop()` and `restart()` are the lifecycle
 * caller API (`AsyncLifecycle`); see the module comment for what each run owns.
 */
export class Io extends AsyncLifecycle {

  protected options: IoOptions

  protected readonly id       : string
  protected readonly protocol : string
  /** Events waiting for a connected socket; kept across reconnects. */
  protected eventBuffer       : IoEvent[] = []
  /** The socket of the live run, or `undefined` between runs. */
  protected ws                : undefined | IoWebSocket

  protected onMessage: undefined | Function

  protected scanPayload?: PUPPET.payloads.EventScan

  protected jsonRpc?: jsonRpcPeer.Peer

  /** Consecutive connection losses and failed attempts; reset once a connection has stayed up for a keepalive interval. */
  #failures = 0
  /**
   * The next run is a recovery after the socket closed, so it retries until it
   * connects. Consumed by that run's `onStart`, and cleared whenever the
   * instance comes to rest (`stopped` or `failed`, see `onStateChange`), so a
   * `stop()` that supersedes the recovery, even before its run starts, leaves
   * the next `start()` a single attempt.
   *
   * Known gap: a `restart()` that supersedes the recovery before its run starts
   * goes `stopping` → `starting` without coming to rest, and the Io cannot
   * tell that run from the recovery (its reason stays `'recover'`), so that
   * run retries too. The window is the few microtasks between the close event
   * and the replacement run's `onStart`.
   */
  #reconnecting = false
  /** Remove the message listener of each socket, set by `openWebSocket`. */
  readonly #messageListeners = new WeakMap<IoWebSocket, (data: WebSocket.Data) => void>()

  constructor (
    options: IoOptions,
  ) {
    super({ name: 'Io', stopTimeoutMs: 10_000 })
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

  }

  /** `Io<token>`, for logs. */
  public override toString () {
    return `Io<${this.options.token}>`
  }

  private connected () {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * One run: forward the bot's events, connect (retrying with backoff while the
   * server is unreachable), keep the socket alive, and recover when it closes.
   * Rejects only for a configuration error (no `apihost`) or when the run
   * retires while connecting.
   */
  protected override async onStart (scope: LifecycleScope): Promise<void> {
    log.verbose('Io', 'onStart()')

    if (!this.options.apihost) {
      throw new Error('no apihost')
    }

    const retry = this.#reconnecting
    this.#reconnecting = false
    if (!retry) {
      this.#failures = 0 // a start, not a recovery: connect at once
    }

    this.hookWechaty(scope)

    const ws = await this.connect(scope, retry)
    this.ws = ws

    // Registered after the socket, so removed before it is closed: closing it
    // on retirement never looks like a lost connection. The message listener
    // is attached as the socket is created (openWebSocket), so a frame the
    // server sends with the handshake is not lost.
    listen(scope, ws, 'error', (e?: Error) => this.wsOnError(e))
    listen(scope, ws, 'close', (code: number, reason: Buffer) => {
      log.warn('Io', 'onStart() websocket closed [%d: %s], recovering', code, reason.toString())
      this.#failures++
      if (scope.recover(new Error(`websocket closed: ${code}`)) === 'accepted') {
        this.#reconnecting = true
      }
    })

    scope.spawn(async signal => {
      while (!signal.aborted) {
        await delay(10 * 1000, signal)
        // Stable for a whole keepalive interval: back off from scratch next
        // time. A server that accepts and drops at once keeps backing off.
        this.#failures = 0
        if (this.connected()) {
          log.silly('Io', 'onStart() keepalive ws.ping()')
          // TODO: check 'pong' event on ws
          ws.ping()
        }
      }
    })

    this.wsOnOpen(ws)
  }

  /**
   * Send what is still buffered while the socket is open. The socket itself is
   * closed afterwards, by its release. A recovery keeps what could not be sent
   * (its socket is already closed) for the next run to send; a stop or restart
   * drops it, as before.
   */
  protected override async onStop (stop: LifecycleStop): Promise<void> {
    log.verbose('Io', 'onStop(%s)', stop.reason)
    try {
      await this.send()
    } catch (e) {
      log.warn('Io', 'onStop() flushing events failed: %s', (e as Error).message)
    }
    if (stop.reason !== 'recover') {
      this.eventBuffer = []
    }
  }

  /**
   * At rest (`stopped` or `failed`) no recovery is pending any more, and
   * nothing buffered belongs to the next `start()`. `onStop` alone cannot drop
   * the buffer: it does not run for a replacement run that never reached
   * `running` (a `stop()` while reconnecting), and the bot's listeners, released
   * after the socket, can still buffer events while the socket closes. A
   * recovery never passes through either state, so it keeps the buffer.
   */
  protected override onStateChange (state: LifecycleState): void {
    if (state.kind === 'stopped' || state.kind === 'failed') {
      this.#reconnecting = false
      this.eventBuffer = []
    }
  }

  /** Forward the bot's events for this run only (C-COMP-01). */
  private hookWechaty (scope: LifecycleScope): void {
    log.verbose('Io', 'hookWechaty()')
    const wechaty = this.options.wechaty
    const forward = (ioEvent: IoEvent) => {
      this.send(ioEvent).catch(e => log.warn('Io', 'hookWechaty() send(%s) failed: %s', ioEvent.name, (e as Error).message))
    }

    listen(scope, wechaty, 'error',     (error: unknown) => forward({ name: 'error', payload: error }))
    listen(scope, wechaty, 'heartbeat', (data: unknown) => forward({ name: 'heartbeat', payload: { cuid: this.id, data } }))
    listen(scope, wechaty, 'login',     (user: { id: string }) => {
      this.scanPayload = undefined
      forward({ name: 'login', payload: wechaty.puppet.contactPayload(user.id) })
    })
    listen(scope, wechaty, 'logout',    (user: { id: string }) => forward({ name: 'logout', payload: wechaty.puppet.contactPayload(user.id) }))
    listen(scope, wechaty, 'message',   (message: MessageInterface) => {
      this.ioMessage(message).catch(e => log.warn('Io', 'hookWechaty() ioMessage() failed: %s', (e as Error).message))
    })
    // FIXME: payload schema need to be defined universal
    listen(scope, wechaty, 'scan',      (qrcode: string, status: PUPPET.types.ScanStatus) => {
      this.scanPayload = { ...this.scanPayload, qrcode, status }
      forward({ name: 'scan', payload: { qrcode, status } } as IoEventScan)
    })
  }

  /**
   * The delay before connection attempt number `failures + 1`: none for the
   * first, then 1 s, 3 s, 9 s and 27 s, capped at 30 s. Policy of this class
   * (D7); a subclass may override it.
   */
  protected reconnectDelayMs (failures: number): number {
    return failures === 0 ? 0 : Math.min(30 * 1000, 1000 * 3 ** (failures - 1))
  }

  /**
   * Connect; with `retry`, keep trying with backoff until it works or the run
   * retires, otherwise make one attempt and reject if it fails. The socket is
   * acquired by the scope, so it is closed when the run retires.
   */
  private async connect (scope: LifecycleScope, retry: boolean): Promise<IoWebSocket> {
    for (;;) {
      const wait = this.reconnectDelayMs(this.#failures)
      if (wait > 0) {
        log.warn('Io', 'connect() will reconnect after %d s', Math.floor(wait / 1000))
      }
      await delay(wait, scope.signal)
      try {
        return await scope.acquire(
          signal => this.openWebSocket(signal),
          ws => this.closeWebSocket(ws),
        )
      } catch (e) {
        if (scope.signal.aborted || !retry) {
          throw e
        }
        this.#failures++
        log.warn('Io', 'connect() attempt failed (%d in a row): %s', this.#failures, (e as Error).message)
      }
    }
  }

  /**
   * Create the WebSocket client. Tests override this to return a fake socket;
   * it must start connecting at once, like `ws`.
   */
  protected createWebSocket (endpoint: string, protocol: string, options: WebSocket.ClientOptions): IoWebSocket {
    return new WebSocket(endpoint, protocol, options)
  }

  /** Open a socket and resolve once it is open; give up when `signal` aborts. */
  private async openWebSocket (signal: AbortSignal): Promise<IoWebSocket> {
    log.verbose('Io', 'openWebSocket()')

    // const auth = 'Basic ' + new Buffer(this.setting.token + ':X').toString('base64')
    const auth = 'Token ' + this.options.token
    const headers = { Authorization: auth }

    let endpoint = 'wss://' + this.options.apihost + '/v0/websocket'

    // XXX quick and dirty: use no ssl for API_HOST other than official
    // FIXME: use a configurable VARIABLE for the domain name at here:
    if (!/api\.chatie\.io/.test(this.options.apihost!)) {
      endpoint = 'ws://' + this.options.apihost + '/v0/websocket'
    }

    const ws = this.createWebSocket(endpoint, this.protocol, { headers })
    // Never removed: `ws` can report an `error` while its connection is aborted
    // or while the closing handshake runs, after the run's own listener is
    // gone, and an `error` without a listener would end the process.
    ws.on('error', () => {})
    // Attached now, before the handshake completes, so a frame the server sends
    // right away is handled; removed by closeWebSocket.
    const onMessage = (data: WebSocket.Data) => this.wsOnMessage(data)
    ws.on('message', onMessage)
    this.#messageListeners.set(ws, onMessage)
    try {
      await new Promise<void>((resolve, reject) => {
        const settle = (error?: unknown) => {
          ws.off('open', onOpen)
          ws.off('error', onError)
          ws.off('close', onClose)
          signal.removeEventListener('abort', onAbort)
          if (error === undefined) {
            resolve()
          } else {
            reject(error)
          }
        }
        const onOpen = () => settle()
        const onError = (e: Error) => settle(e)
        const onClose = (code: number) => settle(new Error(`websocket closed while connecting: ${code}`))
        const onAbort = () => settle(signal.reason)
        ws.once('open', onOpen)
        ws.once('error', onError)
        ws.once('close', onClose)
        signal.addEventListener('abort', onAbort, { once: true })
      })
    } catch (e) {
      ws.off('message', onMessage)
      ws.terminate()
      throw e
    }
    return ws
  }

  /**
   * How long a graceful close may wait for the server's reply before the
   * socket is terminated. Shorter than the stop deadline, and than `ws`'s own
   * 30 s, so a dead connection cannot make `stop()` time out.
   */
  protected closeTimeoutMs (): number {
    return 5 * 1000
  }

  /**
   * Close the socket gracefully and resolve once it is closed, terminating it
   * if the server does not complete the close in time.
   */
  private async closeWebSocket (ws: IoWebSocket): Promise<void> {
    log.verbose('Io', 'closeWebSocket()')
    if (this.ws === ws) {
      this.ws = undefined
    }
    const onMessage = this.#messageListeners.get(ws)
    if (onMessage) {
      ws.off('message', onMessage)
    }
    if (ws.readyState === WebSocket.CLOSED) {
      return
    }
    const closed = new Promise<void>(resolve => ws.once('close', () => resolve()))
    ws.close()
    const timer = setTimeout(() => {
      log.warn('Io', 'closeWebSocket() no close reply in %d ms, terminating', this.closeTimeoutMs())
      ws.terminate()
    }, this.closeTimeoutMs())
    try {
      await closed
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Announce the bot on a socket that just connected with a `sys` event. A
   * protocol mismatch is only logged.
   */
  private wsOnOpen (ws: IoWebSocket): void {
    if (this.protocol !== ws.protocol) {
      log.error('Io', 'wsOnOpen() require protocol[%s] failed', this.protocol)
      // XXX deal with error?
    }
    log.verbose('Io', 'wsOnOpen() connected with protocol [%s]', ws.protocol)

    const name    = 'sys'
    const payload = 'Wechaty version ' + this.options.wechaty.version() + ` with CUID: ${this.id}`

    const initEvent: IoEvent = {
      name,
      payload,
    }
    this.send(initEvent).catch(console.error)
  }

  /** Dispatch a frame from the server; a failure is printed, never thrown. */
  private wsOnMessage (data: WebSocket.Data): void {
    log.silly('Io', 'wsOnMessage() ws.on(message): %s', data)
    this.wsOnMessageAsync(data).catch(console.error)
  }

  /**
   * Handle one server event, parsed from a JSON frame (a frame that is not
   * JSON is treated as a `raw` event):
   * - `botie`: installs server-provided code as `onMessage`;
   * - `reset`: reports an error to the bot and resets it;
   * - `shutdown`: exits the process;
   * - `update`: sends the current login and scan state;
   * - `logout`: logs the bot out;
   * - `jsonrpc`: runs the request against `jsonRpc` and sends the response.
   * Other names are logged and ignored.
   */
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
        process.exit(0)
        // eslint-disable-next-line
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

  /**
   * Report a socket error on the run's current, open socket to the bot as an
   * `error` event. Errors while there is no socket, or while it is connecting
   * or closing, are only logged. A `close` follows the error and recovers the
   * run, so nothing is retried here.
   */
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

    // An `error` is followed by a `close`, which recovers the run.
    this.options.wechaty.emitError(e)
  }

  /**
   * Buffer `ioEvent`, if given, and send the buffer when the socket is
   * connected. While it is not, for example while reconnecting, events stay
   * buffered until the next run connects.
   */
  private async send (ioEvent?: IoEvent): Promise<void> {
    if (ioEvent) {
      log.silly('Io', 'send(%s)', JSON.stringify(ioEvent))
      this.eventBuffer.push(ioEvent)
    } else { log.silly('Io', 'send()') }

    const ws = this.ws
    if (!ws || !this.connected()) {
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

  /**
   * Send a message the bot received to the server as a `message` event, with
   * the puppet's payload. Buffered while not connected.
   */
  protected async syncMessage (m: MessageInterface): Promise<void> {
    log.silly('Io', 'syncMessage(%s)', m)

    const messageEvent: IoEvent = {
      name    : 'message',
      payload : await m.wechaty.puppet.messagePayload(m.id),
    }
    await this.send(messageEvent)
  }

}
