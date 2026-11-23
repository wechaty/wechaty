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
 * Runs the `Io` example (S5, wechaty/wechaty#2973) against a fake WebSocket on a
 * manual clock: an interruptible socket, a keepalive task, recovery when the
 * socket closes, and reconnect backoff with no retry policy in the kernel (D7).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { flush, ManualClock } from '../contract/harness.ts'
import { Io } from './io.example.ts'

/** A socket that records what is done to it and can be closed by the "server". */
class FakeSocket {

  readonly log: string[]
  readonly #listeners = new Set<() => void>()

  constructor (log: string[]) {
    this.log = log
  }

  on (_event: 'close', listener: () => void): void { this.#listeners.add(listener) }
  off (_event: 'close', listener: () => void): void { this.#listeners.delete(listener) }
  ping (): void { this.log.push('ping') }
  terminate (): void { this.log.push('terminate') }
  async close (): Promise<void> { this.log.push('close') }

  /** The server dropped the connection. */
  drop (): void {
    for (const listener of [ ...this.#listeners ]) {
      listener()
    }
  }

  get listeners (): number { return this.#listeners.size }

}

/** A server whose next connection attempts succeed or fail as scripted. */
function fakeServer (results: ('ok' | 'down')[] = []) {
  const log: string[] = []
  const sockets: FakeSocket[] = []
  const openSocket = async (_url: string, _signal: AbortSignal) => {
    const result = results.shift() ?? 'ok'
    log.push(`open:${result}`)
    if (result === 'down') {
      throw new Error('connection refused')
    }
    const socket = new FakeSocket(log)
    sockets.push(socket)
    return socket
  }
  return { log, sockets, openSocket }
}

test('Io connects, pings every 10 s, and on stop() interrupts the socket before closing it', async () => {
  const clock = new ManualClock()
  const server = fakeServer()
  const io = new Io({ url: 'wss://example', openSocket: server.openSocket, clock })
  await io.start()
  assert.deepEqual(io.state, { kind: 'running', generation: 1 })
  assert.deepEqual(server.log, [ 'open:ok', 'ping' ])
  await clock.advance(20_000)
  assert.deepEqual(server.log, [ 'open:ok', 'ping', 'ping', 'ping' ])

  await io.stop()
  assert.deepEqual(server.log.slice(-2), [ 'terminate', 'close' ], 'interrupt (step 4) before release (step 7)')
  assert.equal(server.sockets[0]!.listeners, 0, 'the close listener is removed')
  assert.equal(clock.pending, 0, 'no keepalive timer left')
  assert.equal(io.state.kind, 'stopped')
})

test('a dropped socket recovers into a new generation that reconnects with backoff, staying starting while offline', async () => {
  const clock = new ManualClock()
  const server = fakeServer([ 'ok', 'down', 'down', 'ok' ])
  const io = new Io({ url: 'wss://example', openSocket: server.openSocket, clock })
  await io.start()

  server.sockets[0]!.drop()
  await flush()
  assert.equal(io.state.kind, 'starting', 'offline: retrying inside onStart, not failed')
  assert.equal(io.state.generation, 2)
  assert.equal(server.log.filter(entry => entry.startsWith('open')).length, 1, 'the first retry waits 1 s')

  await clock.advance(1_000)
  assert.equal(io.failures, 2, 'the refused reconnect counts')
  await clock.advance(2_000)
  assert.equal(io.failures, 3, 'refused again after 2 s')
  await clock.advance(3_999)
  assert.equal(io.state.kind, 'starting', 'the backoff doubles: 4 s this time')
  await clock.advance(1)
  assert.deepEqual(server.log.filter(entry => entry.startsWith('open')), [ 'open:ok', 'open:down', 'open:down', 'open:ok' ])
  assert.deepEqual(io.state, { kind: 'running', generation: 2 })
  assert.equal(io.failures, 0)
  await io.stop()
})

test('stop() while Io is offline cancels the backoff wait at once', async () => {
  const clock = new ManualClock()
  const server = fakeServer([ 'ok', 'down' ])
  const io = new Io({ url: 'wss://example', openSocket: server.openSocket, clock })
  await io.start()
  server.sockets[0]!.drop()
  await flush()
  assert.equal(io.state.kind, 'starting')
  await io.stop()
  assert.equal(io.state.kind, 'stopped')
  assert.equal(clock.pending, 0, 'the backoff timer is cleared')
})
