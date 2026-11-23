#!/usr/bin/env -S node --import=tsx/esm
import assert from 'node:assert/strict'
import {
  test,
}           from 'node:test'

import {
  retryPolicy,
}           from './retry-policy.ts'

async function withImmediateTimers<T> (
  callback: (delays: number[]) => Promise<T>,
): Promise<T> {
  const originalSetTimeout = globalThis.setTimeout
  const originalRandom = Math.random
  const delays: number[] = []
  const fakeSetTimeout = (
    handler: Parameters<typeof globalThis.setTimeout>[0],
    delay?: number,
  ): ReturnType<typeof globalThis.setTimeout> => {
    delays.push(delay ?? 0)
    if (typeof handler === 'function') {
      queueMicrotask(() => handler())
    }
    return originalSetTimeout(() => undefined, 0)
  }

  Reflect.set(globalThis, 'setTimeout', fakeSetTimeout)
  Math.random = () => 0.5
  try {
    return await callback(delays)
  } finally {
    Reflect.set(globalThis, 'setTimeout', originalSetTimeout)
    Math.random = originalRandom
  }
}

test('retry policy preserves Cockatiel 2.0.2 behavior contract', async t => {
  const retryDelays: number[] = []
  const successDurations: number[] = []

  const disposables = [
    retryPolicy.onRetry(({ delay }) => retryDelays.push(delay)),
    retryPolicy.onSuccess(({ duration }) => successDurations.push(duration)),
  ]
  t.after(() => disposables.forEach(disposable => disposable.dispose()))

  let successCalls = 0
  retryDelays.length = 0
  successDurations.length = 0
  await withImmediateTimers(async delays => {
    const result = await retryPolicy.execute(() => {
      successCalls++
      return 'success'
    })

    assert.equal(result, 'success', 'returns the initial successful result')
    assert.equal(successCalls, 1, 'does not repeat a successful call')
    assert.equal(delays.length, 0, 'does not wait when the initial call succeeds')
    assert.equal(retryDelays.length, 0, 'does not emit retry events')
    assert.equal(successDurations.length, 1, 'emits one success event')
  })

  let recoveryCalls = 0
  retryDelays.length = 0
  successDurations.length = 0
  await withImmediateTimers(async delays => {
    const result = await retryPolicy.execute(() => {
      recoveryCalls++
      if (recoveryCalls < 3) {
        throw new Error('transient')
      }
      return 'recovered'
    })

    assert.equal(result, 'recovered', 'returns the result after transient failures')
    assert.equal(recoveryCalls, 3, 'retries twice before recovering')
    assert.equal(delays.length, 2, 'waits once for each retry')
    assert.equal(retryDelays.length, 2, 'emits one event for each retry')
    assert.ok(delays.every(delay => delay >= 0 && delay <= 10_000), 'keeps jittered delays within the configured maximum')
    assert.ok(delays[0]! >= 0, 'has a non-negative first delay')
    assert.ok(retryDelays.every(delay => delay >= 0 && delay <= 10_000), 'reports jittered delays within the configured maximum')
    assert.equal(successDurations.length, 1, 'emits one success event after recovery')
  })

  const finalError = new Error('exhausted')
  let exhaustedCalls = 0
  retryDelays.length = 0
  successDurations.length = 0
  await withImmediateTimers(async delays => {
    let caughtError: unknown
    try {
      await retryPolicy.execute(() => {
        exhaustedCalls++
        throw finalError
      })
    } catch (error) {
      caughtError = error
    }

    assert.equal(caughtError, finalError, 'propagates the final error unchanged')
    assert.equal(exhaustedCalls, 4, 'makes the initial call plus three retries')
    assert.equal(delays.length, 3, 'waits for each of the three retries')
    assert.equal(retryDelays.length, 3, 'emits one event for each retry')
    assert.ok(delays.every(delay => delay >= 0 && delay <= 10_000), 'caps all exhausted-retry delays at ten seconds')
    assert.equal(successDurations.length, 0, 'does not emit a success event')
  })
})
