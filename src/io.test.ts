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
import process from 'node:process'
import { setImmediate } from 'node:timers'

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

test('the bot listeners are added once per start() and removed when it stops, so they never pile up', async () => {
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

test('stop() while the socket is still connecting cancels it without an uncaught error', async () => {
  const uncaught: unknown[] = []
  const onUncaught = (error: unknown) => { uncaught.push(error) }
  process.on('uncaughtException', onUncaught)
  try {
    const io = testIo(new FakeWechaty(), [ 'pending' ])
    const started = io.start().then(() => 'resolved', (error: unknown) => error)
    await flush()
    await io.stop()
    assert.match(String(await started), /Superseded/)
    await new Promise(resolve => setImmediate(resolve)) // ws reports the abort on the next tick
    assert.deepEqual(uncaught, [])
    assert.equal(io.state.kind, 'stopped')
  } finally {
    process.off('uncaughtException', onUncaught)
  }
})

test('an event the bot emits right after the socket drops is sent on the next socket', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  await io.start()
  io.sockets[0]!.drop()
  bot.emit('heartbeat', 'just dropped') // the old run is still live, its socket closed
  await io.whenState(state => state.kind === 'running' && state.generation === 2)
  await flush()
  assert.ok(names(io.socket.sent).includes('heartbeat'), 'kept by the recovery, not dropped')
  await io.stop()
})

test('a frame the server sends as the connection opens is handled', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  io.onOpen = socket => socket.receive('reset', 'at once')
  await io.start()
  await flush()
  assert.deepEqual(bot.log, [ 'reset' ])
  await io.stop()
})

test('a stop() that supersedes a recovery before it reconnects leaves the next start() a single attempt', async () => {
  const io = testIo(new FakeWechaty(), [ 'open' ])
  await io.start()
  io.sockets[0]!.drop()
  for (let i = 0; i < 3; i++) {
    await Promise.resolve() // the close event: the recovery is accepted
  }
  assert.equal(io.state.kind, 'stopping', 'the recovery is retiring the old run')
  await io.stop()
  assert.equal(io.state.kind, 'stopped')
  io.attempts.push('refuse')
  await assert.rejects(io.start(), /connection refused/, 'not a retrying reconnect')
})


test('a server that accepts and drops at once keeps backing off, instead of starting from 1 s again', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot, [ 'open', 'open', 'open' ])
  await io.start()
  io.sockets[0]!.drop()
  await io.whenState(state => state.kind === 'running' && state.generation === 2)
  io.sockets[1]!.drop()
  await io.whenState(state => state.kind === 'running' && state.generation === 3)
  assert.deepEqual(io.backoffs, [ 1, 2 ], 'the second drop follows a connection that never stayed up')
  await io.stop()
})

test('stop() terminates a socket whose server never answers the close', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  io.closeTimeout = 10
  await io.start()
  io.socket.closeHangs = true
  await io.stop()
  assert.equal(io.state.kind, 'stopped')
  assert.equal(io.socket.readyState, 3, 'terminated')
})

test('an error the socket reports during the closing handshake is not an uncaught exception', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  io.closeTimeout = 10
  await io.start()
  const socket = io.socket
  socket.closeHangs = true
  const stopped = io.stop()
  await flush()
  assert.equal(socket.readyState, 2, 'closing')
  assert.doesNotThrow(() => socket.emit('error', new Error('invalid frame')))
  await stopped
})

test('what the outage buffered survives a stop() while reconnecting and is sent by the next start(), after the announcement', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  io.delayMs = 60_000
  await io.start()
  io.sockets[0]!.drop()
  await flush()
  bot.emit('heartbeat', 'during the outage')
  await io.stop()
  await io.start()
  assert.deepEqual(names(io.socket.sent), [ 'sys', 'heartbeat' ])
  await io.stop()
})

test('an event the bot emits while stop() closes the socket is sent by the next start()', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  io.closeTimeout = 10
  await io.start()
  io.socket.closeHangs = true
  const stopped = io.stop()
  await flush()
  bot.emit('heartbeat', 'while closing')
  await stopped
  await io.start()
  assert.deepEqual(names(io.socket.sent), [ 'sys', 'heartbeat' ])
  await io.stop()
})

test('an event the bot emits between a dropped run and its replacement is still sent', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot, [ 'open', 'open' ])
  await io.start()
  io.sockets[0]!.drop()
  // One heartbeat per microtask covers the gap between the old run's
  // retirement and the new run's onStart, however many ticks that takes.
  const sent: number[] = []
  for (let tick = 0; io.state.kind !== 'running' || io.state.generation !== 2; tick++) {
    assert.ok(tick < 1000, 'the recovery finishes')
    bot.emit('heartbeat', tick)
    sent.push(tick)
    await Promise.resolve()
  }
  await flush()
  const received = io.socket.sent
    .filter(event => event.name === 'heartbeat')
    .map(event => (event.payload as { data: number }).data)
  assert.deepEqual(received, sent)
  await io.stop()
})

test('an event whose send fails is kept and sent on the next connection, in order', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot, [ 'open', 'open' ])
  await io.start()
  io.sockets[0]!.failSends = true
  bot.emit('heartbeat', 1)
  bot.emit('heartbeat', 2)
  await flush()
  io.sockets[0]!.drop()
  await io.whenState(state => state.kind === 'running' && state.generation === 2)
  await flush()
  assert.deepEqual(names(io.socket.sent), [ 'sys', 'heartbeat', 'heartbeat' ])
  assert.deepEqual(io.socket.sent.slice(1).map(event => (event.payload as { data: number }).data), [ 1, 2 ])
  await io.stop()
})

test('restart() keeps what could not be sent, and the new connection sends it once', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot, [ 'open', 'open' ])
  await io.start()
  io.sockets[0]!.failSends = true
  bot.emit('heartbeat', 'unsent')
  await flush()
  await io.restart()
  await flush()
  assert.deepEqual(names(io.socket.sent), [ 'sys', 'heartbeat' ], 'one sys: the failed one is replaced')
  await io.stop()
})

test('the buffer is capped: beyond maxBufferedEvents() the oldest events are dropped', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  io.maxBuffered = 3
  io.delayMs = 60_000
  await io.start()
  io.sockets[0]!.drop()
  await flush()
  for (let n = 1; n <= 5; n++) {
    bot.emit('heartbeat', n)
  }
  await io.stop()
  await io.start()
  assert.deepEqual(io.socket.sent.map(event => event.name === 'sys' ? 'sys' : (event.payload as { data: number }).data), [ 'sys', 3, 4, 5 ])
  await io.stop()
})

test('an event that arrives as a flush finishes is still sent, whatever the microtask timing', async () => {
  for (let depth = 0; depth <= 12; depth++) {
    const bot = new FakeWechaty()
    const io = testIo(bot)
    await io.start()
    bot.emit('heartbeat', 'a')
    let hop: Promise<void> = Promise.resolve()
    for (let i = 0; i < depth; i++) {
      hop = hop.then(() => {})
    }
    await hop
    bot.emit('heartbeat', 'b')
    await flush()
    const beats = io.socket.sent
      .filter(event => event.name === 'heartbeat')
      .map(event => (event.payload as { data: string }).data)
    assert.deepEqual(beats, [ 'a', 'b' ], `depth ${depth}`)
    await io.stop()
  }
})

test('a first start() whose socket closes as it opens rejects, instead of running on a dead socket', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot)
  io.onOpen = socket => socket.drop()
  await assert.rejects(io.start(), /websocket closed as it opened/)
  const settled = await io.whenState(state => state.kind !== 'stopping')
  assert.equal(settled.kind, 'failed')
})

test('a recovery whose socket closes as it opens counts a failed attempt and connects again', async () => {
  const bot = new FakeWechaty()
  const io = testIo(bot, [ 'open', 'open', 'open' ])
  await io.start()
  let drops = 1
  io.onOpen = socket => {
    if (drops-- > 0) {
      socket.drop()
    }
  }
  io.sockets[0]!.drop()
  await io.whenState(state => state.kind === 'running' && state.generation === 2)
  assert.equal(io.sockets.length, 3)
  assert.equal(io.socket.readyState, 1, 'running on an open socket')
  assert.deepEqual(io.backoffs, [ 1, 2 ])
  await io.stop()
})
