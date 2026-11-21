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
 * The retirement order (C-RET-01) with a real TCP connection, on both entry
 * points. Ported from the Codex comparison suite (S2) in S6
 * (wechaty/wechaty#2974); the S5 examples use a fake socket.
 *
 * A loopback peer checks that the socket really closes, independently of the
 * task and the cleanup that share it. Opt in with `ASYNC_LIFECYCLE_TCP_TEST=1`
 * where the runner may bind to the loopback interface (under Deno, with
 * `--allow-net`).
 */

import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, Socket } from 'node:net'
import { env } from 'node:process'
import { test } from 'node:test'

import { AsyncLifecycle, createLifecycle } from './mod.ts'
import type { Lifecycle, LifecycleHooks, LifecycleScope, LifecycleStop } from './types.ts'

/** The same socket hooks, through the inheritance entry point. */
class SocketLifecycle extends AsyncLifecycle {

  readonly #hooks: LifecycleHooks

  constructor (hooks: LifecycleHooks) {
    super({ stopTimeoutMs: 2_000 })
    this.#hooks = hooks
  }

  protected override onStart (scope: LifecycleScope) {
    return this.#hooks.onStart(scope)
  }

  protected override onStop (stop: LifecycleStop) {
    return this.#hooks.onStop?.(stop)
  }

}

const entryPoints: readonly (readonly [ string, (hooks: LifecycleHooks) => Lifecycle ])[] = [
  [ 'createLifecycle', hooks => createLifecycle(hooks, { stopTimeoutMs: 2_000 }) ],
  [ 'AsyncLifecycle', hooks => new SocketLifecycle(hooks) ],
]

for (const [ name, create ] of entryPoints) {
  test(`${name}: abort closes a connected socket, and the waiting task finishes before anything is released (C-RET-01)`, {
    timeout: 5_000,
    skip: env['ASYNC_LIFECYCLE_TCP_TEST'] !== '1' && 'Set ASYNC_LIFECYCLE_TCP_TEST=1 to run the loopback test',
  }, async t => {
    const accepted = Promise.withResolvers<Socket>()
    let peer: Socket | undefined
    const server = createServer(connection => {
      peer = connection
      accepted.resolve(connection)
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const socket = new Socket()
    t.after(async () => {
      socket.destroy()
      peer?.destroy()
      const closed = once(server, 'close')
      server.close()
      await closed
    })
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const trace: string[] = []
    const service = create({
      async onStart (scope) {
        // Registered first, so released last (the source's adopt(), D6).
        scope.defer(() => {
          trace.push('dispose socket')
          socket.destroy()
        })
        scope.defer(() => { trace.push('dispose last registration') })
        scope.spawn(async signal => {
          const close = () => {
            trace.push('abort')
            socket.destroy()
          }
          signal.addEventListener('abort', close, { once: true })
          try {
            await once(socket, 'close')
            trace.push('task observed close')
          } finally {
            signal.removeEventListener('abort', close)
          }
        })
        const connected = once(socket, 'connect')
        socket.connect(address.port, address.address)
        await connected
      },
      onStop (stop) {
        // onStop runs with its resources live and its scope not yet aborted.
        assert.equal(stop.signal.aborted, false)
        assert.equal(socket.destroyed, false)
        trace.push('onStop')
      },
    })

    await service.start()
    const disconnected = once(await accepted.promise, 'close')
    await service.stop()
    await disconnected
    assert.deepEqual(trace, [ 'onStop', 'abort', 'task observed close', 'dispose last registration', 'dispose socket' ])
    assert.equal(service.state.kind, 'stopped')
  })
}
