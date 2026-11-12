#!/usr/bin/env -S node --import=tsx/esm
import {
  test,
}           from 'tstest'

import {
  retryPolicy,
}           from './retry-policy.js'

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
  t.teardown(() => disposables.forEach(disposable => disposable.dispose()))

  let successCalls = 0
  retryDelays.length = 0
  successDurations.length = 0
  await withImmediateTimers(async delays => {
    const result = await retryPolicy.execute(() => {
      successCalls++
      return 'success'
    })

    t.equal(result, 'success', 'returns the initial successful result')
    t.equal(successCalls, 1, 'does not repeat a successful call')
    t.equal(delays.length, 0, 'does not wait when the initial call succeeds')
    t.equal(retryDelays.length, 0, 'does not emit retry events')
    t.equal(successDurations.length, 1, 'emits one success event')
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

    t.equal(result, 'recovered', 'returns the result after transient failures')
    t.equal(recoveryCalls, 3, 'retries twice before recovering')
    t.equal(delays.length, 2, 'waits once for each retry')
    t.equal(retryDelays.length, 2, 'emits one event for each retry')
    t.ok(delays.every(delay => delay >= 0 && delay <= 10_000), 'keeps jittered delays within the configured maximum')
    t.ok(delays[0]! >= 0, 'has a non-negative first delay')
    t.ok(retryDelays.every(delay => delay >= 0 && delay <= 10_000), 'reports jittered delays within the configured maximum')
    t.equal(successDurations.length, 1, 'emits one success event after recovery')
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

    t.equal(caughtError, finalError, 'propagates the final error unchanged')
    t.equal(exhaustedCalls, 4, 'makes the initial call plus three retries')
    t.equal(delays.length, 3, 'waits for each of the three retries')
    t.equal(retryDelays.length, 3, 'emits one event for each retry')
    t.ok(delays.every(delay => delay >= 0 && delay <= 10_000), 'caps all exhausted-retry delays at ten seconds')
    t.equal(successDurations.length, 0, 'does not emit a success event')
  })
})
