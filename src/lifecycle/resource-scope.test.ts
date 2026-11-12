/**
 * Deterministic unit tests for `ResourceScope` structured concurrency,
 * three-phase shutdown, partial-startup rollback, late-acquisition cleanup,
 * retryable disposers, and scoped event listener ownership.
 */
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'

import {
  LifecycleAggregateCleanupError,
  LifecycleTimeoutError,
} from './errors.ts'
import { ResourceScope } from './resource-scope.ts'

function defer<T = void> () {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, reject, resolve }
}

test('ResourceScope acquires in order and disposes in strict LIFO order', async () => {
  const trace: string[] = []
  const scope = new ResourceScope()

  const a = await scope.acquire({
    create: () => {
      trace.push('create:A')
      return 'A'
    },
    dispose: value => {
      trace.push(`dispose:${value}`)
    },
    interrupt: value => {
      trace.push(`interrupt:${value}`)
    },
  })

  const b = await scope.acquire({
    create: async () => {
      trace.push('create:B')
      return 'B'
    },
    dispose: async value => {
      trace.push(`dispose:${value}`)
    },
    interrupt: value => {
      trace.push(`interrupt:${value}`)
    },
  })

  assert.equal(a, 'A')
  assert.equal(b, 'B')

  const result = await scope.close()
  assert.equal(result.cleanupComplete, true)
  assert.equal(result.errors.length, 0)
  assert.deepEqual(trace, [
    'create:A',
    'create:B',
    'interrupt:B',
    'interrupt:A',
    'dispose:B',
    'dispose:A',
  ])
})

test('ResourceScope rolls back only acquired resources on partial startup failure', async () => {
  const trace: string[] = []
  const scope = new ResourceScope()

  await scope.acquire({
    create: () => {
      trace.push('create:A')
      return 'A'
    },
    dispose: () => {
      trace.push('dispose:A')
    },
  })

  await assert.rejects(
    scope.acquire({
      create: () => {
        trace.push('create:B:fail')
        throw new Error('B failed')
      },
      dispose: () => {
        trace.push('dispose:B:should-not-run')
      },
    }),
    /B failed/,
  )

  const closeResult = await scope.close()
  assert.equal(closeResult.cleanupComplete, true)
  assert.deepEqual(trace, [
    'create:A',
    'create:B:fail',
    'dispose:A',
  ])
})

test('ResourceScope interrupt unblocks socket-bound background tasks without deadlocking close()', async () => {
  const trace: string[] = []
  const scope = new ResourceScope()
  const socketClosed = defer<void>()

  await scope.acquire({
    create: () => {
      trace.push('socket:open')
      return {
        close: () => {
          trace.push('socket:interrupt')
          socketClosed.resolve()
        },
      }
    },
    dispose: value => {
      void value
      trace.push('socket:dispose')
    },
    interrupt: socket => socket.close(),
  })

  // Task only exits once `socketClosed.promise` resolves during Phase 2 interrupt.
  scope.spawn(async () => {
    trace.push('reader:start')
    await socketClosed.promise
    trace.push('reader:exit')
  })

  await Promise.resolve()
  const result = await scope.close()
  assert.equal(result.cleanupComplete, true)
  assert.deepEqual(trace, [
    'socket:open',
    'reader:start',
    'socket:interrupt',
    'reader:exit',
    'socket:dispose',
  ])
})

test('ResourceScope continues sibling cleanup when interrupt or dispose throws and retries only failed disposers', async () => {
  const trace: string[] = []
  const scope = new ResourceScope()
  let failBDispose = true

  await scope.acquire({
    create: () => 'A',
    dispose: () => {
      trace.push('dispose:A')
    },
  })

  await scope.acquire({
    create: () => 'B',
    dispose: () => {
      trace.push('dispose:B')
      if (failBDispose) {
        throw new Error('transient B dispose error')
      }
    },
  })

  await scope.acquire({
    create: () => 'C',
    dispose: () => {
      trace.push('dispose:C')
    },
    interrupt: () => {
      trace.push('interrupt:C:throw')
      throw new Error('C interrupt error')
    },
  })

  const firstClose = await scope.close()
  assert.equal(firstClose.cleanupComplete, false)
  assert.equal(firstClose.errors.length, 2)
  assert.ok(firstClose.error instanceof LifecycleAggregateCleanupError)
  assert.deepEqual(trace, [
    'interrupt:C:throw',
    'dispose:C',
    'dispose:B',
    'dispose:A',
  ])

  // Retry cleanup after transient failure clears: only B's disposer runs again!
  failBDispose = false
  trace.length = 0
  const secondClose = await scope.close()
  assert.equal(secondClose.cleanupComplete, true)
  assert.equal(secondClose.errors.length, 0)
  assert.deepEqual(trace, [ 'dispose:B' ])
})

test('ResourceScope immediately interrupts and disposes late acquisitions after abort()', async () => {
  const trace: string[] = []
  const scope = new ResourceScope()
  const lateCreate = defer<string>()

  const acquirePromise = scope.acquire({
    create: async () => {
      trace.push('late:create:enter')
      const val = await lateCreate.promise
      trace.push('late:create:resolved')
      return val
    },
    dispose: async val => {
      trace.push(`late:dispose:${val}`)
    },
    interrupt: val => {
      trace.push(`late:interrupt:${val}`)
    },
  })

  scope.abort(new Error('shutting down'))
  lateCreate.resolve('LATE_RES')

  await assert.rejects(acquirePromise, /shutting down/)
  const closeResult = await scope.close()
  assert.equal(closeResult.cleanupComplete, true)
  assert.deepEqual(trace, [
    'late:create:enter',
    'late:create:resolved',
    'late:interrupt:LATE_RES',
    'late:dispose:LATE_RES',
  ])
})

test('ResourceScope reports cleanupComplete=false when an uncooperative creation remains hung past timeoutMs', async () => {
  const scope = new ResourceScope()
  const hungGate = defer<string>()
  const trace: string[] = []

  await scope.acquire({
    create: () => 'EARLY',
    dispose: () => {
      trace.push('dispose:EARLY')
    },
  })

  const hungAcquire = scope.acquire({
    create: () => hungGate.promise,
    dispose: val => {
      trace.push(`dispose:${val}`)
    },
  })

  const firstClose = await scope.close({ timeoutMs: 10 })
  assert.equal(firstClose.cleanupComplete, false)
  assert.equal(scope.pendingCreationCount, 1)
  assert.ok(firstClose.errors.some(err => err instanceof LifecycleTimeoutError))
  assert.deepEqual(trace, [ 'dispose:EARLY' ])

  // Once the hung creation finally resolves later, it is still cleaned up and a retry succeeds.
  hungGate.resolve('HUNG')
  await assert.rejects(hungAcquire)
  const retryClose = await scope.close()
  assert.equal(retryClose.cleanupComplete, true)
  assert.deepEqual(trace, [ 'dispose:EARLY', 'dispose:HUNG' ])
})

test('ResourceScope listen() detaches exact listeners across cycles and seals closed scope', async () => {
  const emitter = new EventEmitter()

  for (let cycle = 1; cycle <= 3; cycle++) {
    const scope = new ResourceScope()
    scope.listen(emitter, 'ready', () => {})
    scope.listen(emitter, 'logout', () => {})
    scope.listen(emitter, 'reset', () => {})

    assert.equal(emitter.listenerCount('ready'), 1)
    assert.equal(emitter.listenerCount('logout'), 1)
    assert.equal(emitter.listenerCount('reset'), 1)

    const closed = await scope.close()
    assert.equal(closed.cleanupComplete, true)
    assert.equal(emitter.listenerCount('ready'), 0)
    assert.equal(emitter.listenerCount('logout'), 0)
    assert.equal(emitter.listenerCount('reset'), 0)

    assert.throws(() => scope.listen(emitter, 'ready', () => {}))
    assert.throws(() => scope.onDispose(() => {}))
    assert.throws(() => scope.spawn(async () => {}))
    await assert.rejects(scope.acquire({ create: () => 1 }))
  }
})

test('ResourceScope captures non-abort background task errors during close()', async () => {
  const scope = new ResourceScope()
  scope.spawn(async () => {
    throw new Error('background worker boom')
  })
  await Promise.resolve()

  const result = await scope.close()
  assert.equal(result.cleanupComplete, false)
  assert.equal(result.errors.length, 1)
  assert.match(String(result.error), /background worker boom/)
})
