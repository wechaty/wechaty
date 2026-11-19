/**
 * Exercises the lifecycle shutdown contract with a real TCP connection.
 * The loopback peer lets this integration test verify closure independently of
 * the task and final disposer that share the client socket. The same trace
 * covers both public lifecycle entry points. Opt in when the runner can bind
 * to the loopback interface.
 */
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, Socket } from 'node:net'
import { env } from 'node:process'
import { test } from 'node:test'

import { AsyncLifecycle, createLifecycle, type LifecycleHooks, type LifecycleScope } from './mod.ts'

/** Run the same socket hooks through the subclass API. */
class SocketLifecycle extends AsyncLifecycle {
  readonly #hooks: LifecycleHooks

  /** Give both entry points the same shutdown budget. */
  constructor(hooks: LifecycleHooks) {
    super({ stopTimeoutMs: 2000 })
    this.#hooks = hooks
  }

  /** Delegate startup to the shared socket fixture. */
  protected override onStart(scope: LifecycleScope) {
    return this.#hooks.onStart(scope)
  }

  /** Delegate graceful shutdown to the shared socket fixture. */
  protected override onStop(scope: LifecycleScope) {
    return this.#hooks.onStop?.(scope)
  }
}

const entryPoints = [
  ['composition', (hooks: LifecycleHooks) => createLifecycle(hooks, { stopTimeoutMs: 2000 })],
  ['inheritance', (hooks: LifecycleHooks) => new SocketLifecycle(hooks)],
] as const

for (const [name, create] of entryPoints) {
  test(`${name}: abort closes a connected socket and the waiting task finishes before disposal`, {
    timeout: 5000,
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
      async onStart(scope) {
        scope.adopt(socket, resource => {
          trace.push('dispose socket')
          resource.destroy()
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
      onStop(scope) {
        assert.equal(scope.signal.aborted, false)
        assert.equal(socket.destroyed, false)
        trace.push('onStop')
      },
    })

    await service.start()
    const disconnected = once(await accepted.promise, 'close')
    await service.stop()
    await disconnected
    assert.deepEqual(trace, ['onStop', 'abort', 'task observed close', 'dispose last registration', 'dispose socket'])
    assert.equal(service.state.kind, 'stopped')
  })
}

test('concurrent stop callers join retirement and dispose each resource once', { timeout: 5000 }, async () => {
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  let stopCalls = 0
  let disposalCalls = 0
  const lifecycle = createLifecycle({
    onStart(scope) {
      scope.defer(() => { disposalCalls++ })
    },
    async onStop() {
      stopCalls++
      entered.resolve()
      await release.promise
    },
  })

  await lifecycle.start()
  const first = lifecycle.stop()
  await entered.promise
  const second = lifecycle.stop()
  assert.equal(stopCalls, 1)
  assert.equal(disposalCalls, 0)

  release.resolve()
  await Promise.all([first, second])
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(stopCalls, 1)
  assert.equal(disposalCalls, 1)
})
