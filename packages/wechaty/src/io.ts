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
 * Each run of the lifecycle owns one connected socket and a keepalive task,
 * both released when the run retires (`stop()`, `restart()`, or a recovery).
 * The bot listeners that forward its events belong to the instance instead:
 * added by the first run after a rest, removed only when it comes to rest
 * (`stopped` or `failed`), so no event is missed between a retired run and
 * its replacement. When the socket closes, the
 * run recovers (`scope.recover()`): the next run reconnects with backoff inside
 * `onStart`, so the state stays `starting` while offline and `stop()` cancels
 * the wait. The backoff is this class's policy, not the lifecycle's (D7).
 *
 * Only a run started by such a recovery retries. A `start()` makes one
 * connection attempt and rejects if it fails, so a bot whose cloud is
 * unreachable fails to start rather than waiting forever.
 *
 * Io is the transport for the bot's events, so delivery does not depend on
 * what happens to the connection: an event is buffered until a socket takes
 * it, and the buffer belongs to the instance, kept through reconnects,
 * `stop()`/`start()` and `restart()`. An event whose send fails is put back,
 * in order. Every new connection announces the bot (`sys`) before it sends
 * what is buffered. The buffer is capped (`maxBufferedEvents()`), dropping the
 * oldest events. There is no acknowledgement from the server, so an event a
 * socket accepted just before the connection silently died can still be lost.
 */
import WebSocket        from 'ws'

import type * as PUPPET from 'wechaty-puppet'

import * as jsonRpcPeer from 'json-rpc-peer'

import {
  AsyncLifecycle,
  type LifecycleScope,
  type LifecycleState,
  type LifecycleStop,
}                     from 'scopelet'
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
  /** The flush in progress, shared by every `send()` meanwhile. */
  #flushing: Promise<void> | undefined
  /** Set by `onStop`: a flush ends after the batch it is sending. */
  #lastBatch = false
  /** Removes the bot listeners; set while they are attached (see `hookWechaty`). */
  #unhookWechaty: (() => void) | undefined
  /**
   * The listeners Io added to each socket, removed by `closeWebSocket` before
   * it closes the socket: the message listener (`openWebSocket`), then the
   * run's `error` and `close` handlers (`watchSocket`).
   */
  readonly #socketListeners = new WeakMap<IoWebSocket, [ string, (...args: any[]) => void ][]>()

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
   * Rejects for a configuration error (no `apihost`), when the run retires
   * while connecting, or, for a start that is not a recovery, with the error
   * of its single connection attempt.
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

    this.#unhookWechaty ??= this.hookWechaty()

    const ws = await this.connect(scope, retry)

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
  }

  /**
   * Send what is still buffered while the socket is open. The socket itself is
   * closed afterwards, by its release. Whatever cannot be sent stays buffered
   * for the next connection, whatever the reason for the stop.
   */
  protected override async onStop (stop: LifecycleStop): Promise<void> {
    log.verbose('Io', 'onStop(%s)', stop.reason)
    // Bounded: the bot keeps emitting while the run retires, and a flush that
    // drains as fast as events arrive would hold the socket open until the
    // stop deadline. A flush already running ends after its current batch,
    // then one more batch sends what is buffered now. Later events stay in the
    // buffer for the next connection.
    this.#lastBatch = true
    try {
      await this.#flushing?.catch(() => {})
      await this.send()
    } catch (e) {
      log.warn('Io', 'onStop() flushing events failed: %s', (e as Error).message)
    } finally {
      this.#lastBatch = false
    }
  }

  /**
   * At rest (`stopped` or `failed`) no recovery is pending any more and the
   * bot's events are no longer forwarded. The buffer is kept for the next
   * `start()`. A recovery or a restart never passes through either state, so
   * it keeps the bot listeners.
   */
  protected override onStateChange (state: LifecycleState): void {
    if (state.kind === 'stopped' || state.kind === 'failed') {
      this.#reconnecting = false
      this.#unhookWechaty?.()
      this.#unhookWechaty = undefined
    }
  }

  /**
   * The most events the buffer holds; beyond it the oldest are dropped. Bounds
   * memory through a long outage. A subclass may override it.
   */
  protected maxBufferedEvents (): number {
    return 1000
  }

  /** Drop the oldest buffered events beyond {@link Io.maxBufferedEvents}. */
  #trimBuffer (): void {
    const excess = this.eventBuffer.length - this.maxBufferedEvents()
    if (excess > 0) {
      this.eventBuffer.splice(0, excess)
      log.warn('Io', 'buffer full: dropped the %d oldest events', excess)
    }
  }

  /**
   * Forward the bot's events into the buffer, which sends them whenever a
   * socket is connected. Returns the function that removes these listeners.
   * Not scoped to a run: between a retired run and its replacement the bot
   * can still emit (an asynchronous `login`, say), and that event must be
   * buffered, not dropped.
   */
  private hookWechaty (): () => void {
    log.verbose('Io', 'hookWechaty()')
    const wechaty = this.options.wechaty
    const forward = (ioEvent: IoEvent) => {
      this.send(ioEvent).catch(e => log.warn('Io', 'hookWechaty() send(%s) failed: %s', ioEvent.name, (e as Error).message))
    }

    const listeners: Record<string, (...args: any[]) => void> = {
      error     : (error: unknown) => forward({ name: 'error', payload: error }),
      heartbeat : (data: unknown) => forward({ name: 'heartbeat', payload: { cuid: this.id, data } }),
      login     : (user: { id: string }) => {
        this.scanPayload = undefined
        forward({ name: 'login', payload: wechaty.puppet.contactPayload(user.id) })
      },
      logout    : (user: { id: string }) => forward({ name: 'logout', payload: wechaty.puppet.contactPayload(user.id) }),
      message   : (message: MessageInterface) => {
        this.ioMessage(message).catch(e => log.warn('Io', 'hookWechaty() ioMessage() failed: %s', (e as Error).message))
      },
      // FIXME: payload schema need to be defined universal
      scan      : (qrcode: string, status: PUPPET.types.ScanStatus) => {
        this.scanPayload = { ...this.scanPayload, qrcode, status }
        forward({ name: 'scan', payload: { qrcode, status } } as IoEventScan)
      },
    }
    for (const [ event, listener ] of Object.entries(listeners)) {
      wechaty.on(event as any, listener)
    }
    return () => {
      for (const [ event, listener ] of Object.entries(listeners)) {
        wechaty.off(event as any, listener)
      }
    }
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
          async signal => {
            const ws = await this.openWebSocket(signal)
            // The socket may have closed in the microtasks since `open`. Checked
            // in the same synchronous step as adding the run's handlers, so no
            // close can be missed. Rejecting here, rather than after
            // `acquire` resolves, leaves the scope owning nothing (C-SCOPE-04),
            // so an outage of such attempts does not pile sockets up in the run.
            if (ws.readyState !== WebSocket.OPEN) {
              await this.closeWebSocket(ws)
              throw new Error(`websocket closed as it opened (readyState ${ws.readyState})`)
            }
            this.watchSocket(scope, ws)
            return ws
          },
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
   * Make `ws` the run's socket: forward its errors to the bot, recover the run
   * when it closes, and announce the bot on it (`sys`). Synchronous, so it runs in the same step as the
   * check that the socket is open. `closeWebSocket` removes these handlers
   * before it closes the socket.
   *
   * Not `listen()`: a `ws` socket also has `addEventListener`, which
   * `listen()` prefers, and through it `ws` passes one `CloseEvent` or
   * `ErrorEvent` instead of the `(code, reason)` and `(error)` used here.
   */
  private watchSocket (scope: LifecycleScope, ws: IoWebSocket): void {
    const onError = (e?: Error) => this.wsOnError(e)
    const onClose = (code: number, reason: Buffer) => {
      log.warn('Io', 'onStart() websocket closed [%d: %s], recovering', code, reason.toString())
      this.#failures++
      if (scope.recover(new Error(`websocket closed: ${code}`)) === 'accepted') {
        this.#reconnecting = true
      }
    }
    ws.on('error', onError)
    ws.on('close', onClose)
    this.#socketListeners.get(ws)?.push([ 'error', onError ], [ 'close', onClose ])
    // `sys` is queued in the same step that makes the socket available to
    // `send()`, so nothing (a reply to a server `update`, say) goes out first.
    this.ws = ws
    this.wsOnOpen(ws)
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
    this.#socketListeners.set(ws, [ [ 'message', onMessage ] ])
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
    // Removed before closing: closing the socket on retirement must not look
    // like a lost connection to the run's close handler.
    for (const [ event, listener ] of this.#socketListeners.get(ws) ?? []) {
      ws.off(event, listener)
    }
    this.#socketListeners.delete(ws)
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
    // First on the new connection, so the server knows the bot before the
    // buffered events arrive. A `sys` requeued from an earlier connection is
    // replaced, not repeated.
    this.eventBuffer = [ initEvent, ...this.eventBuffer.filter(event => event.name !== 'sys') ]
    this.send().catch(e => log.warn('Io', 'wsOnOpen() send() failed: %s', (e as Error).message))
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
   * connected. While it is not, for example while reconnecting or stopped,
   * events stay buffered until a run connects. Rejects with the first send
   * error; the events that failed stay buffered.
   *
   * One flush at a time: a call while a flush runs joins it, and its event is
   * sent by that flush. Two flushes could each put their failed events back
   * at the front and swap their order. The flush starts a microtask later, so
   * `#flushing` is always set before `#flush` can clear it.
   */
  private send (ioEvent?: IoEvent): Promise<void> {
    if (ioEvent) {
      log.silly('Io', 'send(%s)', ioEvent.name)
      this.eventBuffer.push(ioEvent)
      this.#trimBuffer()
    } else { log.silly('Io', 'send()') }

    this.#flushing ??= Promise.resolve().then(() => this.#flush())
    return this.#flushing
  }

  /**
   * Send buffered events until the buffer is empty or there is no connected
   * socket. Events whose send fails go back to the front of the buffer, in
   * order. If a new socket connected meanwhile, the flush goes on with it
   * (its `sys` was queued first); otherwise it rejects with the first error.
   * While `#lastBatch` is set (`onStop`), it sends one batch and ends.
   * An event that cannot be serialized is dropped, so it cannot block the rest.
   *
   * Clears `#flushing` in the same synchronous step as its last check of the
   * buffer: a `send()` that came after that check, but joined before a later
   * clear, would wait on a finished flush and its event would stay unsent.
   * Keep the loop and the `finally` in this one function.
   */
  async #flush (): Promise<void> {
    try {
      while (this.eventBuffer.length > 0) {
        const ws = this.ws
        if (!ws || !this.connected()) {
          log.verbose('Io', 'send() without a connected websocket, eventBuffer.length = %d', this.eventBuffer.length)
          return
        }

        const batch = this.eventBuffer.splice(0)
        const results = await Promise.allSettled(batch.map(event => {
          let data: string
          try {
            data = JSON.stringify(event)
          } catch (e) {
            log.error('Io', 'send() dropped an event that cannot be serialized: %s', (e as Error).message)
            return Promise.resolve()
          }
          return new Promise<void>((resolve, reject) => ws.send(
            data,
            (err: undefined | Error) => err ? reject(err) : resolve(),
          ))
        }))

        const failed = batch.filter((_, index) => results[index]!.status === 'rejected')
        if (failed.length > 0) {
          this.eventBuffer.unshift(...failed)
          this.#trimBuffer()
          const error = (results.find(result => result.status === 'rejected') as PromiseRejectedResult).reason
          log.warn('Io', 'send() %d events not sent, kept for the next connection: %s', failed.length, (error as Error)?.message)
          if (this.ws === ws) {
            throw error
          }
        }
        if (this.#lastBatch) {
          return
        }
      }
    } finally {
      this.#flushing = undefined
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
