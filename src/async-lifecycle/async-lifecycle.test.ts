/**
 * Cross-runtime behavioral tests for lifecycle state reconciliation and generation-owned
 * resources; these tests keep the portable lifecycle kernel exercised under Node.js and Deno.
 */

import assert from 'node:assert/strict'
import diagnosticsChannel from 'node:diagnostics_channel'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import {
  AsyncLifecycle,
  createManualClock,
  createWatchdog,
  createLifecycle,
  LifecycleOverrideError,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
  LIFECYCLE_DIAGNOSTICS_CHANNEL,
} from './mod.ts'
import {
  getAbortReason,
  isCooperativeAbortError,
  settleBeforeDeadline,
  throwIfAborted,
  waitWithCallerSignal,
} from './cancellable-wait.ts'
import { ConditionRegistry } from './conditions.ts'
import {
  assertValidTimeoutMs,
  createDeadlineController,
} from './clock.ts'
import { collapseCleanupErrors } from './errors.ts'
import type {
  LifecycleCondition,
  LifecycleHooks,
  Lifecycle,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
  LifecycleStopContext,
} from './types.ts'

function deferred<T> (): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function flushMicrotasks (): Promise<void> {
  for (let index = 0; index < 12; index++) {
    await Promise.resolve()
  }
}

test('manual clock orders due timers, handles reentrant timers, and clears deadlines', () => {
  const clock = createManualClock(10)
  const calls: string[] = []
  const later = clock.setTimeout(() => calls.push('later'), 5)
  clock.setTimeout(() => {
    calls.push('first')
    clock.setTimeout(() => calls.push('nested'), 0)
  }, 2)

  clock.advanceBy(2)
  assert.deepEqual(calls, [ 'first', 'nested' ])
  assert.equal(clock.currentTimeMs, 12)
  clock.clearTimeout(later)
  clock.advanceBy(10)
  assert.deepEqual(calls, [ 'first', 'nested' ])
  assert.equal(clock.pendingTimers, 0)
  assert.throws(() => clock.advanceBy(-1), RangeError)

  assert.doesNotThrow(() => assertValidTimeoutMs(undefined, 'timeout'))
  for (const invalid of [ 0, -1, Number.NaN, Number.POSITIVE_INFINITY ]) {
    assert.throws(() => assertValidTimeoutMs(invalid, 'timeout'), RangeError)
  }

  const deadline = createDeadlineController(clock, 5, () => new Error('deadline'))
  clock.advanceBy(4)
  assert.equal(deadline.didTimeout(), false)
  assert.equal(deadline.signal.aborted, false)
  deadline.dispose()
  deadline.dispose()
  assert.equal(clock.pendingTimers, 0)
})

test('abort helpers preserve caller isolation and report deadline outcomes', async () => {
  const alreadyAborted = new AbortController()
  const reason = new Error('cancelled')
  alreadyAborted.abort(reason)
  assert.equal(getAbortReason(alreadyAborted.signal), reason)
  assert.throws(() => throwIfAborted(alreadyAborted.signal), error => error === reason)
  assert.equal(isCooperativeAbortError(reason, alreadyAborted.signal), true)
  assert.equal(isCooperativeAbortError(new Error('other'), alreadyAborted.signal), false)

  const operation = deferred<string>()
  const caller = new AbortController()
  const callerWait = waitWithCallerSignal(operation.promise, caller.signal)
  caller.abort(reason)
  await assert.rejects(callerWait, error => error === reason)
  operation.resolve('still running')
  assert.equal(await operation.promise, 'still running')
  assert.equal(await waitWithCallerSignal(Promise.resolve('value'), undefined), 'value')

  const deadline = new AbortController()
  const racing = settleBeforeDeadline(Promise.resolve(42), deadline.signal)
  assert.deepEqual(await racing, { timedOut: false, status: 'fulfilled', value: 42 })
  deadline.abort(reason)
  assert.deepEqual(await settleBeforeDeadline(Promise.reject(reason), deadline.signal), {
    timedOut: true,
    timeoutReason: reason,
  })

  const missingReason = getAbortReason({ reason: undefined } as AbortSignal)
  assert.ok(missingReason instanceof DOMException)
  assert.equal(missingReason.name, 'AbortError')

  const alreadyCancelled = new AbortController()
  alreadyCancelled.abort(reason)
  let abortCallbackCalls = 0
  await assert.rejects(
    waitWithCallerSignal(Promise.resolve('unused'), alreadyCancelled.signal, () => abortCallbackCalls++),
    error => error === reason,
  )
  assert.equal(abortCallbackCalls, 1)

  const timedOutOperation = deferred<string>()
  const timedOutSignal = new AbortController()
  const timedOutWait = settleBeforeDeadline(timedOutOperation.promise, timedOutSignal.signal)
  timedOutSignal.abort(reason)
  assert.deepEqual(await timedOutWait, { timedOut: true, timeoutReason: reason })
  timedOutOperation.resolve('late')
  await flushMicrotasks()
})

test('condition registry isolates generations and rejects foreign conditions', async () => {
  const registry = new ConditionRegistry()
  const ready = registry.condition('ready')
  assert.equal(registry.condition('ready'), ready)
  assert.equal(ready.name, 'ready')
  assert.throws(() => registry.condition('  '), TypeError)

  const waitingBeforeStart = ready.wait()
  registry.beginGeneration(1)
  registry.setForGeneration(0, ready)
  assert.equal(ready.isSet, false)
  registry.setForGeneration(1, ready)
  await waitingBeforeStart
  assert.equal(ready.isSet, true)
  await ready.wait()
  registry.clearForGeneration(1, ready)
  assert.equal(ready.isSet, false)
  registry.clearForGeneration(2, ready)
  registry.endGeneration(2, new Error('stale end'))

  const nextWait = ready.wait()
  const retirementError = new LifecycleSupersededError('retired')
  registry.endGeneration(1, retirementError)
  await assert.rejects(nextWait, caught => caught === retirementError)
  registry.setForGeneration(1, ready)
  assert.equal(ready.isSet, false)

  const other = new ConditionRegistry().condition('ready')
  assert.throws(() => registry.setForGeneration(2, other), TypeError)
  const abortedWait = new AbortController()
  abortedWait.abort(new Error('wait cancelled'))
  await assert.rejects(ready.wait({ signal: abortedWait.signal }), /wait cancelled/)
  const preStart = ready.wait()
  registry.rejectPreStartWaiters()
  await assert.rejects(preStart, LifecycleSupersededError)
})

test('createLifecycle serializes start, stop, restart, conditions, and observers', async () => {
  let conditionReady!: LifecycleCondition
  const events: string[] = []
  const states: string[] = []
  const lifecycle = createLifecycle({
    onStart (scope) {
      events.push(`start:${scope.generation}`)
      scope.defer(() => {
        events.push(`release:${scope.generation}`)
      })
      scope.set(conditionReady)
    },
    onStop (stop) {
      events.push(`stop:${stop.generation}:${stop.reason}:${stop.signal.aborted}`)
    },
    onStateChange (state) {
      states.push(state.kind)
      if (state.kind === 'running') {
        throw new Error('isolated observer error')
      }
    },
  })
  conditionReady = lifecycle.condition('ready')
  const readyWait = conditionReady.wait()
  const runningWait = lifecycle.whenState(state => state.kind === 'running')

  await lifecycle.start()
  await readyWait
  assert.equal((await runningWait).kind, 'running')
  assert.equal(Object.isFrozen(lifecycle.state), true)
  await lifecycle.start()
  assert.equal(lifecycle.state.generation, 1)

  await lifecycle.restart()
  assert.equal(lifecycle.state.kind, 'running')
  assert.equal(lifecycle.state.generation, 2)
  await lifecycle.stop()
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.deepEqual(events, [
    'start:1',
    'stop:1:restart:false',
    'release:1',
    'start:2',
    'stop:2:stop:false',
    'release:2',
  ])
  assert.deepEqual(states, [
    'starting', 'running', 'stopping', 'starting', 'running', 'stopping', 'stopped',
  ])
  await lifecycle[Symbol.asyncDispose]()
})

test('start-stop-start retires an interrupted startup before creating a fresh scope', async () => {
  const starts: ReturnType<typeof deferred<void>>[] = []
  const signals: AbortSignal[] = []
  const lifecycle = createLifecycle({
    onStart (scope) {
      signals.push(scope.signal)
      const gate = deferred<void>()
      starts.push(gate)
      return gate.promise
    },
  })

  const firstStart = lifecycle.start()
  await flushMicrotasks()
  const stop = lifecycle.stop()
  const replacementStart = lifecycle.start()
  await flushMicrotasks()
  assert.equal(starts.length, 1)

  starts[0]!.resolve()
  await assert.rejects(firstStart, LifecycleSupersededError)
  await stop
  await flushMicrotasks()
  assert.equal(starts.length, 2)
  assert.equal(signals[0]?.aborted, true)
  assert.equal(signals[1]?.aborted, false)

  starts[1]!.resolve()
  await replacementStart
  assert.equal(lifecycle.state.kind, 'running')
  assert.equal(lifecycle.state.generation, 2)
  await lifecycle.stop()
})

test('stop-start while running preserves the retirement barrier and both attempts', async () => {
  const retirement = deferred<void>()
  const starts: ReturnType<typeof deferred<void>>[] = []
  let stopCalls = 0
  const lifecycle = createLifecycle({
    onStart () {
      const gate = deferred<void>()
      starts.push(gate)
      return gate.promise
    },
    onStop () {
      stopCalls++
      return stopCalls === 1 ? retirement.promise : undefined
    },
  })

  const firstStart = lifecycle.start()
  await flushMicrotasks()
  starts[0]!.resolve()
  await firstStart

  const stop = lifecycle.stop()
  const replacementStart = lifecycle.start()
  await flushMicrotasks()
  assert.equal(lifecycle.state.kind, 'stopping')
  assert.equal(starts.length, 1)

  retirement.resolve()
  await stop
  await flushMicrotasks()
  assert.equal(starts.length, 2)
  starts[1]!.resolve()
  await replacementStart
  assert.equal(lifecycle.state.generation, 2)
  await lifecycle.stop()
})

test('restart during incomplete startup settles the old attempt and starts one replacement', async () => {
  const starts: ReturnType<typeof deferred<void>>[] = []
  const lifecycle = createLifecycle({
    onStart () {
      const gate = deferred<void>()
      starts.push(gate)
      return gate.promise
    },
  })

  const firstStart = lifecycle.start()
  await flushMicrotasks()
  const restart = lifecycle.restart()
  await flushMicrotasks()
  starts[0]!.resolve()
  await assert.rejects(firstStart, LifecycleSupersededError)
  await flushMicrotasks()
  assert.equal(starts.length, 2)
  starts[1]!.resolve()
  await restart
  assert.equal(lifecycle.state.kind, 'running')
  assert.equal(lifecycle.state.generation, 2)
  await lifecycle.stop()
})

test('every accepted stop invalidates pre-start conditions during retirement', async () => {
  const retirement = deferred<void>()
  const lifecycle = createLifecycle({
    onStart () {},
    onStop: () => retirement.promise,
  })
  const ready = lifecycle.condition('ready')
  await lifecycle.start()

  const firstStop = lifecycle.stop()
  await flushMicrotasks()
  const waiting = ready.wait()
  const secondStop = lifecycle.stop()
  await assert.rejects(waiting, LifecycleSupersededError)
  retirement.resolve()
  await Promise.all([ firstStop, secondStop ])
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('timed-out interrupts resume in LIFO order without skipping or duplicating work', async () => {
  const clock = createManualClock()
  const blockedInterrupt = deferred<void>()
  const interrupts: string[] = []
  const releases: string[] = []
  const lifecycle = createLifecycle({
    async onStart (scope) {
      await scope.acquire(
        () => 'first',
        resource => {
          releases.push(resource)
        },
        { interrupt: () => {
          interrupts.push('first')
        } },
      )
      await scope.acquire(
        () => 'second',
        resource => {
          releases.push(resource)
        },
        { interrupt: () => {
          interrupts.push('second')
          return blockedInterrupt.promise
        } },
      )
    },
  }, { stopTimeoutMs: 5, clock })

  await lifecycle.start()
  const firstStop = lifecycle.stop()
  await flushMicrotasks()
  clock.advanceBy(5)
  await flushMicrotasks()
  await assert.rejects(firstStop, LifecycleTimeoutError)
  assert.deepEqual(interrupts, [ 'second' ])
  assert.deepEqual(releases, [])

  blockedInterrupt.resolve()
  await flushMicrotasks()
  await lifecycle.stop()
  assert.deepEqual(interrupts, [ 'second', 'first' ])
  assert.deepEqual(releases, [ 'second', 'first' ])
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('late acquisition remains owned through its one interrupt and release', async () => {
  const acquisition = deferred<string>()
  const interrupt = deferred<void>()
  const gracefulStop = deferred<void>()
  const interruptError = new Error('late interrupt failed')
  let interruptCalls = 0
  let releaseCalls = 0
  let acquirePromise!: Promise<string>
  const lifecycle = createLifecycle({
    onStart (scope) {
      acquirePromise = scope.acquire(
        () => acquisition.promise,
        () => {
          releaseCalls++
        },
        { interrupt: () => {
          interruptCalls++
          return interrupt.promise
        } },
      )
      void acquirePromise.catch(() => {})
    },
    onStop: () => gracefulStop.promise,
  })

  await lifecycle.start()
  let stopSettled = false
  const stop = lifecycle.stop()
  void stop.then(() => {
    stopSettled = true
  }, () => {
    stopSettled = true
  })
  await flushMicrotasks()
  acquisition.resolve('late resource')
  await flushMicrotasks()
  assert.equal(interruptCalls, 1)

  gracefulStop.resolve()
  await flushMicrotasks()
  assert.equal(stopSettled, false)
  interrupt.reject(interruptError)
  await assert.rejects(acquirePromise, LifecycleSupersededError)
  await assert.rejects(stop, error => error === interruptError)
  assert.equal(interruptCalls, 1)
  assert.equal(releaseCalls, 1)
  assert.equal(lifecycle.state.kind, 'failed')
})

test('a late onStop rejection is retained and reported across retry timing', async () => {
  for (const retryBeforeReject of [ false, true ]) {
    const clock = createManualClock()
    const stopHook = deferred<void>()
    const hookError = new Error('late stop-hook rejection')
    let stopCalls = 0
    const lifecycle = createLifecycle({
      onStart () {},
      onStop () {
        stopCalls++
        return stopHook.promise
      },
    }, { stopTimeoutMs: 5, clock })

    await lifecycle.start()
    const firstStop = lifecycle.stop()
    await flushMicrotasks()
    clock.advanceBy(5)
    await flushMicrotasks()
    await assert.rejects(firstStop, LifecycleTimeoutError)

    let retry: Promise<void> | undefined
    if (retryBeforeReject) {
      retry = lifecycle.stop()
      await flushMicrotasks()
    }
    stopHook.reject(hookError)
    await flushMicrotasks()
    await assert.rejects(retry ?? lifecycle.stop(), error => error === hookError)
    assert.equal(stopCalls, 1)
    assert.equal(lifecycle.state.kind, 'failed')
    if (lifecycle.state.kind === 'failed') {
      assert.equal(lifecycle.state.cleanupComplete, true)
      assert.equal(lifecycle.state.error, hookError)
    }
  }
})

test('sync throws and async disposer rejections remain retryable cleanup debt', async () => {
  for (const mode of [ 'sync', 'async' ] as const) {
    let releaseCalls = 0
    const cleanupError = new Error(`${mode} disposer failed`)
    const lifecycle = createLifecycle({
      onStart (scope) {
        scope.defer(() => {
          releaseCalls++
          if (releaseCalls !== 1) {
            return
          }
          if (mode === 'sync') {
            throw cleanupError
          }
          return Promise.reject(cleanupError)
        })
      },
    })

    await lifecycle.start()
    await assert.rejects(lifecycle.stop(), error => error === cleanupError)
    const dirty = lifecycle.state
    assert.equal(dirty.kind, 'failed')
    if (dirty.kind !== 'failed') {
      assert.fail('expected a failed state')
    }
    assert.equal(dirty.cleanupComplete, false)
    await lifecycle.stop()
    assert.equal(releaseCalls, 2)
    assert.equal(lifecycle.state.kind, 'stopped')
  }
})

test('a stop joining a dirty cleanup retry does not schedule an extra disposal pass', async () => {
  const releaseRetry = deferred<void>()
  let releaseCalls = 0
  const lifecycle = createLifecycle({
    onStart (scope) {
      scope.defer(() => {
        releaseCalls++
        if (releaseCalls === 1) {
          throw new Error('first release failed')
        }
        return releaseRetry.promise
      })
    },
  })

  await lifecycle.start()
  await assert.rejects(lifecycle.stop(), /first release failed/)
  const retry = lifecycle.stop()
  await flushMicrotasks()
  assert.equal(releaseCalls, 2)

  const joinedRetry = lifecycle.stop()
  releaseRetry.resolve()
  await Promise.all([ retry, joinedRetry ])
  await flushMicrotasks()
  assert.equal(releaseCalls, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('late cleanup debt stays attached to an old generation after replacement starts', async () => {
  let oldScope!: LifecycleScope
  let releaseCalls = 0
  const lifecycle = createLifecycle({
    onStart (scope) {
      if (scope.generation === 1) {
        oldScope = scope
      }
    },
  })

  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => oldScope.defer(() => {}), LifecycleSupersededError)
  await flushMicrotasks()
  await lifecycle.start()

  const cleanupError = new Error('late old-generation cleanup failed')
  assert.throws(() => oldScope.defer(() => {
    releaseCalls++
    if (releaseCalls === 1) {
      throw cleanupError
    }
  }), LifecycleSupersededError)
  await flushMicrotasks()
  await assert.rejects(lifecycle.start(), LifecycleUnsafeStateError)
  await assert.rejects(lifecycle.stop(), error => error === cleanupError)
  await lifecycle.stop()
  assert.equal(releaseCalls, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('a child remains exclusively owned until its first parent releases it', async () => {
  const parentStop = deferred<void>()
  const child = createLifecycle({ onStart () {} })
  const parentA = createLifecycle({
    onStart: async scope => {
      await scope.start(child)
    },
    onStop: () => parentStop.promise,
  })
  const parentB = createLifecycle({
    onStart: async scope => {
      await scope.start(child)
    },
  })

  await parentA.start()
  const stopA = parentA.stop()
  await flushMicrotasks()
  await child.stop()
  await assert.rejects(parentB.start(), LifecycleUnsafeStateError)

  parentStop.resolve()
  await stopA
  await parentB.start()
  assert.equal(child.state.kind, 'running')
  await parentB.stop()
})

test('composition and inheritance preserve reentrant observer attempt outcomes', async () => {
  for (const entryPoint of [ 'composition', 'inheritance' ] as const) {
    const events: string[] = []
    let lifecycle!: Lifecycle
    let reentrantStop: Promise<void> | undefined
    const hooks: LifecycleHooks = {
      onStart: () => {
        events.push('start')
      },
      onStop: () => {
        events.push('stop')
      },
      onStateChange: state => {
        if (state.kind === 'running' && reentrantStop === undefined) {
          reentrantStop = lifecycle.stop()
        }
      },
    }

    if (entryPoint === 'composition') {
      lifecycle = createLifecycle(hooks)
    } else {
      class InheritedService extends AsyncLifecycle {
        constructor () {
          super()
        }

        protected override onStart (scope: LifecycleScope): void {
          hooks.onStart(scope)
        }

        protected override onStop = (stop: LifecycleStopContext): void | Promise<void> => {
          return hooks.onStop?.(stop)
        }

        protected override onStateChange = (
          state: LifecycleState,
          previous: LifecycleState,
        ): void => {
          hooks.onStateChange?.(state, previous)
        }
      }
      lifecycle = new InheritedService()
    }

    await lifecycle.start()
    await reentrantStop
    assert.deepEqual(events, [ 'start', 'stop' ])
    assert.equal(lifecycle.state.kind, 'stopped')
  }
})

test('the #2905 A–F contract traces pass through both lifecycle entry points', async () => {
  const createHarness = (
    entryPoint: 'composition' | 'inheritance',
    hooks: LifecycleHooks,
    options?: LifecycleOptions,
  ): {
    readonly lifecycle: Lifecycle
    condition (name: string): LifecycleCondition
  } => {
    if (entryPoint === 'composition') {
      const lifecycle = createLifecycle(hooks, options)
      return { lifecycle, condition: name => lifecycle.condition(name) }
    }

    class InheritedService extends AsyncLifecycle {
      #hooks: LifecycleHooks

      constructor () {
        super(options)
        this.#hooks = hooks
      }

      getCondition (name: string): LifecycleCondition {
        return this.condition(name)
      }

      protected override onStart (scope: LifecycleScope): Promise<void> | void {
        return this.#hooks.onStart(scope)
      }

      protected override onStop = (stop: LifecycleStopContext): Promise<void> | void => {
        return this.#hooks.onStop?.(stop)
      }

      protected override onStateChange = (
        state: LifecycleState,
        previous: LifecycleState,
      ): void => {
        this.#hooks.onStateChange?.(state, previous)
      }
    }

    const lifecycle = new InheritedService()
    return {
      lifecycle,
      condition: name => lifecycle.getCondition(name),
    }
  }

  for (const entryPoint of [ 'composition', 'inheritance' ] as const) {
    {
      let scope!: LifecycleScope
      const taskFinished = deferred<void>()
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
      })
      await lifecycle.start()
      scope.spawn(async () => {
        await scope.recover()
        taskFinished.resolve()
      })
      const restart = lifecycle.restart()
      assert.equal(await scope.recover(), 'superseded')
      await restart
      await taskFinished.promise
      assert.equal(lifecycle.state.kind, 'running')
      assert.equal(lifecycle.state.generation, 2)
      await lifecycle.stop()
    }

    {
      const clock = createManualClock()
      let scope!: LifecycleScope
      const taskGate = deferred<void>()
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
      }, { clock, stopTimeoutMs: 5 })
      await lifecycle.start()
      const requesterScope = scope
      requesterScope.spawn(async () => {
        await taskGate.promise
        await requesterScope.recover()
      })
      const recovery = scope.recover()
      await flushMicrotasks()
      taskGate.resolve()
      const earlyOutcome = await Promise.race([
        recovery.then(outcome => ({ outcome })),
        flushMicrotasks().then(() => ({ pending: true })),
      ])
      assert.equal('pending' in earlyOutcome, false)
      const recoveryOutcome = await recovery
      assert.equal(recoveryOutcome, 'recovered', JSON.stringify({
        earlyOutcome,
        state: lifecycle.state,
      }))
      assert.equal(lifecycle.state.kind, 'running')
      assert.equal(lifecycle.state.generation, 2)
      await lifecycle.stop()
    }

    {
      let scope!: LifecycleScope
      const finishGracefulStop = deferred<void>()
      const requesterError = new Error(`${entryPoint} recovery requester failed`)
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
        onStop: () => finishGracefulStop.promise,
      })
      await lifecycle.start()
      scope.spawn(async () => {
        void scope.recover()
        throw requesterError
      })
      const recovery = scope.recover()
      await flushMicrotasks()
      finishGracefulStop.resolve()
      assert.equal(await recovery, 'failed')
      const failedState = lifecycle.state
      assert.equal(failedState.kind, 'failed')
      if (failedState.kind === 'failed') {
        assert.equal(failedState.error, requesterError)
        assert.equal(failedState.cleanupComplete, true)
      }
    }

    {
      const reportedFailure = new Error(`${entryPoint} failure after startup interruption`)
      let scope!: LifecycleScope
      const { lifecycle } = createHarness(entryPoint, {
        async onStart (currentScope) {
          scope = currentScope
          await new Promise<void>(resolve => {
            currentScope.signal.addEventListener('abort', () => resolve(), { once: true })
          })
          scope.fail(reportedFailure)
        },
      })
      const start = lifecycle.start()
      await flushMicrotasks()
      const stop = lifecycle.stop()
      await assert.rejects(start, LifecycleSupersededError)
      await assert.rejects(stop, error => error === reportedFailure)
      const failedState = lifecycle.state
      assert.equal(failedState.kind, 'failed')
      if (failedState.kind === 'failed') {
        assert.equal(failedState.phase, 'run')
        assert.equal(failedState.error, reportedFailure)
      }
    }

    for (const cleanupFailure of [ undefined, null ]) {
      const { lifecycle } = createHarness(entryPoint, {
        async onStart (scope) {
          scope.defer(() => {
            throw cleanupFailure
          })
          await new Promise<void>(resolve => {
            scope.signal.addEventListener('abort', () => resolve(), { once: true })
          })
        },
      })
      const start = lifecycle.start()
      await flushMicrotasks()
      const stop = lifecycle.stop()
      await assert.rejects(start, LifecycleSupersededError)
      await assert.rejects(stop, error => Object.is(error, cleanupFailure))
      const failedState = lifecycle.state
      assert.equal(failedState.kind, 'failed')
      if (failedState.kind === 'failed') {
        assert.equal(failedState.error, cleanupFailure)
        assert.equal(failedState.cleanupComplete, false)
      }
    }

    {
      const acquisition = deferred<string>()
      const acquisitionEntered = deferred<void>()
      const taskGate = deferred<void>()
      const interruptGate = deferred<void>()
      const interruptEntered = deferred<void>()
      const interruptError = new Error(`${entryPoint} late acquisition interrupt failed`)
      let releaseCalls = 0
      const { lifecycle } = createHarness(entryPoint, {
        onStart (scope) {
          void scope.acquire(
            () => {
              acquisitionEntered.resolve()
              return acquisition.promise
            },
            () => {
              releaseCalls++
            },
            { interrupt: () => {
              interruptEntered.resolve()
              return interruptGate.promise
            } },
          ).catch(() => {})
          scope.spawn(async () => taskGate.promise)
        },
      })

      await lifecycle.start()
      await acquisitionEntered.promise
      const stop = lifecycle.stop()
      await flushMicrotasks()
      acquisition.resolve('late resource')
      await interruptEntered.promise
      interruptGate.reject(interruptError)
      await flushMicrotasks()
      assert.equal(releaseCalls, 1)
      taskGate.resolve()
      await assert.rejects(stop, error => error === interruptError)
      const failedState = lifecycle.state
      assert.equal(failedState.kind, 'failed')
      if (failedState.kind === 'failed') {
        assert.equal(failedState.error, interruptError)
        assert.equal(failedState.cleanupComplete, true)
      }
    }

    {
      const starts: ReturnType<typeof deferred<void>>[] = []
      const signals: AbortSignal[] = []
      const { lifecycle } = createHarness(entryPoint, {
        onStart (scope) {
          signals.push(scope.signal)
          const gate = deferred<void>()
          starts.push(gate)
          return gate.promise
        },
      })
      const firstStart = lifecycle.start()
      await flushMicrotasks()
      const stop = lifecycle.stop()
      const replacementStart = lifecycle.start()
      await flushMicrotasks()
      starts[0]!.resolve()
      await assert.rejects(firstStart, LifecycleSupersededError)
      await stop
      await flushMicrotasks()
      assert.equal(starts.length, 2)
      assert.equal(signals[0]?.aborted, true)
      assert.equal(signals[1]?.aborted, false)
      starts[1]!.resolve()
      await replacementStart
      assert.equal(lifecycle.state.generation, 2)
      await lifecycle.stop()
    }

    {
      const retirement = deferred<void>()
      const starts: ReturnType<typeof deferred<void>>[] = []
      let stopCalls = 0
      const { lifecycle } = createHarness(entryPoint, {
        onStart () {
          const gate = deferred<void>()
          starts.push(gate)
          return gate.promise
        },
        onStop () {
          stopCalls++
          return stopCalls === 1 ? retirement.promise : undefined
        },
      })
      const firstStart = lifecycle.start()
      await flushMicrotasks()
      starts[0]!.resolve()
      await firstStart
      const stop = lifecycle.stop()
      const replacementStart = lifecycle.start()
      await flushMicrotasks()
      assert.equal(lifecycle.state.kind, 'stopping')
      assert.equal(starts.length, 1)
      retirement.resolve()
      await stop
      await flushMicrotasks()
      assert.equal(starts.length, 2)
      starts[1]!.resolve()
      await replacementStart
      assert.equal(lifecycle.state.generation, 2)
      await lifecycle.stop()
    }

    {
      const starts: ReturnType<typeof deferred<void>>[] = []
      const { lifecycle } = createHarness(entryPoint, {
        onStart () {
          const gate = deferred<void>()
          starts.push(gate)
          return gate.promise
        },
      })
      const firstStart = lifecycle.start()
      await flushMicrotasks()
      const restart = lifecycle.restart()
      await flushMicrotasks()
      starts[0]!.resolve()
      await assert.rejects(firstStart, LifecycleSupersededError)
      await flushMicrotasks()
      assert.equal(starts.length, 2)
      starts[1]!.resolve()
      await restart
      assert.equal(lifecycle.state.generation, 2)
      await lifecycle.stop()
    }

    {
      const retirement = deferred<void>()
      const { lifecycle, condition } = createHarness(entryPoint, {
        onStart () {},
        onStop: () => retirement.promise,
      })
      const ready = condition('ready')
      await lifecycle.start()
      const firstStop = lifecycle.stop()
      await flushMicrotasks()
      const waiting = ready.wait()
      const secondStop = lifecycle.stop()
      await assert.rejects(waiting, LifecycleSupersededError)
      retirement.resolve()
      await Promise.all([ firstStop, secondStop ])
    }

    {
      const startGate = deferred<void>()
      const startEntered = deferred<void>()
      let startCalls = 0
      const { lifecycle } = createHarness(entryPoint, {
        onStart () {
          startCalls++
          startEntered.resolve()
          return startGate.promise
        },
      })
      const firstStart = lifecycle.start()
      const secondStart = lifecycle.start()
      await startEntered.promise
      assert.equal(startCalls, 1)
      startGate.resolve()
      await Promise.all([ firstStart, secondStart ])
      assert.equal(lifecycle.state.generation, 1)
      await lifecycle.stop()
    }

    {
      const startGate = deferred<void>()
      const controller = new AbortController()
      const reason = new Error(`${entryPoint} caller wait cancelled`)
      const { lifecycle } = createHarness(entryPoint, {
        onStart: () => startGate.promise,
      })
      const cancelledStart = lifecycle.start({ signal: controller.signal })
      await flushMicrotasks()
      const sharedStart = lifecycle.start()
      controller.abort(reason)
      await assert.rejects(cancelledStart, error => error === reason)
      assert.equal(lifecycle.state.kind, 'starting')
      startGate.resolve()
      await sharedStart
      const runningState = lifecycle.state
      assert.equal(runningState.kind, 'running')
      assert.equal(runningState.generation, 1)
      await lifecycle.stop()
    }

    {
      const finishStop = deferred<void>()
      let stopCalls = 0
      const { lifecycle } = createHarness(entryPoint, {
        onStart: () => {},
        onStop () {
          stopCalls++
          return finishStop.promise
        },
      })
      await lifecycle.start()
      const firstStop = lifecycle.stop()
      const secondStop = lifecycle.stop()
      const dispose = lifecycle[Symbol.asyncDispose]()
      finishStop.resolve()
      await Promise.all([ firstStop, secondStop, dispose ])
      assert.equal(stopCalls, 1)
      assert.equal(lifecycle.state.kind, 'stopped')
    }

    {
      const clock = createManualClock()
      let scope!: LifecycleScope
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
      }, { clock })
      await lifecycle.start()
      createWatchdog(scope, { timeoutMs: 5, clock })
      await lifecycle.stop()
      clock.advanceBy(5)
      const stoppedState = lifecycle.state
      assert.equal(stoppedState.kind, 'stopped')
      assert.equal(stoppedState.generation, 1)
    }

    {
      const childStart = deferred<void>()
      const childEntered = deferred<void>()
      const childHarness = createHarness(entryPoint, {
        onStart () {
          childEntered.resolve()
          return childStart.promise
        },
      })
      const parent = createHarness(entryPoint, {
        async onStart (scope) {
          await scope.start(childHarness.lifecycle)
        },
      })
      const parentStart = parent.lifecycle.start()
      await childEntered.promise
      const parentStop = parent.lifecycle.stop()
      childStart.resolve()
      await assert.rejects(parentStart, LifecycleSupersededError)
      await parentStop
      assert.equal(parent.lifecycle.state.kind, 'stopped')
      assert.equal(childHarness.lifecycle.state.kind, 'stopped')
    }

    {
      let scope!: LifecycleScope
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
      })
      await lifecycle.start()
      const recovery = scope.recover()
      const started = lifecycle.start()
      assert.equal(await recovery, 'superseded')
      await started
      assert.equal(lifecycle.state.kind, 'running')
      assert.equal(lifecycle.state.generation, 1)
      await lifecycle.stop()
    }

    {
      let scope!: LifecycleScope
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
      })
      await lifecycle.start()
      await scope.recover()
      assert.equal(lifecycle.state.kind, 'running')
      assert.equal(lifecycle.state.generation, 2)
      await scope.recover()
      assert.equal(lifecycle.state.kind, 'running')
      assert.equal(lifecycle.state.generation, 3)
      await lifecycle.stop()
    }

    {
      let scope!: LifecycleScope
      const stopEntered = deferred<void>()
      const finishStop = deferred<void>()
      const taskFinished = deferred<void>()
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
        onStop () {
          stopEntered.resolve()
          return finishStop.promise
        },
      })
      await lifecycle.start()
      scope.spawn(async () => {
        assert.equal(await scope.recover(), 'superseded')
        taskFinished.resolve()
      })
      const stop = lifecycle.stop()
      await stopEntered.promise
      await taskFinished.promise
      finishStop.resolve()
      await stop
      assert.equal(lifecycle.state.kind, 'stopped')
    }

    {
      let scope!: LifecycleScope
      const stopEntered = deferred<void>()
      const finishStop = deferred<void>()
      const failure = new Error(`${entryPoint} failure during recovery retirement`)
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
        onStop () {
          stopEntered.resolve()
          return finishStop.promise
        },
      })
      await lifecycle.start()
      const recovery = scope.recover()
      await stopEntered.promise
      scope.fail(failure)
      finishStop.resolve()
      assert.equal(await recovery, 'failed')
      assert.equal(lifecycle.state.kind, 'failed')
      if (lifecycle.state.kind === 'failed') {
        assert.equal(lifecycle.state.error, failure)
        assert.equal(lifecycle.state.phase, 'run')
      }
    }

    {
      const clock = createManualClock()
      const pendingAcquisition = deferred<{ readonly name: string }>()
      const acquisitionStarted = deferred<void>()
      const events: string[] = []
      const { lifecycle } = createHarness(entryPoint, {
        async onStart (scope) {
          await scope.acquire(
            () => ({ name: 'first' }),
            () => {
              events.push('release-first')
            },
            { interrupt: () => {
              events.push('interrupt-first')
              pendingAcquisition.resolve({ name: 'late' })
            } },
          )
          const acquiring = scope.acquire(
            () => {
              acquisitionStarted.resolve()
              return pendingAcquisition.promise
            },
            resource => {
              events.push(`release-${resource.name}`)
            },
            { interrupt: resource => {
              events.push(`interrupt-${resource.name}`)
            } },
          )
          scope.spawn(async () => {
            try {
              await acquiring
            } catch (error) {
              if (!scope.signal.aborted) {
                throw error
              }
            }
          })
        },
      }, { clock, stopTimeoutMs: 5 })
      await lifecycle.start()
      await acquisitionStarted.promise
      const stop = lifecycle.stop()
      for (let index = 0; index < 64 && lifecycle.state.kind === 'stopping'; index++) {
        await Promise.resolve()
      }
      if (lifecycle.state.kind === 'stopping') {
        clock.advanceBy(5)
      }
      await stop
      assert.deepEqual(events, [
        'interrupt-first',
        'interrupt-late',
        'release-late',
        'release-first',
      ])
    }

    {
      let scope!: LifecycleScope
      const cleanupStarted = deferred<void>()
      const finishCleanup = deferred<void>()
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
      })
      await lifecycle.start()
      await lifecycle.stop()
      assert.throws(() => scope.defer(() => {
        cleanupStarted.resolve()
        return finishCleanup.promise
      }))
      await cleanupStarted.promise
      const stop = lifecycle.stop()
      await assert.rejects(lifecycle.start())
      finishCleanup.resolve()
      await stop
      assert.equal(lifecycle.state.kind, 'stopped')
      await lifecycle.start()
      assert.equal(lifecycle.state.kind, 'running')
      await lifecycle.stop()
    }

    {
      const clock = createManualClock()
      let scope!: LifecycleScope
      let recoveryOutcome!: Promise<Awaited<ReturnType<LifecycleScope['recover']>>>
      const taskSettled = deferred<void>()
      const beginRecovery = deferred<void>()
      const stopEntered = deferred<void>()
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
          if (currentScope.generation === 1) {
            currentScope.spawn(async () => {
              await beginRecovery.promise
              recoveryOutcome = scope.recover()
              await recoveryOutcome
              taskSettled.resolve()
            })
          }
        },
        onStop () {
          stopEntered.resolve()
        },
      }, { clock, stopTimeoutMs: 5 })
      await lifecycle.start()
      beginRecovery.resolve()
      await stopEntered.promise
      await flushMicrotasks()
      if (lifecycle.state.kind === 'stopping') {
        clock.advanceBy(5)
      }
      assert.equal(await recoveryOutcome, 'recovered')
      await taskSettled.promise
      assert.equal(lifecycle.state.kind, 'running')
      assert.equal(lifecycle.state.generation, 2)
      await lifecycle.stop()
    }

    for (const rejection of [ undefined, null, false ]) {
      const { lifecycle } = createHarness(entryPoint, {
        onStart: () => {},
        onStop () {
          throw rejection
        },
      })
      await lifecycle.start()
      await assert.rejects(lifecycle.stop(), error => Object.is(error, rejection))
      assert.equal(lifecycle.state.kind, 'failed')
      if (lifecycle.state.kind === 'failed') {
        assert.ok(Object.is(lifecycle.state.error, rejection))
      }
    }

    {
      const starts: ReturnType<typeof deferred<void>>[] = []
      const stopGate = deferred<void>()
      let stopCalls = 0
      const { lifecycle } = createHarness(entryPoint, {
        onStart () {
          const gate = deferred<void>()
          starts.push(gate)
          return gate.promise
        },
        onStop () {
          stopCalls++
          return stopCalls === 1 ? stopGate.promise : undefined
        },
      })
      const initialStart = lifecycle.start()
      await flushMicrotasks()
      starts[0]!.resolve()
      await initialStart
      const stop = lifecycle.stop()
      const firstQueuedStart = lifecycle.start()
      const secondQueuedStart = lifecycle.start()
      await flushMicrotasks()
      assert.equal(starts.length, 1)
      stopGate.resolve()
      await stop
      await flushMicrotasks()
      assert.equal(starts.length, 2)
      starts[1]!.resolve()
      await Promise.all([ firstQueuedStart, secondQueuedStart ])
      await lifecycle.stop()
    }

    {
      let scope!: LifecycleScope
      const gracefulStop = deferred<void>()
      const { lifecycle } = createHarness(entryPoint, {
        onStart (currentScope) {
          scope = currentScope
        },
        onStop: () => gracefulStop.promise,
      })
      await lifecycle.start()
      const recovery = scope.recover()
      await flushMicrotasks()
      const stop = lifecycle.stop()
      gracefulStop.resolve()
      assert.equal(await recovery, 'superseded')
      await stop
      assert.equal(lifecycle.state.kind, 'stopped')
    }

    {
      const startGate = deferred<void>()
      const { lifecycle } = createHarness(entryPoint, {
        onStart: () => startGate.promise,
      })
      const start = lifecycle.start()
      await flushMicrotasks()
      const stop = lifecycle.stop()
      startGate.resolve()
      await assert.rejects(start, LifecycleSupersededError)
      await stop
      assert.equal(lifecycle.state.kind, 'stopped')
    }

    {
      const startError = new Error(`${entryPoint} startup failure`)
      let startCalls = 0
      const { lifecycle } = createHarness(entryPoint, {
        onStart () {
          startCalls++
          if (startCalls === 1) {
            throw startError
          }
        },
      })
      await assert.rejects(lifecycle.start(), error => error === startError)
      await lifecycle.start()
      assert.equal(startCalls, 2)
      await lifecycle.stop()
    }

    {
      const startError = new Error(`${entryPoint} readiness failure`)
      const { lifecycle, condition } = createHarness(entryPoint, {
        onStart: () => {
          throw startError
        },
      })
      const readyWait = condition('ready').wait()
      await assert.rejects(lifecycle.start(), error => error === startError)
      await assert.rejects(readyWait, error => error === startError)
    }

    {
      const emitter = new EventEmitter()
      const { lifecycle } = createHarness(entryPoint, {
        onStart (scope) {
          scope.listen(emitter, 'tick', () => {})
        },
      })
      for (let cycle = 0; cycle < 3; cycle++) {
        await lifecycle.start()
        assert.equal(emitter.listenerCount('tick'), 1)
        await lifecycle.stop()
        assert.equal(emitter.listenerCount('tick'), 0)
      }
    }
  }
})

test('scope resources unwind in reverse order and listeners detach on retirement', async () => {
  const order: string[] = []
  const emitter = new EventEmitter()
  const eventTarget = new EventTarget()
  let listenerCalls = 0
  let retiredScope!: LifecycleScope
  const lifecycle = createLifecycle({
    onStart (scope) {
      retiredScope = scope
      scope.defer(() => {
        order.push('first')
      })
      scope.use({
        [Symbol.dispose] () {
          order.push('second')
        },
      })
      scope.listen(emitter, 'tick', () => listenerCalls++)
      scope.listen(eventTarget, 'tick', () => listenerCalls++)
      scope.spawn(async signal => {
        await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
        order.push('task')
      })
      void scope.acquire(
        async () => {
          order.push('acquire')
          return 'resource'
        },
        resource => {
          order.push(`release:${resource}`)
        },
      )
    },
  })

  await lifecycle.start()
  emitter.emit('tick')
  eventTarget.dispatchEvent(new Event('tick'))
  assert.equal(listenerCalls, 2)
  await lifecycle.stop()
  emitter.emit('tick')
  eventTarget.dispatchEvent(new Event('tick'))
  assert.equal(listenerCalls, 2)
  assert.deepEqual(order, [ 'acquire', 'task', 'release:resource', 'second', 'first' ])

  assert.throws(() => retiredScope.defer(() => {
    order.push('late-defer')
  }), LifecycleSupersededError)
  assert.equal(order.at(-1), 'late-defer')
  assert.throws(() => retiredScope.use({
    [Symbol.dispose] () {
      order.push('late-use')
    },
  }), LifecycleSupersededError)
  assert.equal(order.at(-1), 'late-use')
})

test('startup failures report cleanup errors and stop retries remaining debt', async () => {
  let cleanupCalls = 0
  const startError = new Error('startup')
  const cleanupError = new Error('first cleanup')
  const lifecycle = createLifecycle({
    onStart (scope) {
      scope.defer(() => {
        cleanupCalls++
        if (cleanupCalls === 1) {
          throw cleanupError
        }
      })
      throw startError
    },
  })

  const failed = lifecycle.whenState(state => state.kind === 'failed')
  await assert.rejects(lifecycle.start(), error => error === startError)
  const failedState = await failed
  assert.equal(failedState.kind, 'failed')
  if (failedState.kind !== 'failed') {
    assert.fail('expected a failed state')
  }
  assert.equal(failedState.phase, 'start')
  assert.equal(failedState.cleanupComplete, false)
  await assert.rejects(lifecycle.start(), LifecycleUnsafeStateError)

  await lifecycle.stop()
  assert.equal(cleanupCalls, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('start timeout is deterministic and a pre-aborted caller does not mutate intent', async () => {
  const clock = createManualClock()
  const started = deferred<void>()
  const lifecycle = createLifecycle({
    onStart () {
      return started.promise
    },
  }, { startTimeoutMs: 5, stopTimeoutMs: 5, clock })

  const preAborted = new AbortController()
  preAborted.abort('no start')
  await assert.rejects(lifecycle.start({ signal: preAborted.signal }), error => error === 'no start')
  const idleState: LifecycleState = lifecycle.state
  assert.equal(idleState.kind, 'stopped')

  const starting = lifecycle.start()
  await flushMicrotasks()
  clock.advanceBy(5)
  await flushMicrotasks()
  clock.advanceBy(5)
  await assert.rejects(starting, LifecycleTimeoutError)
  const timedOutState: LifecycleState = lifecycle.state
  assert.equal(timedOutState.kind, 'failed')
  started.resolve()
  await flushMicrotasks()
  await lifecycle.stop()
  const finalState: LifecycleState = lifecycle.state
  assert.equal(finalState.kind, 'stopped')
})

test('runtime failures retire the generation and resolve whenState observers', async () => {
  const entered = deferred<void>()
  const failNow = deferred<void>()
  const failed = new Error('background failure')
  let scope: LifecycleScope | undefined
  const lifecycle = createLifecycle({
    onStart (currentScope) {
      scope = currentScope
      currentScope.spawn(async () => {
        entered.resolve()
        await failNow.promise
        throw failed
      })
    },
  })

  const failedState = lifecycle.whenState(state => state.kind === 'failed')
  await lifecycle.start()
  await entered.promise
  failNow.resolve()
  const state = await failedState
  assert.equal(state.kind, 'failed')
  if (state.kind !== 'failed') {
    assert.fail('expected a failed state')
  }
  assert.equal(state.phase, 'run')
  assert.equal(state.error, failed)
  const retiredScope = scope as LifecycleScope | undefined
  assert.ok(retiredScope)
  retiredScope.fail(new Error('stale failure'))
  await lifecycle.stop()
  assert.equal(lifecycle.state.kind, 'failed')
})

test('owned child lifecycles stop with their parent and unexpected child failure propagates', async () => {
  const events: string[] = []
  const child = createLifecycle({
    onStart: () => {
      events.push('child-start')
    },
    onStop: () => {
      events.push('child-stop')
    },
  })
  const parent = createLifecycle({
    onStart: async scope => {
      await scope.start(child)
    },
  })
  await parent.start()
  await parent.stop()
  assert.deepEqual(events, [ 'child-start', 'child-stop' ])
  assert.equal(child.state.kind, 'stopped')

  const failingChild = createLifecycle({
    onStart: scope => scope.fail(new Error('child failure')),
  })
  const failingParent = createLifecycle({
    onStart: async scope => {
      await scope.start(failingChild)
    },
  })
  const failedParent = failingParent.whenState(state => state.kind === 'failed')
  await assert.rejects(failingParent.start())
  assert.equal((await failedParent).kind, 'failed')
})

test('AsyncLifecycle inheritance rejects final-method overrides', async () => {
  class Service extends AsyncLifecycle {
    constructor () {
      super()
    }

    protected override onStart (scope: LifecycleScope): void {
      scope.defer(() => {})
    }
  }
  const service = new Service()
  await service.start()
  await service.stop()
  assert.equal(service.state.kind, 'stopped')

  class InvalidService extends AsyncLifecycle {
    constructor () {
      super()
    }

    override start (): Promise<void> {
      return Promise.resolve()
    }

    protected override onStart (): void {}
  }
  assert.throws(() => new InvalidService(), LifecycleOverrideError)

  class ObservedService extends AsyncLifecycle {
    readonly observedStates: string[] = []

    constructor () {
      super({ name: 'observed' })
    }

    protected override onStart (): void {}

    protected override onStop = (): void => {
      this.observedStates.push('stopped')
    }

    protected override onStateChange = (state: LifecycleState): void => {
      this.observedStates.push(state.kind)
    }
  }
  const observed = new ObservedService()
  await observed.start()
  await observed.stop()
  assert.ok(observed.observedStates.includes('running'))
  assert.equal(observed.observedStates.at(-1), 'stopped')

  class StateOverrideService extends Service {
    override get state (): LifecycleState {
      return { kind: 'stopped', generation: 0 }
    }
  }
  assert.throws(() => new StateOverrideService(), LifecycleOverrideError)

  class DisposeOverrideService extends Service {
    override [Symbol.asyncDispose] (): Promise<void> {
      return Promise.resolve()
    }
  }
  assert.throws(() => new DisposeOverrideService(), LifecycleOverrideError)

  class FieldStartOverride extends AsyncLifecycle {
    constructor () {
      super()
    }

    protected override onStart (): void {}

    override start = (): Promise<void> => Promise.resolve()
  }
  assert.throws(() => new FieldStartOverride(), TypeError)
})

test('diagnostics publish committed sanitized metadata before isolated observers', async () => {
  const channel = diagnosticsChannel.channel(LIFECYCLE_DIAGNOSTICS_CHANNEL)
  const events: Array<Record<string, unknown>> = []
  const order: string[] = []
  const secret = 'credential=must-not-appear'
  let lifecycle!: Lifecycle
  let scope!: LifecycleScope

  const subscriber = (event: unknown): void => {
    const payload = event as Record<string, unknown>
    events.push(payload)
    order.push(`diagnostic:${String(payload['kind'])}`)
    assert.equal(lifecycle.state.kind, payload['kind'])
    assert.equal(Object.isFrozen(payload), true)
  }
  channel.subscribe(subscriber)

  try {
    lifecycle = createLifecycle({
      onStart (currentScope) {
        scope = currentScope
      },
      onStateChange (state) {
        order.push(`observer:${state.kind}`)
        if (state.kind === 'running') {
          throw new Error(secret)
        }
      },
    }, { name: 'diagnostic-test' })

    const failed = lifecycle.whenState(state => state.kind === 'failed')
    await lifecycle.start()
    scope.fail(new Error(secret))
    await failed

    assert.deepEqual(order, [
      'diagnostic:starting',
      'observer:starting',
      'diagnostic:running',
      'observer:running',
      'diagnostic:stopping',
      'observer:stopping',
      'diagnostic:failed',
      'observer:failed',
    ])
    assert.equal(events.length, 4)
    const failedEvent = events.at(-1)!
    assert.deepEqual(Object.keys(failedEvent).sort(), [
      'cleanupComplete',
      'durationMs',
      'generation',
      'instanceId',
      'kind',
      'phase',
      'previousKind',
      'revision',
      'service',
      'timestampMs',
      'version',
    ])
    assert.equal(failedEvent['kind'], 'failed')
    assert.equal(failedEvent['phase'], 'run')
    assert.equal(failedEvent['service'], 'diagnostic-test')
    assert.equal(JSON.stringify(events).includes(secret), false)
    await lifecycle.stop()
  } finally {
    channel.unsubscribe(subscriber)
  }
})

test('watchdog feed, disarm, and expiry use the supplied clock', async () => {
  const clock = createManualClock()
  let scope!: LifecycleScope
  const lifecycle = createLifecycle({
    onStart (currentScope) {
      scope = currentScope
    },
  })
  await lifecycle.start()

  const watchdog = createWatchdog(scope, {
    timeoutMs: 10,
    onTimeout: 'fail',
    clock,
    name: 'test',
  })
  const failedState = lifecycle.whenState(state => state.kind === 'failed')
  watchdog.feed(20)
  clock.advanceBy(10)
  assert.equal(lifecycle.state.kind, 'running')
  clock.advanceBy(10)
  const state = await failedState
  assert.equal(state.kind, 'failed')
  if (state.kind === 'failed') {
    assert.equal(state.phase, 'run')
    assert.ok(state.error instanceof LifecycleTimeoutError)
    assert.match(state.error.message, /\[test\]/)
    assert.equal(state.error.timeoutMs, 20)
  }
  watchdog.disarm()
  await lifecycle.stop()
})

test('watchdog defaults to recovery and the default diagnostic label', async () => {
  const clock = createManualClock()
  let scope!: LifecycleScope
  const lifecycle = createLifecycle({
    onStart (currentScope) {
      scope = currentScope
    },
  })
  await lifecycle.start()

  createWatchdog(scope, { timeoutMs: 5, clock })
  clock.advanceBy(5)
  await lifecycle.whenState(state => state.kind === 'running' && state.generation === 2)
  assert.equal(lifecycle.state.generation, 2)
  await lifecycle.stop()
})

test('cleanup error collapsing preserves zero, one, and multiple failures', () => {
  const first = new Error('first')
  const second = new Error('second')
  assert.equal(collapseCleanupErrors([]), undefined)
  assert.equal(collapseCleanupErrors([ first ]), first)
  const aggregate = collapseCleanupErrors([ first, second ])
  assert.ok(aggregate instanceof AggregateError)
  assert.deepEqual(aggregate.errors, [ first, second ])
})
