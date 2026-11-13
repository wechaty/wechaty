/**
 * Deterministic concurrency, supersession, supervision, rollback, and
 * diagnostics acceptance tests for `LifecycleController`.
 *
 * Covers every reproduced `state-switch` defect in RFC #2905 §3.8 (Cases A–E)
 * as positive invariants using controllable deferred Promises (no wall-clock
 * sleeps for orchestration assertions).
 */
import assert from 'node:assert/strict'
import { channel } from 'node:diagnostics_channel'
import { test } from 'node:test'

import {
  LifecycleController,
  type LifecycleState,
} from './controller.ts'
import {
  LIFECYCLE_DIAGNOSTICS_CHANNEL,
  type LifecycleDiagnosticRecord,
} from './diagnostics.ts'
import {
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
} from './errors.ts'

interface DeferredVoid {
  readonly promise: Promise<void>
  readonly resolve: () => void
  readonly reject: (reason?: unknown) => void
}

function defer (): DeferredVoid {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, reject, resolve }
}

async function flushMicrotasks (turns = 6): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}

test('Case A: two start() calls queued behind an in-flight stop() invoke start hook once', async () => {
  const trace: string[] = []
  const startGates: DeferredVoid[] = []
  const stopGates: DeferredVoid[] = []

  const ctl = new LifecycleController({
    hooks: {
      start: async ({ generation }) => {
        trace.push(`start#${generation}>`)
        const gate = defer()
        startGates.push(gate)
        await gate.promise
        trace.push(`start#${generation}<`)
      },
      stop: async ({ generation }) => {
        trace.push(`stop#${generation}>`)
        const gate = defer()
        stopGates.push(gate)
        await gate.promise
        trace.push(`stop#${generation}<`)
      },
    },
    name: 'CaseA',
  })

  // Start generation 1.
  const p0 = ctl.start()
  assert.deepEqual(ctl.state, { generation: 1, kind: 'starting' })
  await flushMicrotasks()
  startGates[0]!.resolve()
  await p0
  assert.deepEqual(ctl.state, { generation: 1, kind: 'running' })

  // Begin stopping generation 1, then queue two concurrent start() calls.
  const pStop = ctl.stop()
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopping' })
  const p1 = ctl.start()
  const p2 = ctl.start()
  await flushMicrotasks()

  // Neither replacement start may enter while generation 1 is still retiring.
  assert.equal(startGates.length, 1)

  // Complete retirement of generation 1: `pStop` resolves immediately even as G=2 starts.
  stopGates[0]!.resolve()
  await pStop

  await flushMicrotasks()
  assert.equal(startGates.length, 2, 'should launch exactly one replacement generation')
  assert.deepEqual(ctl.state, { generation: 2, kind: 'starting' })

  startGates[1]!.resolve()
  await Promise.all([ p1, p2 ])
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })
  assert.deepEqual(trace, [
    'start#1>',
    'start#1<',
    'stop#1>',
    'stop#1<',
    'start#2>',
    'start#2<',
  ])
})

test('Case B & delayed watchdog trace: user stop() and stop()->start() always override supervisor recover()', async () => {
  const trace: string[] = []
  const startGates: DeferredVoid[] = []
  const stopGates: DeferredVoid[] = []

  const ctl = new LifecycleController({
    hooks: {
      start: async ({ generation, signal }) => {
        trace.push(`start#${generation}>`)
        const gate = defer()
        startGates.push(gate)
        signal.addEventListener('abort', () => gate.reject(signal.reason), { once: true })
        await gate.promise
        trace.push(`start#${generation}<`)
      },
      stop: async ({ generation }) => {
        trace.push(`stop#${generation}>`)
        const gate = defer()
        stopGates.push(gate)
        await gate.promise
        trace.push(`stop#${generation}<`)
      },
    },
    name: 'CaseB',
  })

  // 1. Watchdog initiates recovery while running(1), then user calls stop() mid-retirement.
  const pStart1 = ctl.start()
  await flushMicrotasks()
  startGates[0]!.resolve()
  await pStart1

  const watchdogToken1 = ctl.captureRecoveryToken()
  const pRecover1 = ctl.recover(watchdogToken1)
  await flushMicrotasks()
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopping' })

  // User explicitly stops while recovery is retiring generation 1.
  const pUserStop = ctl.stop()
  stopGates[0]!.resolve()
  const [ recoverResult1 ] = await Promise.all([ pRecover1, pUserStop ])

  assert.equal(recoverResult1, 'superseded')
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })
  assert.equal(startGates.length, 1, 'must not restart after user stop()')

  // 2. Delayed watchdog token captured before `stop -> start` remains invalid even when running again!
  const pStart2 = ctl.start()
  await flushMicrotasks()
  startGates[1]!.resolve()
  await pStart2
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })

  const staleRecoveryResult = await ctl.recover(watchdogToken1)
  assert.equal(staleRecoveryResult, 'superseded')
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })

  // 3. Even calling stop() when already stopped invalidates a captured token.
  const pStop2 = ctl.stop()
  await flushMicrotasks()
  stopGates[1]!.resolve()
  await pStop2
  const stoppedToken = ctl.captureRecoveryToken()
  await ctl.stop()
  assert.equal(await ctl.recover(stoppedToken), 'superseded')
})

test('Case C: stop() during uncooperative start() never publishes running after late start completion', async () => {
  const trace: string[] = []
  const uncooperativeStartGate = defer()

  const ctl = new LifecycleController({
    hooks: {
      start: async ({ generation }) => {
        trace.push(`start#${generation}>`)
        // Intentionally ignores signal to simulate an uncooperative legacy hook.
        await uncooperativeStartGate.promise
        trace.push(`start#${generation}<`)
      },
      stop: async ({ generation }) => {
        trace.push(`stop#${generation}`)
      },
    },
    name: 'CaseC',
  })

  const pStart = ctl.start()
  await flushMicrotasks()

  let stopSettled = false
  const pStop = ctl.stop().then(() => {
    stopSettled = true
  })

  await assert.rejects(pStart, LifecycleSupersededError)
  await flushMicrotasks()
  assert.equal(stopSettled, false, 'stop() must not resolve before in-flight start finishes')
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopping' })

  // Now the late start resolves: controller tears down and lands in `stopped`, never `running`.
  uncooperativeStartGate.resolve()
  await pStop
  assert.equal(stopSettled, true)
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })
  assert.deepEqual(trace, [ 'start#1>', 'start#1<', 'stop#1' ])
})

test('Case D & Invariant 13: failed start settles cleanly without error listeners or when observers throw, with no retry loop', async () => {
  let startCount = 0
  let shouldFail = true

  const ctl = new LifecycleController({
    hooks: {
      onStateChange: () => {
        throw new Error('observer threw synchronously')
      },
      start: async () => {
        startCount++
        if (shouldFail) {
          throw new Error('boom')
        }
      },
    },
    name: 'CaseD',
  })

  await assert.rejects(ctl.start(), /boom/)
  assert.equal(startCount, 1, 'must not implicitly retry failed start')
  assert.equal(ctl.state.kind, 'failed')
  if (ctl.state.kind === 'failed') {
    assert.equal(ctl.state.phase, 'start')
    assert.equal(ctl.state.cleanupComplete, true)
  }

  // Subsequent stop() transitions cleanly to stopped with zero hang.
  await ctl.stop()
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })

  // Instance remains healthy and recoverable on next explicit start().
  shouldFail = false
  await ctl.start()
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })
})

test('Case E & single-flight: failed concurrent starts reject all waiters while whenState observes failed and future generations', async () => {
  let attempt = 0
  const gate = defer()

  const ctl = new LifecycleController({
    hooks: {
      start: async () => {
        attempt++
        if (attempt === 1) {
          await gate.promise
        }
      },
    },
    name: 'CaseE',
  })

  const conditionFailed = ctl.whenState(s => s.kind === 'failed')
  const conditionRunningAcrossGens = ctl.whenState(s => s.kind === 'running')

  const p1 = ctl.start()
  const p2 = ctl.start()
  await flushMicrotasks()
  gate.reject(new Error('first run failed'))

  await assert.rejects(p1, /first run failed/)
  await assert.rejects(p2, /first run failed/)
  assert.equal(attempt, 1, 'concurrent starts share one attempt')

  const failedSnap = await conditionFailed
  assert.equal(failedSnap.kind, 'failed')

  // Later successful run satisfies cross-generation `whenState` without altering p1/p2.
  await ctl.start()
  const runningSnap = await conditionRunningAcrossGens
  assert.deepEqual(runningSnap, { generation: 2, kind: 'running' })
})

test('Per-caller AbortSignal cancels only that caller wait without aborting shared startup or mutating intent on pre-aborted signal', async () => {
  const startGate = defer()
  let startAbortedInternally = false

  const ctl = new LifecycleController({
    hooks: {
      start: async ({ signal }) => {
        signal.addEventListener('abort', () => {
          startAbortedInternally = true
        })
        await startGate.promise
      },
    },
  })

  // Pre-aborted signal rejects before accepting intent or incrementing revision.
  const preAborted = new AbortController()
  preAborted.abort(new Error('already aborted'))
  await assert.rejects(ctl.start({ signal: preAborted.signal }), /already aborted/)
  assert.equal(ctl.revision, 0)
  assert.deepEqual(ctl.state, { generation: 0, kind: 'stopped' })

  // Caller 1 aborts mid-wait while Caller 2 stays attached.
  const caller1Abort = new AbortController()
  const p1 = ctl.start({ signal: caller1Abort.signal })
  const p2 = ctl.start()
  await flushMicrotasks()

  caller1Abort.abort(new Error('caller 1 gave up'))
  await assert.rejects(p1, /caller 1 gave up/)
  assert.equal(startAbortedInternally, false, 'shared startup must not abort when one waiter cancels')

  startGate.resolve()
  await p2
  assert.deepEqual(ctl.state, { generation: 1, kind: 'running' })
})

test('Shutdown failure blocks unsafe overlapping start() and allows retry via stop() or restart()', async () => {
  let failStop = true

  const ctl = new LifecycleController({
    hooks: {
      start: async () => {},
      stop: async () => {
        if (failStop) {
          throw new Error('socket close failed')
        }
      },
    },
  })

  await ctl.start()
  await assert.rejects(ctl.stop(), /socket close failed/)

  assert.equal(ctl.state.kind, 'failed')
  if (ctl.state.kind === 'failed') {
    assert.equal(ctl.state.phase, 'stop')
    assert.equal(ctl.state.cleanupComplete, false)
  }

  // Unsafe overlapping start() is blocked immediately.
  await assert.rejects(ctl.start(), LifecycleUnsafeStateError)
  assert.equal(ctl.state.generation, 1)

  // Retrying restart() while stop still fails also rejects with LifecycleUnsafeStateError.
  await assert.rejects(ctl.restart(), LifecycleUnsafeStateError)

  // Once the underlying teardown issue clears, explicit stop() completes cleanup and unblocks start().
  failStop = false
  await ctl.stop()
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })

  await ctl.start()
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })
})

test('Startup timeout fails with LifecycleTimeoutError and blocks overlap until hung hook settles', async () => {
  const hungGate = defer()

  const ctl = new LifecycleController({
    hooks: {
      start: async () => {
        await hungGate.promise
      },
    },
    startTimeoutMs: 20,
  })

  await assert.rejects(ctl.start(), LifecycleTimeoutError)
  assert.equal(ctl.state.kind, 'failed')
  if (ctl.state.kind === 'failed') {
    assert.equal(ctl.state.phase, 'start')
    assert.equal(ctl.state.cleanupComplete, false)
  }

  // Because the original start hook is still hung, replacement is blocked.
  await assert.rejects(ctl.start(), LifecycleUnsafeStateError)

  // Once the hung start hook settles, explicit stop() verifies cleanup and restores recoverability.
  hungGate.resolve()
  await flushMicrotasks()
  await ctl.stop()
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })
})

test('Overlapping restart() calls coalesce and a later stop() supersedes pending restart()', async () => {
  const stopGate = defer()
  let startCount = 0

  const ctl = new LifecycleController({
    hooks: {
      start: async () => {
        startCount++
      },
      stop: async ({ generation }) => {
        if (generation === 1) {
          await stopGate.promise
        }
      },
    },
  })

  await ctl.start()
  assert.equal(startCount, 1)

  // Two overlapping restarts join one pending replacement; then stop() supersedes both.
  const r1 = ctl.restart()
  const r2 = ctl.restart()
  const pStop = ctl.stop()

  await assert.rejects(r1, LifecycleSupersededError)
  await assert.rejects(r2, LifecycleSupersededError)

  stopGate.resolve()
  await pStop
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })
  assert.equal(startCount, 1)
})

test('Reentrant onStateChange listener calling stop() on running commit preserves resolved start() and retires cleanly', async () => {
  const observed: LifecycleState['kind'][] = []
  let reentrantStopPromise: Promise<void> | undefined

  const ctl = new LifecycleController({
    hooks: {
      onStateChange: state => {
        observed.push(state.kind)
        if (state.kind === 'running' && state.generation === 1) {
          reentrantStopPromise = ctl.stop()
        }
      },
      start: async () => {},
      stop: async () => {},
    },
  })

  await ctl.start()
  assert.ok(reentrantStopPromise)
  await reentrantStopPromise
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })
  assert.deepEqual(observed, [ 'starting', 'running', 'stopping', 'stopped' ])
})

test('Runtime context.fail() unwinds resources to failed(phase=run) and fences stale generation calls', async () => {
  let failGen1!: (error: unknown) => void
  const disposed: number[] = []

  const ctl = new LifecycleController({
    hooks: {
      start: async ({ fail, generation, scope }) => {
        if (generation === 1) {
          failGen1 = fail
        }
        scope.onDispose(() => {
          disposed.push(generation)
        })
      },
    },
  })

  await ctl.start()
  const token = ctl.captureRecoveryToken()
  failGen1(new Error('child exited unexpectedly'))

  const failedState = await ctl.whenState(s => s.kind === 'failed')
  assert.equal(failedState.kind, 'failed')
  if (failedState.kind === 'failed') {
    assert.equal(failedState.phase, 'run')
    assert.equal(failedState.cleanupComplete, true)
  }
  assert.deepEqual(disposed, [ 1 ])

  // Supervisor recovers cleanly to generation 2.
  const outcome = await ctl.recover(token)
  assert.equal(outcome, 'recovered')
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })

  // Stale `failGen1` from generation 1 cannot affect generation 2!
  failGen1(new Error('late stale child exit'))
  await flushMicrotasks()
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })
})

test('Diagnostics channel publishes privacy-safe frozen records under Node.js and Deno', async () => {
  const records: LifecycleDiagnosticRecord[] = []
  const ch = channel(LIFECYCLE_DIAGNOSTICS_CHANNEL)
  const listener = (message: unknown) => {
    records.push(message as LifecycleDiagnosticRecord)
  }

  ch.subscribe(listener)
  try {
    const ctl = new LifecycleController({
      hooks: {
        start: async () => {
          throw new Error('SUPER_SECRET_CREDENTIAL_XYZ')
        },
      },
      name: 'DiagBot',
    })

    await assert.rejects(ctl.start(), /SUPER_SECRET_CREDENTIAL_XYZ/)
    await ctl.stop()
  } finally {
    ch.unsubscribe(listener)
  }

  assert.ok(records.length >= 3)
  assert.ok(records.every(r => Object.isFrozen(r)))
  assert.equal(JSON.stringify(records).includes('SUPER_SECRET_CREDENTIAL_XYZ'), false)
  assert.deepEqual(
    records.map(r => r.kind),
    [ 'starting', 'stopping', 'failed', 'stopped' ],
  )
})

test('Both startup and rollback failing preserves both errors and blocks unsafe restart', async () => {
  const startErr = new Error('primary start error')
  const rollbackErr = new Error('rollback disposer error')

  const ctl = new LifecycleController({
    hooks: {
      start: async ({ scope }) => {
        await scope.acquire({
          create: () => 'resource-A',
          dispose: () => {
            throw rollbackErr
          },
        })
        throw startErr
      },
    },
  })

  await assert.rejects(ctl.start(), (err: unknown) => err === startErr)
  assert.equal(ctl.state.kind, 'failed')
  if (ctl.state.kind === 'failed') {
    assert.equal(ctl.state.phase, 'start')
    assert.equal(ctl.state.error, startErr)
    assert.equal(ctl.state.cleanupError, rollbackErr)
    assert.equal(ctl.state.cleanupComplete, false)
  }

  await assert.rejects(ctl.start(), LifecycleUnsafeStateError)
})

test('stop() followed by start() during failed start or failed run rollback resolves stop() as soon as retirement completes', async () => {
  // 1. Failed start rollback joined by stop(), then start() queued before rollback finishes.
  const rollbackGate1 = defer()
  let attempt = 0

  const ctl1 = new LifecycleController({
    hooks: {
      start: async () => {
        attempt++
        if (attempt === 1) {
          throw new Error('gen1 start failed')
        }
      },
      stop: async ({ generation }) => {
        if (generation === 1) {
          await rollbackGate1.promise
        }
      },
    },
  })

  const pStart1 = ctl1.start()
  await ctl1.whenState(s => s.kind === 'stopping')
  assert.deepEqual(ctl1.state, { generation: 1, kind: 'stopping' })

  const pStop1 = ctl1.stop()
  const pStart2 = ctl1.start()

  rollbackGate1.resolve()
  await assert.rejects(pStart1, /gen1 start failed/)
  await pStop1
  await pStart2
  assert.deepEqual(ctl1.state, { generation: 2, kind: 'running' })

  // 2. Runtime context.fail() rollback joined by stop(), then start() queued before rollback finishes.
  const rollbackGate2 = defer()
  let failGen1!: (error: unknown) => void

  const ctl2 = new LifecycleController({
    hooks: {
      start: async ({ fail, generation }) => {
        if (generation === 1) {
          failGen1 = fail
        }
      },
      stop: async ({ generation }) => {
        if (generation === 1) {
          await rollbackGate2.promise
        }
      },
    },
  })

  await ctl2.start()
  failGen1(new Error('gen1 child crashed'))
  await flushMicrotasks()
  assert.deepEqual(ctl2.state, { generation: 1, kind: 'stopping' })

  const pStopDuringRunRollback = ctl2.stop()
  const pReplacementStart = ctl2.start()

  rollbackGate2.resolve()
  await pStopDuringRunRollback
  await pReplacementStart
  assert.deepEqual(ctl2.state, { generation: 2, kind: 'running' })
})

test('Timed-out stop hook remains tracked without overlapping duplicate calls until original invocation settles', async () => {
  const firstStopGate = defer()
  let stopHookInvocations = 0

  const ctl = new LifecycleController({
    hooks: {
      start: async () => {},
      stop: async () => {
        stopHookInvocations++
        if (stopHookInvocations === 1) {
          await firstStopGate.promise
        }
      },
    },
    stopTimeoutMs: 15,
  })

  await ctl.start()
  await assert.rejects(ctl.stop(), LifecycleTimeoutError)
  assert.equal(stopHookInvocations, 1)
  assert.equal(ctl.state.kind, 'failed')
  if (ctl.state.kind === 'failed') {
    assert.equal(ctl.state.phase, 'stop')
    assert.equal(ctl.state.cleanupComplete, false)
  }

  // Second stop() while first stop hook is STILL running joins the first invocation
  // instead of launching an overlapping second stop() that could falsely succeed!
  await assert.rejects(ctl.stop(), LifecycleTimeoutError)
  assert.equal(stopHookInvocations, 1, 'must not overlap a second hooks.stop while first is pending')
  await assert.rejects(ctl.start(), LifecycleUnsafeStateError)

  // Once the first stop hook settles cleanly, stop() completes retirement without a duplicate call.
  firstStopGate.resolve()
  await flushMicrotasks()
  await ctl.stop()
  assert.equal(stopHookInvocations, 1)
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })

  await ctl.start()
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })
})

test('stop() during starting interrupts scoped resources before joining startup while delaying dispose until startup exits', async () => {
  const trace: string[] = []
  const socketInterrupted = defer()
  const resourceAcquired = defer()

  const ctl = new LifecycleController({
    hooks: {
      start: async ({ scope }) => {
        const socket = await scope.acquire({
          create: () => {
            trace.push('socket:create')
            return {}
          },
          dispose: () => {
            trace.push('socket:dispose')
          },
          interrupt: () => {
            trace.push('socket:interrupt')
            socketInterrupted.resolve()
          },
        })
        void socket
        resourceAcquired.resolve()
        trace.push('start:awaiting-io')
        // Unblocks ONLY when `socket:interrupt` runs — ignores AbortSignal!
        await socketInterrupted.promise
        trace.push('start:io-unblocked')
      },
    },
  })

  const pStart = ctl.start()
  await resourceAcquired.promise
  await flushMicrotasks()

  const pStop = ctl.stop()
  await assert.rejects(pStart, LifecycleSupersededError)
  await pStop

  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })
  assert.deepEqual(trace, [
    'socket:create',
    'start:awaiting-io',
    'socket:interrupt',
    'start:io-unblocked',
    'socket:dispose',
  ])
})

test('Reentrant stop() inside onStateChange upon observing starting retires cleanly when hooks.start was never invoked', async () => {
  let startInvocations = 0
  let stopInvocations = 0
  let reentrantStopPromise: Promise<void> | undefined

  const ctl = new LifecycleController({
    hooks: {
      onStateChange: state => {
        if (state.kind === 'starting' && state.generation === 1) {
          reentrantStopPromise = ctl.stop()
        }
      },
      start: async () => {
        startInvocations++
      },
      stop: async () => {
        stopInvocations++
      },
    },
  })

  await assert.rejects(ctl.start(), LifecycleSupersededError)
  assert.ok(reentrantStopPromise)
  await reentrantStopPromise

  assert.equal(startInvocations, 0, 'hooks.start should never run when superseded on starting commit')
  assert.equal(stopInvocations, 0, 'hooks.stop should not run when hooks.start was never invoked')
  assert.deepEqual(ctl.state, { generation: 1, kind: 'stopped' })

  // Generation 2 starts and runs normally afterward.
  await ctl.start()
  assert.equal(startInvocations, 1)
  assert.deepEqual(ctl.state, { generation: 2, kind: 'running' })
})


