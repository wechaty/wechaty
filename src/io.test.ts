#!/usr/bin/env node
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
 * Deterministic unit tests for `Io` lifecycle management without live network
 * sockets (portable across Node.js and Deno without `--allow-net`).
 *
 * Verifies scoped `Wechaty` listener registration/teardown across restarts,
 * absence of background reconnects on failed initial WebSocket handshakes,
 * immediate `stop()` settlement when a WebSocket is already `CLOSED`, and
 * authoritative handling of remote `reset` and `shutdown` messages.
 */
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import WebSocket from 'ws'

import {
  Io,
  type WebSocketLike,
} from './io.ts'
import { WechatyBuilder } from './wechaty-builder.ts'

class FakeWebSocket extends EventEmitter implements WebSocketLike {

  protocol: string
  readyState: number = WebSocket.CONNECTING
  readonly sent: string[] = []
  pingCount = 0

  constructor (protocol: string) {
    super()
    this.protocol = protocol
  }

  ping (): void {
    this.pingCount++
  }

  send (data: string, cb: (err?: Error) => void): void {
    this.sent.push(data)
    cb()
  }

  close (): void {
    if (this.readyState === WebSocket.CLOSED) {
      return
    }
    this.readyState = WebSocket.CLOSED
    this.emit('close', 1000, Buffer.from('normal'))
  }

  openNow (): void {
    this.readyState = WebSocket.OPEN
    this.emit('open')
  }

}

test('Io attaches and detaches all Wechaty listeners across restarts and stops cleanly when socket is already CLOSED', async () => {
  const wechaty = WechatyBuilder.build()
  const sockets: FakeWebSocket[] = []

  const io = new Io({
    apihost: '127.0.0.1:8788',
    createWebSocket: (_endpoint, protocol) => {
      const ws = new FakeWebSocket(protocol)
      sockets.push(ws)
      queueMicrotask(() => ws.openNow())
      return ws
    },
    servicePort: 8788,
    token: 'mock_token',
    wechaty,
  })

  const trackedEvents = [ 'error', 'heartbeat', 'login', 'logout', 'message', 'scan' ] as const
  const botEmitter = wechaty as unknown as EventEmitter

  for (let cycle = 1; cycle <= 3; cycle++) {
    await io.start()
    assert.equal(io.state.kind, 'running')
    for (const ev of trackedEvents) {
      assert.equal(botEmitter.listenerCount(ev), 1, `cycle ${cycle}: expected 1 ${ev} listener`)
    }

    // Simulate an already-closed WebSocket before `io.stop()` is called!
    sockets[cycle - 1]!.readyState = WebSocket.CLOSED
    await io.stop()
    assert.equal(io.state.kind, 'stopped')
    for (const ev of trackedEvents) {
      assert.equal(botEmitter.listenerCount(ev), 0, `cycle ${cycle}: expected 0 ${ev} listeners after stop`)
    }
  }
})

test('Io failed initial handshake cleans up listeners and never schedules background reconnect', async () => {
  const wechaty = WechatyBuilder.build()
  const botEmitter = wechaty as unknown as EventEmitter
  let socketCreations = 0

  const io = new Io({
    apihost: '127.0.0.1:8788',
    createWebSocket: (_endpoint, protocol) => {
      socketCreations++
      const ws = new FakeWebSocket(protocol)
      queueMicrotask(() => {
        ws.readyState = WebSocket.CLOSED
        ws.emit('close', 1006, Buffer.from('handshake refused'))
      })
      return ws
    },
    token: 'mock_token',
    wechaty,
  })

  await assert.rejects(io.start(), /WebSocket closed before open/)
  assert.equal(io.state.kind, 'failed')
  assert.equal(botEmitter.listenerCount('message'), 0, 'failed start must roll back Wechaty listeners')

  await new Promise<void>(resolve => setTimeout(resolve, 15))
  assert.equal(socketCreations, 1, 'must not trigger background reconnect when initial start() failed')
  await io.stop()
})

test('Io routes remote reset and shutdown messages through Wechaty lifecycle without process.exit()', async t => {
  const wechaty = WechatyBuilder.build()
  wechaty.on('error', () => {})
  const resetMock = t.mock.method(wechaty, 'reset', async () => {})
  const stopMock = t.mock.method(wechaty, 'stop', async () => {})

  let activeSocket!: FakeWebSocket
  const io = new Io({
    apihost: '127.0.0.1:8788',
    createWebSocket: (_endpoint, protocol) => {
      activeSocket = new FakeWebSocket(protocol)
      queueMicrotask(() => activeSocket.openNow())
      return activeSocket
    },
    token: 'mock_token',
    wechaty,
  })

  await io.start()
  activeSocket.emit('message', JSON.stringify({ name: 'reset', payload: 'cloud-reset' }))
  activeSocket.emit('message', JSON.stringify({ name: 'shutdown', payload: 'cloud-shutdown' }))
  await new Promise<void>(resolve => setImmediate(resolve))

  assert.equal(resetMock.mock.callCount(), 1)
  assert.equal(stopMock.mock.callCount(), 1)

  await io.stop()
})
