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
 * Fakes for the Io and IoClient tests (wechaty/wechaty#3022): a WebSocket
 * whose connection attempts are scripted, a minimal bot, and an Io that uses
 * them. No network and no real puppet.
 */
import { EventEmitter } from 'node:events'
import process from 'node:process'

import { Io, type IoOptions, type IoWebSocket } from '../../src/io.ts'

/** What a scripted connection attempt does. */
export type Attempt = 'open' | 'refuse' | 'pending'

/**
 * A WebSocket stand-in: `ws`'s readyState values, events and methods. Like a
 * `ws` socket it is both an EventEmitter and an EventTarget, so code that
 * picks an API by feature detection (`listen()`) takes the path it takes in
 * production.
 */
export class FakeSocket extends EventEmitter {

  readyState = 0 // CONNECTING
  readonly protocol: string
  readonly sent: { name: string, payload: unknown }[] = []
  pings = 0
  closes = 0
  /** The server never answers a close: `close()` does not complete. */
  closeHangs = false
  /** Every send fails, as on a connection that died without a close yet. */
  failSends = false

  constructor (protocol: string) {
    super()
    this.protocol = protocol
  }

  send (data: string, callback: (error?: Error) => void): void {
    if (this.failSends) {
      queueMicrotask(() => callback(new Error('socket write failed')))
      return
    }
    this.sent.push(JSON.parse(data))
    callback()
  }

  ping (): void { this.pings++ }

  readonly #eventListeners = new Map<(event: unknown) => void, (...args: unknown[]) => void>()

  /** As in `ws`: the listener gets one event object, not the emitter's arguments. */
  addEventListener (type: string, listener: (event: unknown) => void): void {
    const wrapper = (...args: unknown[]) => {
      const [ first, second ] = args
      switch (type) {
        case 'close':
          return listener({ type, target: this, code: first, reason: String(second) })
        case 'error':
          return listener({ type, target: this, error: first, message: (first as Error).message })
        case 'message':
          return listener({ type, target: this, data: first })
        default:
          return listener({ type, target: this })
      }
    }
    this.#eventListeners.set(listener, wrapper)
    this.on(type, wrapper)
  }

  removeEventListener (type: string, listener: (event: unknown) => void): void {
    const wrapper = this.#eventListeners.get(listener)
    if (wrapper) {
      this.#eventListeners.delete(listener)
      this.off(type, wrapper)
    }
  }

  close (): void {
    this.closes++
    if (this.closeHangs) {
      this.readyState = 2 // CLOSING, until terminated
      return
    }
    this.#closed(1000, 'closed by client')
  }

  /**
   * As in `ws`: terminating a socket that is still connecting reports an
   * `error` on the next tick, then closes it.
   */
  terminate (): void {
    if (this.readyState === 0) {
      this.readyState = 2 // CLOSING
      process.nextTick(() => {
        this.emit('error', new Error('WebSocket was closed before the connection was established'))
        this.#closed(1006, 'terminated')
      })
      return
    }
    this.#closed(1006, 'terminated')
  }

  /** The server accepts the connection. */
  open (): void {
    this.readyState = 1 // OPEN
    this.emit('open')
  }

  /** The server refuses the connection. */
  refuse (): void {
    this.readyState = 3 // CLOSED
    this.emit('error', new Error('connection refused'))
  }

  /** The server drops an open connection. */
  drop (): void {
    this.#closed(1001, 'going away')
  }

  /** The server sends an Io event. */
  receive (name: string, payload: unknown): void {
    this.emit('message', Buffer.from(JSON.stringify({ name, payload })))
  }

  #closed (code: number, reason: string): void {
    if (this.readyState === 3) {
      return
    }
    this.readyState = 3 // CLOSED
    queueMicrotask(() => this.emit('close', code, Buffer.from(reason)))
  }

}

/** A bot with only what Io and IoClient use. */
export class FakeWechaty extends EventEmitter {

  readonly id = 'fake-bot'
  readonly log: string[] = []
  readonly errors: unknown[] = []
  isLoggedIn = false
  readonly puppet = {
    currentUserId  : 'me',
    contactPayload : async (id: string) => ({ id }),
    messagePayload : async (id: string) => ({ id }),
  }

  readonly #eventListeners = new Map<EventListenerOrEventListenerObject, { wrapper: (...args: unknown[]) => void, signal?: AbortSignal, abortListener?: () => void }>()

  addEventListener (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (!listener) {
      return
    }
    const signal = typeof options === 'object' ? options?.signal : undefined
    if (signal?.aborted) {
      return
    }

    const callback = typeof listener === 'function' ? listener : (ev: Event) => listener.handleEvent(ev)
    const wrapper = (...args: unknown[]) => {
      const detail = args.length <= 1 ? args[0] : args
      callback(new CustomEvent(type, { detail }))
    }

    let abortListener: (() => void) | undefined
    if (signal) {
      abortListener = () => {
        this.removeEventListener(type, listener)
      }
      signal.addEventListener('abort', abortListener, { once: true })
    }

    this.#eventListeners.set(listener, { wrapper, signal, abortListener })
    this.on(type, wrapper)
  }

  removeEventListener (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void {
    if (!listener) {
      return
    }
    const entry = this.#eventListeners.get(listener)
    if (entry) {
      this.#eventListeners.delete(listener)
      if (entry.signal && entry.abortListener) {
        entry.signal.removeEventListener('abort', entry.abortListener)
      }
      this.off(type, entry.wrapper)
    }
  }

  version (): string { return '0.0.0-test' }
  emitError (error: unknown): void { this.errors.push(error) }
  async reset (): Promise<void> { this.log.push('reset') }
  async logout (): Promise<void> { this.log.push('logout') }
  async start (): Promise<void> { this.log.push('wechaty start') }
  async stop (): Promise<void> { this.log.push('wechaty stop') }

}

/**
 * An Io whose sockets are FakeSockets. Each connection attempt takes the next
 * entry of `attempts` (default `'open'`), settled in a microtask; the
 * backoff delays it asks for are recorded and replaced by `delayMs`.
 */
export class TestIo extends Io {

  readonly sockets: FakeSocket[] = []
  readonly attempts: Attempt[]
  readonly backoffs: number[] = []
  delayMs = 0
  closeTimeout = 5 * 1000
  maxBuffered = 1000
  /** Called in the same tick a socket opens, e.g. for a server that speaks at once. */
  onOpen?: (socket: FakeSocket) => void

  constructor (options: IoOptions, attempts: Attempt[] = []) {
    super(options)
    this.attempts = attempts
  }

  /** The default backoff, for tests of the policy itself. */
  defaultDelay (failures: number): number {
    return super.reconnectDelayMs(failures)
  }

  protected override reconnectDelayMs (failures: number): number {
    if (failures > 0) {
      this.backoffs.push(failures)
    }
    return failures === 0 ? 0 : this.delayMs
  }

  protected override closeTimeoutMs (): number {
    return this.closeTimeout
  }

  protected override maxBufferedEvents (): number {
    return this.maxBuffered
  }

  protected override createWebSocket (_endpoint: string, protocol: string): IoWebSocket {
    const socket = new FakeSocket(protocol)
    this.sockets.push(socket)
    const attempt = this.attempts.shift() ?? 'open'
    if (attempt !== 'pending') {
      queueMicrotask(() => {
        if (attempt === 'open') {
          socket.open()
          this.onOpen?.(socket)
        } else {
          socket.refuse()
        }
      })
    }
    return socket as unknown as IoWebSocket
  }

  get socket (): FakeSocket {
    return this.sockets.at(-1)!
  }

}

/** An Io for `bot`, with scripted connection attempts. */
export function testIo (bot: FakeWechaty, attempts: Attempt[] = []): TestIo {
  return new TestIo({ token: 'test-token', wechaty: bot as never }, attempts)
}

/** Let promise chains settle. */
export async function flush (turns = 200): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}
