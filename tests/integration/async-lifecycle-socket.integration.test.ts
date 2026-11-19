/**
 * Exercises the lifecycle shutdown contract with a real TCP connection.
 * The loopback peer lets this integration test verify closure independently of
 * the task and final disposer that share the client socket.
 */
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, Socket } from 'node:net'
import { test } from 'node:test'

import { createLifecycle } from '../../src/async-lifecycle/mod.ts'

test('abort closes a connected socket and the waiting task finishes before disposal', { timeout: 5000 }, async t => {
  const accepted = Promise.withResolvers<Socket>()
  const server = createServer(accepted.resolve)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const socket = new Socket()
  let peer: Socket | undefined
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
  const service = createLifecycle({
    async onStart(scope) {
      scope.adopt(socket, resource => {
        trace.push('dispose')
        resource.destroy()
      })
      scope.spawn(async signal => {
        const close = () => { socket.destroy() }
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
  }, { stopTimeoutMs: 2000 })

  await service.start()
  peer = await accepted.promise
  const disconnected = once(peer, 'close')
  await service.stop()
  await disconnected
  assert.deepEqual(trace, ['task observed close', 'dispose'])
  assert.equal(service.state.kind, 'stopped')
})
