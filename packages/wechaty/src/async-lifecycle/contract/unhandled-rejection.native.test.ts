/** Lifecycle contracts that observe the native process rejection event. */
import assert from 'node:assert/strict'
import process from 'node:process'
import { setImmediate } from 'node:timers'

import { failedState, flush, observe } from './harness.ts'
import { contract } from './suite.ts'

contract('C-CMD-02.c', 'a caller that aborted early never leaves a later cleanup failure as an unhandled rejection', {}, async ({ make }) => {
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    const gate = Promise.withResolvers<void>()
    const caller = new AbortController()
    const cleanupError = new Error('cleanup')
    const { lifecycle } = make({
      onStart (scope) {
        scope.defer(() => { throw cleanupError })
        scope.signal.addEventListener('abort', () => caller.abort(new Error('caller')))
        return gate.promise
      },
    })
    observe(lifecycle.start())
    await flush()
    const stopped = observe(lifecycle.stop({ signal: caller.signal }))
    gate.resolve()
    await flush()
    assert.equal(stopped.status, 'rejected')
    assert.equal(failedState(lifecycle.state).cleanupError, cleanupError)
    // Unhandled rejections are reported at the next macrotask; no real time passes.
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(unhandled, [])
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

contract('C-SCOPE-05.h', 'an interrupt promise that rejects before the unwind reaches its join is no unhandled rejection, and is reported once (D38)', { needs: [ 'scope.acquire', 'acquire.interrupt', 'interrupt.promise' ] }, async ({ make }) => {
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    const older = Promise.withResolvers<void>()
    const newer = Promise.withResolvers<void>()
    const failure = new Error('newer interrupt failed')
    const { lifecycle } = make({
      async onStart (scope) {
        await scope.acquire(() => 'older', () => {}, { interrupt: () => older.promise })
        await scope.acquire(() => 'newer', () => {}, { interrupt: () => newer.promise })
      },
    })
    await lifecycle.start()
    const stopped = observe(lifecycle.stop())
    await flush()
    // Interrupts run newest first, so the older one's join was registered last
    // and the unwind is joining it; the newer one's join is not reached yet.
    newer.reject(failure)
    await flush()
    // Unhandled rejections are reported at the next macrotask; no real time passes.
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(unhandled, [])
    assert.equal(stopped.status, 'pending')
    older.resolve()
    await flush()
    assert.equal(stopped.error, failure, 'reported once, as the stop\'s cleanup error')
    assert.equal(failedState(lifecycle.state).cleanupComplete, true)
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})
