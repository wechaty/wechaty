/**
 * Acceptance-style lifecycle traces for the async lifecycle kernel.
 *
 * The tests focus on deterministic races from #2905/#2911 using deferred
 * promises and in-memory hooks so behavior is portable across Node.js and Deno.
 */
import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'
import { test } from 'node:test'

import {
  AsyncLifecycle,
  createLifecycle,
  LifecycleSupersededError,
  type LifecycleScope,
} from './mod.ts'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error?: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test('concurrent start joins one attempt', async () => {
  let onStartCalls = 0

  const gate = deferred<void>()
  const lifecycle = createLifecycle({
    async onStart(scope) {
      onStartCalls++
      await Promise.race([
        gate.promise,
        new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true })),
      ])
    },
  })

  const p1 = lifecycle.start()
  const p2 = lifecycle.start()
  gate.resolve()
  await Promise.all([p1, p2])

  assert.equal(onStartCalls, 1)
  assert.equal(lifecycle.state.kind, 'running')
})

test('stop supersedes a pending start and late start completion does not publish running', async () => {
  const gate = deferred<void>()
  const lifecycle = createLifecycle({
    async onStart() {
      await gate.promise
    },
  })

  const startPromise = lifecycle.start()
  await sleep(0)
  const stopPromise = lifecycle.stop()

  gate.resolve()

  await assert.rejects(() => startPromise, LifecycleSupersededError)
  await stopPromise
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('reentrant stop from onStateChange does not convert finished start into rejection', async () => {
  let started = false
  const lifecycle = createLifecycle({
    onStart() {
      started = true
    },
    onStateChange(state) {
      if (state.kind === 'running') {
        void lifecycle.stop()
      }
    },
  })

  await lifecycle.start()
  assert.equal(started, true)
  await lifecycle.whenState(state => state.kind === 'stopped')
})

test('throwing whenState predicate rejects only that waiter', async () => {
  const lifecycle = createLifecycle({
    onStart() {},
  })
  const bad = lifecycle.whenState(() => {
    throw new Error('predicate failed')
  })
  const good = lifecycle.whenState(state => state.kind === 'running')

  await assert.rejects(() => bad, /predicate failed/)
  await lifecycle.start()
  await good
})

test('failed clean start can be stopped and retried', async () => {
  let fail = true
  const lifecycle = createLifecycle({
    onStart() {
      if (fail) {
        throw new Error('boom')
      }
    },
  })

  await assert.rejects(() => lifecycle.start(), /boom/)
  assert.equal(lifecycle.state.kind, 'failed')

  await lifecycle.stop()
  assert.equal(lifecycle.state.kind, 'stopped')

  fail = false
  await lifecycle.start()
  assert.equal(lifecycle.state.kind, 'running')
})

test('restart superseded by stop ends stopped', async () => {
  const lifecycle = createLifecycle({
    onStart() {},
  })
  await lifecycle.start()

  const restart = lifecycle.restart()
  const stop = lifecycle.stop()

  await assert.rejects(() => restart, LifecycleSupersededError)
  await stop
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('condition wait before start binds to next generation and rejects on failed generation', async () => {
  const lifecycle = createLifecycle({
    onStart() {
      throw new Error('fail generation')
    },
  })
  const ready = lifecycle.condition('ready')
  const pendingReady = ready.wait()

  await assert.rejects(() => lifecycle.start(), /fail generation/)
  await assert.rejects(() => pendingReady, /failed generation/i)
})

test('retired generation fail and set calls are ignored', async () => {
  let capturedScope: LifecycleScope | undefined
  const lifecycle = createLifecycle({
    onStart(scope) {
      capturedScope = scope
    },
  })

  await lifecycle.start()
  await lifecycle.stop()
  const snapshot = lifecycle.state

  capturedScope?.fail(new Error('late failure'))
  const condition = lifecycle.condition('ready')
  capturedScope?.set(condition)

  await sleep(0)
  assert.deepEqual(lifecycle.state, snapshot)
})

test('owned child unexpected stop fails parent generation', async () => {
  class Child extends AsyncLifecycle {
    protected override onStart(): void {}
  }

  const child = new Child()
  const parent = createLifecycle({
    async onStart(scope) {
      await scope.start(child)
    },
  })

  await parent.start()
  await child.stop()

  const failed = await parent.whenState(state => state.kind === 'failed')
  assert.equal(failed.kind, 'failed')
  assert.equal(failed.phase, 'run')
})
