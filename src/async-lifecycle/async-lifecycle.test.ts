/**
 * Cross-runtime behavioral tests for lifecycle state reconciliation and generation-owned
 * resources; these tests keep the portable lifecycle kernel exercised under Node.js and Deno.
 */

import assert from 'node:assert/strict'
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
  LifecycleScope,
  LifecycleState,
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

    protected override onStop (): void {
      this.observedStates.push('stopped')
    }

    protected override onStateChange (state: LifecycleState): void {
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
