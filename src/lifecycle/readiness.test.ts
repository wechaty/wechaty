/**
 * Deterministic unit tests for `ReadinessGate` generation isolation, pre-start
 * waiting, failure/stop rejection, logout/scan invalidation, and caller abort.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LifecycleController } from './controller.ts'
import { LifecycleSupersededError } from './errors.ts'
import { ReadinessGate } from './readiness.ts'

function defer<T = void> () {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, reject, resolve }
}

test('ReadinessGate supports pre-start whenReady(), isolates generations across restarts, and ignores stale signals', async () => {
  let readiness!: ReadinessGate
  const ctl = new LifecycleController({
    hooks: {
      onStateChange: state => readiness.handleStateChange(state),
      start: async () => {},
      stop: async () => {},
    },
  })
  readiness = new ReadinessGate(ctl)

  // Pre-start wait binds to generation 1.
  let readyGen1Resolved = false
  const pReady1 = readiness.whenReady().then(() => {
    readyGen1Resolved = true
  })

  await ctl.start()
  assert.equal(readiness.isReady, false)
  assert.equal(readyGen1Resolved, false)

  readiness.markReady(1)
  await pReady1
  assert.equal(readiness.isReady, true)
  // Immediate resolve while already ready in generation 1.
  await readiness.whenReady()

  // Restart into generation 2: generation 1 readiness must NOT leak!
  await ctl.stop()
  assert.equal(readiness.isReady, false)
  await ctl.start()
  assert.equal(ctl.state.generation, 2)
  assert.equal(readiness.isReady, false)

  // Stale `markReady(1)` must be ignored in generation 2.
  readiness.markReady(1)
  assert.equal(readiness.isReady, false)

  const pReady2 = readiness.whenReady()
  readiness.markReady(2)
  await pReady2
  assert.equal(readiness.isReady, true)

  // `markUnready(2)` (e.g. logout/scan) clears `isReady` until re-authenticated.
  readiness.markUnready(2)
  assert.equal(readiness.isReady, false)
})

test('ReadinessGate rejects pending waiters on startup failure, stop(), pre-start stop(), or caller abort', async () => {
  let shouldFailStart = true
  const startGate = defer()
  let readiness!: ReadinessGate

  const ctl = new LifecycleController({
    hooks: {
      onStateChange: state => readiness.handleStateChange(state),
      start: async () => {
        if (shouldFailStart) {
          throw new Error('auth bootstrap failed')
        }
        await startGate.promise
      },
    },
  })
  readiness = new ReadinessGate(ctl)

  // 1. Rejects when startup fails instead of hanging indefinitely (Case E).
  const pFailReady = readiness.whenReady()
  await assert.rejects(ctl.start(), /auth bootstrap failed/)
  await assert.rejects(pFailReady, /auth bootstrap failed/)
  await assert.rejects(readiness.whenReady(), /auth bootstrap failed/)

  // Reset to clean stopped state, then test pre-start stop cancellation.
  await ctl.stop()
  const pPreStartCancelled = readiness.whenReady()
  readiness.cancelPendingPreStartWaiters()
  await assert.rejects(pPreStartCancelled, LifecycleSupersededError)

  // 2. Caller AbortSignal cancels only that caller's readiness wait.
  shouldFailStart = false
  const pStart2 = ctl.start()
  const abortCtl = new AbortController()
  const pAbortedWait = readiness.whenReady({ signal: abortCtl.signal })
  const pStoppedWait = readiness.whenReady()

  abortCtl.abort(new Error('caller cancelled ready wait'))
  await assert.rejects(pAbortedWait, /caller cancelled ready wait/)

  // 3. Stopping before ready rejects remaining waiter with LifecycleSupersededError.
  startGate.resolve()
  await pStart2
  await ctl.stop()
  await assert.rejects(pStoppedWait, LifecycleSupersededError)
})

test('ReadinessGate rejects whenReady() during unreplaced stop() and handles restart() supersession or stop failure', async () => {
  const stopGate = defer()
  let failStop = false
  let readiness!: ReadinessGate

  const ctl = new LifecycleController({
    hooks: {
      onStateChange: state => readiness.handleStateChange(state),
      start: async () => {},
      stop: async () => {
        await stopGate.promise
        if (failStop) {
          throw new Error('teardown jammed')
        }
      },
    },
  })
  readiness = new ReadinessGate(ctl)

  // 1. Calling whenReady() during an unreplaced stop() rejects immediately!
  await ctl.start()
  const pStop1 = ctl.stop()
  assert.equal(ctl.state.kind, 'stopping')
  await assert.rejects(readiness.whenReady(), LifecycleSupersededError)
  stopGate.resolve()
  await pStop1

  // 2. Calling whenReady() during restart() binds to G+1, and rejects if stop() later cancels the restart!
  const stopGate2 = defer()
  let readiness2!: ReadinessGate
  const ctl2 = new LifecycleController({
    hooks: {
      onStateChange: state => readiness2.handleStateChange(state),
      start: async () => {},
      stop: async () => {
        await stopGate2.promise
      },
    },
  })
  readiness2 = new ReadinessGate(ctl2)

  await ctl2.start()
  const pRestart = ctl2.restart()
  const pReadyDuringRestart = readiness2.whenReady()
  const pCancellingStop = ctl2.stop()

  await assert.rejects(pRestart, LifecycleSupersededError)
  stopGate2.resolve()
  await pCancellingStop
  await assert.rejects(pReadyDuringRestart, LifecycleSupersededError)

  // 3. Calling whenReady() during restart() also rejects if G's retirement fails!
  const stopGate3 = defer()
  let readiness3!: ReadinessGate
  const ctl3 = new LifecycleController({
    hooks: {
      onStateChange: state => readiness3.handleStateChange(state),
      start: async () => {},
      stop: async () => {
        await stopGate3.promise
        throw new Error('stop hook exploded')
      },
    },
  })
  readiness3 = new ReadinessGate(ctl3)

  await ctl3.start()
  const pFailedRestart = ctl3.restart()
  const pReadyOnFailedRestart = readiness3.whenReady()
  stopGate3.resolve()

  await assert.rejects(pFailedRestart, /unproven resource cleanup/)
  await assert.rejects(pReadyOnFailedRestart, /stop hook exploded/)
})

