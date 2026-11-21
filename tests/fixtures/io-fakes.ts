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

import { Io, type IoOptions, type IoWebSocket } from '../../src/io.ts'

/** What a scripted connection attempt does. */
export type Attempt = 'open' | 'refuse'

/** A WebSocket stand-in: `ws`'s readyState values, events and methods. */
export class FakeSocket extends EventEmitter {

  readyState = 0 // CONNECTING
  readonly protocol: string
  readonly sent: { name: string, payload: unknown }[] = []
  pings = 0
  closes = 0

  constructor (protocol: string) {
    super()
    this.protocol = protocol
  }

  send (data: string, callback: (error?: Error) => void): void {
    this.sent.push(JSON.parse(data))
    callback()
  }

  ping (): void { this.pings++ }

  close (): void {
    this.closes++
    this.#closed(1000, 'closed by client')
  }

  terminate (): void {
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

  protected override createWebSocket (_endpoint: string, protocol: string): IoWebSocket {
    const socket = new FakeSocket(protocol)
    this.sockets.push(socket)
    const attempt = this.attempts.shift() ?? 'open'
    queueMicrotask(() => (attempt === 'open' ? socket.open() : socket.refuse()))
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
