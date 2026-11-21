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
 * Tests for `Io` on the async lifecycle module (wechaty/wechaty#3022), against
 * a fake WebSocket and a fake bot (`tests/fixtures/io-fakes.ts`).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { flush, testIo, FakeWechaty } from '../tests/fixtures/io-fakes.ts'

/** The names of the Io events a socket received. */
const names = (sent: { name: string }[]) => sent.map(event => event.name)

test('start() connects and announces the bot; stop() flushes what is buffered, then closes the socket; redundant calls resolve', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  await io.start()
  assert.deepEqual(io.state, { kind: 'running', generation: 1 })
  const socket = io.socket
  assert.deepEqual(names(socket.sent), [ 'sys' ])

  bot.emit('heartbeat', 'beat')
  await flush()
  assert.deepEqual(names(socket.sent), [ 'sys', 'heartbeat' ])

  await io.start()
  assert.equal(io.sockets.length, 1, 'start() while running resolves without a new connection')

  await io.stop()
  assert.equal(socket.closes, 1)
  assert.equal(io.state.kind, 'stopped')
  await io.stop()
  assert.equal(io.state.kind, 'stopped', 'stop() while stopped resolves')

  bot.emit('heartbeat', 'after stop')
  await flush()
  assert.deepEqual(names(socket.sent), [ 'sys', 'heartbeat' ], 'nothing is forwarded once stopped')
})

test('the bot listeners are added for each run and removed when it stops, so they never pile up', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  for (let round = 0; round < 3; round++) {
    await io.start()
    assert.equal(bot.listenerCount('message'), 1, `round ${round}`)
    await io.stop()
    for (const event of [ 'error', 'heartbeat', 'login', 'logout', 'message', 'scan' ]) {
      assert.equal(bot.listenerCount(event), 0, `round ${round}: ${event}`)
    }
  }
})

test('a dropped socket recovers: the next run reconnects with backoff, retries while the server refuses, and sends what was buffered meanwhile', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot, [ 'open', 'refuse', 'refuse', 'open' ])
  await io.start()
  io.sockets[0]!.drop()
  await flush()
  bot.emit('heartbeat', 'while offline')
  await io.whenState(state => state.kind === 'running' && state.generation === 2)
  await flush()
  assert.equal(io.sockets.length, 4)
  assert.deepEqual(io.backoffs, [ 1, 2, 3 ], 'one backoff per failure since the drop')
  assert.ok(names(io.socket.sent).includes('heartbeat'), 'the buffered event is sent on the new socket')
  await io.stop()
})

test('a first start() whose connection is refused rejects at once, without retrying', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot, [ 'refuse' ])
  await assert.rejects(io.start(), /connection refused/)
  assert.equal(io.sockets.length, 1)
  assert.deepEqual(io.backoffs, [])
  // The start rejects when the failure is decided, before cleanup ends (D35).
  const failed = await io.whenState(state => state.kind !== 'stopping')
  assert.equal(failed.kind, 'failed')
  await io.start() // a clean failure can start again
  assert.equal(io.state.kind, 'running')
  await io.stop()
})

test('stop() while reconnecting cancels the backoff wait, and the next start() is a single attempt again', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot, [ 'open' ])
  io.delayMs = 60_000 // a real timer that must be cancelled
  await io.start()
  io.sockets[0]!.drop()
  await flush()
  assert.equal(io.state.kind, 'starting')
  await io.stop()
  assert.equal(io.state.kind, 'stopped')
  assert.equal(io.sockets.length, 1, 'no reconnect after stop()')

  io.attempts.push('refuse')
  await assert.rejects(io.start(), /connection refused/, 'not a retrying reconnect')
})

test('the default backoff is none, then 1 s, 3 s, 9 s, 27 s, capped at 30 s', () => {
  const io = testIo(new FakeWechaty())
  assert.deepEqual([ 0, 1, 2, 3, 4, 5, 9 ].map(failures => io.defaultDelay(failures)), [ 0, 1_000, 3_000, 9_000, 27_000, 30_000, 30_000 ])
})

test('a reset from the server is reported and resets the bot', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  await io.start()
  io.socket.receive('reset', 'maintenance')
  await flush()
  assert.deepEqual(bot.log, [ 'reset' ])
  assert.equal(bot.errors.length, 1)
  await io.stop()
})
