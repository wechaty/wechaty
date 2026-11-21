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
 * `Io` against a real `ws` server on the loopback interface. The unit tests
 * (`io.test.ts`) use a fake socket; this checks what a fake can get wrong, such
 * as the event shapes `ws` passes (a `ws` socket is also an `EventTarget`).
 * Opt in with `ASYNC_LIFECYCLE_TCP_TEST=1`, like the lifecycle's own loopback
 * test, where the runner may bind to the loopback interface.
 */
import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { env } from 'node:process'
import { test } from 'node:test'

import { WebSocketServer, type WebSocket } from 'ws'

import { Io } from './io.ts'
import { FakeWechaty } from '../tests/fixtures/io-fakes.ts'

/** An Io that reconnects without the default 1 s backoff. */
class LoopbackIo extends Io {

  protected override reconnectDelayMs (): number {
    return 10
  }

}

test('Io recovers when a real ws server drops the connection, and sends what was buffered meanwhile', {
  skip: env['ASYNC_LIFECYCLE_TCP_TEST'] !== '1' && 'Set ASYNC_LIFECYCLE_TCP_TEST=1 to run the loopback test',
}, async () => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  await once(server, 'listening')
  const { port } = server.address() as AddressInfo
  const connections: { socket: WebSocket, names: string[] }[] = []
  server.on('connection', socket => {
    const connection = { socket, names: [] as string[] }
    connections.push(connection)
    socket.on('message', data => connection.names.push(JSON.parse(String(data)).name))
  })

  const bot = new FakeWechaty()
  const io = new LoopbackIo({ token: 'test-token', wechaty: bot as never, apihost: `127.0.0.1:${port}` })
  try {
    await io.start()
    const first = connections[0]!
    while (first.names.length === 0) {
      await once(first.socket, 'message')
    }

    first.socket.close(1001, 'going away')
    await io.whenState(state => state.kind === 'starting')
    bot.emit('heartbeat', 'while offline')
    await io.whenState(state => state.kind === 'running' && state.generation === 2)

    const second = connections[1]!
    while (second.names.length < 2) {
      await once(second.socket, 'message')
    }
    assert.deepEqual(first.names, [ 'sys' ])
    assert.deepEqual(second.names, [ 'sys', 'heartbeat' ])
  } finally {
    await io.stop()
    server.close()
  }
  assert.equal(io.state.kind, 'stopped')
})
