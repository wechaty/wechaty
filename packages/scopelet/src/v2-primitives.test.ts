/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 * Unit & contract tests for ScopeLet v2 primitives:
 * - ADR-01: Direct Composition via `createLifecycle.attach()`
 * - ADR-02: Self-Sovereign Condition Handles (`condition.set()`, `condition.clear()`, `condition.when()`, `condition.whenClear()`)
 * - ADR-03: Two-Phase Resource Allocation (`scope.acquireService()`)
 * - ADR-04: Clock-Aware Sleep Primitives (`scope.sleep()`, `sleep()`)
 * - ADR-06: Direct Engine Operation Routing (`controller.operation()`, `asyncLifecycle.operation()`)
 * - Boolean state accessors (`isRunning`, `isActive`, `isStarting`, etc.) and semantic awaiters (`whenRunning`, `whenStopped`)
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { AsyncLifecycle } from './async-lifecycle.ts'
import { MAX_TIMEOUT_MS, sleep } from './clock.ts'
import { CANONICAL_LIFECYCLE, createLifecycle } from './create-lifecycle.ts'
import {
  LifecycleOverrideError,
  LifecycleSupersededError,
  LifecycleUnsafeStateError,
} from './errors.ts'
import { ManualClock } from './contract/harness.ts'
import { PuppetMock } from './examples/puppet.example.ts'
import { Wechaty } from './examples/wechaty.example.ts'
import type { Lifecycle, LifecycleConditionHandle, LifecycleController, LifecycleScope } from './types.ts'

test('ADR-04: createLifecycle.attach() installs the caller surface and returns the owner API', async () => {
  let controller!: LifecycleController
  class Service {

    public log: string[] = []

    constructor () {
      controller = createLifecycle.attach(this, {
        onStart: scope => {
          this.log.push('started')
          scope.defer(() => { this.log.push('stopped') })
        },
      })
    }

  }

  interface Service extends Lifecycle {
    log: string[]
  }

  const service = new Service()
  const state = () => service.state
  assert.equal(state().kind, 'stopped')
  assert.equal(service.isStopped, true)
  assert.equal(service.isRunning, false)
  assert.equal(service.isActive, false)

  const startPromise = service.start()
  await service.whenRunning()

  assert.equal(state().kind, 'running')
  assert.equal(service.isRunning, true)
  assert.equal(service.isActive, true)
  assert.equal(service.isStopped, false)
  assert.deepEqual(service.log, ['started'])

  await startPromise

  assert.equal('operation' in service, false)
  const opResult = await controller.operation(async signal => {
    assert.equal(signal.aborted, false)
    return 42
  })
  assert.equal(opResult, 42)

  await service.stop()
  assert.equal(state().kind, 'stopped')
  assert.equal(service.isStopped, true)
  assert.equal(service.isRunning, false)
  assert.deepEqual(service.log, ['started', 'stopped'])

  await exerciseDelegatedLifecycle(service)
})

test('ADR-01: createLifecycle.attach() detects member collision and throws LifecycleOverrideError', () => {
  class CollidingTarget {

    public isRunning = true

    constructor () {
      createLifecycle.attach(this, {
        onStart: () => {},
      })
    }

  }

  assert.throws(
    () => new CollidingTarget(),
    LifecycleOverrideError,
  )
})

test('ADR-01: createLifecycle.attach() validates target extensibility and canonical identity', async () => {
  assert.throws(() => createLifecycle.attach(Object.preventExtensions({}), { onStart: () => {} }), TypeError)
  assert.throws(() => createLifecycle.attach(null as any, { onStart: () => {} }), TypeError)
  assert.throws(() => createLifecycle.attach(42 as any, { onStart: () => {} }), TypeError)

  const target = {}
  const controller = createLifecycle.attach(target, { onStart: () => {} })
  assert.equal((target as any)[CANONICAL_LIFECYCLE], controller)
  assert.equal((target as any).condition, undefined)

  // Colliding on CANONICAL_LIFECYCLE
  assert.throws(() => createLifecycle.attach(target, { onStart: () => {} }), LifecycleOverrideError)

  // Two scopes starting target and controller detect ownership collision
  const parent1 = createLifecycle({
    onStart: async scope => {
      await scope.start(target as any)
    },
  })
  const parent2 = createLifecycle({
    onStart: async scope => {
      await scope.start(controller)
    },
  })
  await parent1.start()
  await assert.rejects(() => parent2.start(), LifecycleUnsafeStateError)
  await parent1.stop()
  await parent2.start()
  await parent2.stop()
})

test('ADR-02: Self-sovereign condition handles support set(), clear(), when(), and whenClear()', async () => {
  const clock = new ManualClock()
  let innerScope!: LifecycleScope
  const lifecycle = createLifecycle({
    onStart: scope => {
      innerScope = scope
    },
  }, { clock })

  const readyCondition = lifecycle.condition('ready')
  assert.equal(readyCondition.name, 'ready')
  assert.equal(readyCondition.isSet, false)
  await readyCondition.whenClear()

  // Cannot set or clear while stopped
  assert.throws(() => readyCondition.set(), LifecycleUnsafeStateError)
  assert.throws(() => readyCondition.clear(), LifecycleUnsafeStateError)

  await assert.rejects(readyCondition.when(NaN), RangeError)
  await assert.rejects(readyCondition.whenClear(NaN), RangeError)
  await assert.rejects(readyCondition.when(-5), RangeError)
  await assert.rejects(readyCondition.whenClear(-5), RangeError)

  await lifecycle.start()

  const scopedReady = innerScope.condition('ready')
  assert.equal(innerScope.condition('ready'), scopedReady)
  assert.notEqual(scopedReady, readyCondition)

  // when() resolves when set
  let whenResolved = false
  const waitPromise = readyCondition.when(1000).then(() => { whenResolved = true })

  assert.equal(whenResolved, false)
  readyCondition.set()
  assert.equal(readyCondition.isSet, true)

  await waitPromise
  assert.equal(whenResolved, true)

  // whenClear() resolves when cleared
  let whenClearResolved = false
  const clearPromise = readyCondition.whenClear(1000).then(() => { whenClearResolved = true })

  assert.equal(whenClearResolved, false)
  readyCondition.clear()
  assert.equal(readyCondition.isSet, false)

  await clearPromise
  assert.equal(whenClearResolved, true)

  // when(timeoutMs) with ManualClock timing out
  const timeoutWait = readyCondition.when(200)
  await clock.advance(200)
  await assert.rejects(timeoutWait, (err: any) => err.name === 'TimeoutError')

  // whenClear(timeoutMs) with ManualClock timing out
  readyCondition.set()
  const timeoutClear = readyCondition.whenClear(200)
  await clock.advance(200)
  await assert.rejects(timeoutClear, (err: any) => err.name === 'TimeoutError')

  // waitClear with condition not set resolves immediately
  readyCondition.clear()
  await readyCondition.whenClear()

  // wait with a pre-aborted signal
  const preAc = new AbortController()
  preAc.abort(new Error('pre-aborted'))
  await assert.rejects(() => readyCondition.wait({ signal: preAc.signal }), /pre-aborted/)

  // Scoped condition handle
  const scopedLogin = innerScope.condition('login')
  assert.equal(scopedLogin.name, 'login')
  assert.equal(scopedLogin.isSet, false)

  scopedLogin.set()
  assert.equal(scopedLogin.isSet, true)

  scopedLogin.clear()
  assert.equal(scopedLogin.isSet, false)

  await lifecycle.stop()

  // Cannot set or clear on sealed scope
  assert.throws(() => readyCondition.set(), LifecycleUnsafeStateError)
  assert.throws(() => readyCondition.clear(), LifecycleUnsafeStateError)
})

test('scope condition handles retire with their generation and leave its replacement untouched', async () => {
  const clock = new ManualClock()
  let scope!: LifecycleScope
  const lifecycle = createLifecycle({ onStart: current => { scope = current } }, { clock })
  const ready = lifecycle.condition('ready')
  await lifecycle.start()
  const first = scope.condition('ready')
  scope.set(first)
  assert.equal(ready.isSet, true)

  const clear = assert.rejects(first.whenClear(100), LifecycleSupersededError)
  await lifecycle.restart()
  await clear
  assert.equal(clock.pending, 0)
  const second = scope.condition('ready')
  assert.notEqual(first, second)

  first.set()
  scope.set(first)
  assert.equal(second.isSet, false)
  second.set()
  assert.equal(first.isSet, false)
  first.clear()
  scope.clear(first)
  assert.equal(ready.isSet, true)

  await assert.rejects(first.wait(), LifecycleSupersededError)
  await assert.rejects(first.when(), LifecycleSupersededError)
  await assert.rejects(first.whenClear(), LifecycleSupersededError)
  const reason = new Error('caller aborted')
  await assert.rejects(first.wait({ signal: AbortSignal.abort(reason) }), error => error === reason)
  await lifecycle.stop()
})

test('a task starting a scope condition wait during retirement can finish before restart', async () => {
  const lifecycle = createLifecycle({
    onStart: scope => {
      if (scope.generation !== 1) return
      const ready = scope.condition('ready')
      scope.spawn(async signal => {
        await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
        await assert.rejects(ready.when(), LifecycleSupersededError)
      })
    },
  })
  await lifecycle.start()
  await lifecycle.restart()
  assert.equal(lifecycle.state.generation, 2)
  await lifecycle.stop()
})

test('set and clear deadlines are judged at settlement even if the timer has not fired', async () => {
  const clock = new ManualClock()
  const lifecycle = createLifecycle({ onStart: () => {} }, { clock })
  const ready = lifecycle.condition('ready')
  await lifecycle.start()

  const set = assert.rejects(ready.when(10), { name: 'TimeoutError' })
  clock.jump(10)
  ready.set()
  await set
  assert.equal(clock.pending, 0)

  const clear = assert.rejects(ready.whenClear(10), { name: 'TimeoutError' })
  clock.jump(11)
  ready.clear()
  await clear
  assert.equal(clock.pending, 0)

  const onTime = ready.when(10)
  clock.jump(9)
  ready.set()
  clock.jump(10)
  await onTime
  assert.equal(clock.pending, 0)

  const retiredAfterDeadline = assert.rejects(ready.whenClear(5), { name: 'TimeoutError' })
  clock.jump(5)
  await lifecycle.stop()
  await retiredAfterDeadline
  assert.equal(clock.pending, 0)
})

test('a condition deadline rearms a timer delivered early by rounding', async () => {
  let now = 0
  let fire!: () => void
  let delay = 0
  const lifecycle = createLifecycle({ onStart: () => {} }, {
    clock: {
      now: () => now,
      setTimeout: (callback, ms) => {
        fire = callback
        delay = ms
      },
      clearTimeout: () => {},
    },
  })
  const timed = assert.rejects(lifecycle.condition('ready').when(10), { name: 'TimeoutError' })
  now = 9.7
  fire()
  assert.equal(delay, 1)
  now = 10
  fire()
  await timed
})

test('ADR-03: scope.acquireService() auto-rolls back partial allocation when start() throws', async () => {
  let stopCleanedUp = false

  const lifecycle = createLifecycle({
    onStart: async scope => {
      await scope.acquireService({
        start: async () => {
          throw new Error('Connection refused by remote host')
        },
        stop: async () => {
          stopCleanedUp = true
        },
      })
    },
  })

  await assert.rejects(
    async () => lifecycle.start(),
    /Connection refused by remote host/,
  )

  await lifecycle.whenState(s => s.kind === 'failed')
  assert.equal(stopCleanedUp, true, 'service stop() was called to unwind partial allocation')
  assert.equal(lifecycle.isFailed, true)

  await lifecycle.stop()
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('ADR-03: scope.acquireService() allocates cleanly on success and unwinds on lifecycle.stop()', async () => {
  let stopped = false
  let receivedSignal: AbortSignal | undefined

  const lifecycle = createLifecycle({
    onStart: async scope => {
      const client = await scope.acquireService({
        start: signal => {
          receivedSignal = signal
          return { connected: true }
        },
        stop: () => {
          stopped = true
        },
      })
      assert.equal(client.connected, true)
    },
  })

  await lifecycle.start()
  assert.equal(receivedSignal?.aborted, false)
  assert.equal(stopped, false)

  await lifecycle.stop()
  assert.equal(stopped, true)
})

test('ADR-03: scope.acquireService() unblocks starting during retirement interrupt (Padlocal pattern)', async () => {
  let stopCalls = 0
  let stopped = false
  let allocated = false
  const { promise: stopCalled, resolve: notifyStop } = Promise.withResolvers<void>()
  const lifecycle = createLifecycle({
    onStart: async scope => {
      await scope.acquireService({
        start: async () => {
          await stopCalled
          // The two-hook contract fences any work that resumes after stop.
          if (!stopped) allocated = true
          return { ready: true }
        },
        stop: async () => {
          stopCalls++
          stopped = true
          notifyStop()
        },
      })
    },
  })

  const startPromise = lifecycle.start()
  await lifecycle.whenState(s => s.kind === 'starting')
  await lifecycle.stop()
  await assert.rejects(startPromise)
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(stopCalls, 1)
  assert.equal(allocated, false)
})

test('ADR-03: scope.acquireService() preserves retryable cleanup debt when rollback stop() fails', async () => {
  let stopCalls = 0
  let abortCalls = 0
  const cleanupError = new Error('stop exploded')
  const lifecycle = createLifecycle({
    onStart: async scope => {
      await scope.acquireService({
        start: async () => {
          throw new Error('start exploded')
        },
        abort: () => { abortCalls++ },
        stop: () => {
          if (++stopCalls === 1) throw cleanupError
        },
      })
    },
  })

  await assert.rejects(() => lifecycle.start(), /start exploded/)
  await lifecycle.whenState(s => s.kind === 'failed')
  assert.equal(lifecycle.state.kind, 'failed')
  if (lifecycle.state.kind === 'failed') {
    assert.equal(lifecycle.state.cleanupComplete, false)
    assert.equal(lifecycle.state.cleanupError, cleanupError)
  }
  assert.equal(abortCalls, 0)
  assert.equal(stopCalls, 1)
  await lifecycle.stop()
  assert.equal(stopCalls, 2)
  assert.equal(lifecycle.isStopped, true)
})

test('acquireService joins pending startup after abort before disposal and retries a failed stop', async () => {
  let scope!: LifecycleScope
  const lifecycle = createLifecycle({ onStart: current => { scope = current } })
  await lifecycle.start()

  const startup = Promise.withResolvers<void>()
  const aborting = Promise.withResolvers<void>()
  const cleanupError = new Error('first stop failed')
  const events: string[] = []
  let stopCalls = 0
  let allocated = false
  const acquired = assert.rejects(scope.acquireService({
    async start () {
      await startup.promise
      events.push('allocate')
      allocated = true
    },
    abort () {
      events.push('abort')
      aborting.resolve()
    },
    stop () {
      events.push('stop')
      if (++stopCalls === 1) throw cleanupError
      allocated = false
    },
  }), LifecycleSupersededError)

  const firstStop = assert.rejects(lifecycle.stop(), error => error === cleanupError)
  const concurrentStop = assert.rejects(lifecycle.stop(), error => error === cleanupError)
  await aborting.promise
  await flushTurns()
  assert.deepEqual(events, ['abort'])

  startup.resolve()
  await Promise.all([acquired, firstStop, concurrentStop])
  assert.deepEqual(events, ['abort', 'allocate', 'stop'])
  assert.equal(lifecycle.state.kind, 'failed')
  assert.equal(allocated, true)

  await lifecycle.stop()
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(allocated, false)
  assert.equal(stopCalls, 2)
})

test('acquireService calls abort once when cancellation rejects startup', async () => {
  const entered = Promise.withResolvers<void>()
  const startup = Promise.withResolvers<void>()
  const startupError = new Error('cancelled provider startup')
  let abortCalls = 0
  let stopCalls = 0
  const lifecycle = createLifecycle({
    async onStart (scope) {
      await scope.acquireService({
        start () {
          entered.resolve()
          return startup.promise
        },
        abort () {
          abortCalls++
          startup.reject(startupError)
          return Promise.resolve()
        },
        stop () { stopCalls++ },
      })
    },
  })

  const started = assert.rejects(lifecycle.start(), LifecycleSupersededError)
  await entered.promise
  await lifecycle.stop()
  await started
  assert.equal(abortCalls, 1)
  assert.equal(stopCalls, 1)
})

test('a two-hook service reports its early stop failure once and retries it on the next stop', async () => {
  const entered = Promise.withResolvers<void>()
  const startup = Promise.withResolvers<void>()
  const cleanupError = new Error('early stop failed')
  let stopCalls = 0
  const lifecycle = createLifecycle({
    async onStart (scope) {
      await scope.acquireService({
        start () {
          entered.resolve()
          return startup.promise
        },
        stop () {
          startup.resolve()
          if (++stopCalls === 1) throw cleanupError
        },
      })
    },
  })

  const started = assert.rejects(lifecycle.start(), LifecycleSupersededError)
  await entered.promise
  await assert.rejects(lifecycle.stop(), error => error === cleanupError)
  await started
  assert.equal(stopCalls, 1)
  await lifecycle.stop()
  assert.equal(stopCalls, 2)
  assert.equal(lifecycle.isStopped, true)
})

test('ADR-04: scope.sleep() resolves and aborts gracefully with signal', async () => {
  const clock = new ManualClock()
  let sleepCompleted = false
  let sleepAborted = false
  let innerScope!: LifecycleScope

  const lifecycle = createLifecycle({
    onStart: async scope => {
      innerScope = scope
      const p = scope.sleep(100).then(() => { sleepCompleted = true })
      await clock.advance(100)
      await p
    },
  }, { clock })

  await lifecycle.start()
  assert.equal(sleepCompleted, true)

  const sleepPromise = innerScope.sleep(10_000).catch(() => {
    sleepAborted = true
  })
  await lifecycle.stop()
  await sleepPromise
  assert.equal(sleepAborted, true)
  assert.equal(lifecycle.isStopped, true)

  // sleep on sealed scope rejects immediately
  await assert.rejects(() => innerScope.sleep(100))
})

test('ADR-04: exported sleep() helper works standalone', async () => {
  const clock = new ManualClock()
  let resolved = false
  const p = sleep(20, undefined, clock).then(() => { resolved = true })
  assert.equal(resolved, false)
  await clock.advance(10)
  assert.equal(resolved, false)
  await clock.advance(10)
  await p
  assert.equal(resolved, true)

  // Non-positive delay resolves immediately
  await sleep(0, undefined, clock)
  await sleep(-10, undefined, clock)

  // Invalid inputs throw RangeError
  assert.throws(() => sleep(NaN, undefined, clock), RangeError)
  assert.throws(() => sleep(Infinity, undefined, clock), RangeError)
  assert.throws(() => sleep(-Infinity, undefined, clock), RangeError)
  assert.throws(() => sleep(MAX_TIMEOUT_MS + 1, undefined, clock), RangeError)

  // AbortSignal
  const ac = new AbortController()
  const pAbort = sleep(5000, ac.signal, clock)
  ac.abort(new Error('aborted sleep'))
  await assert.rejects(pAbort, /aborted sleep/)

  // Pre-aborted signal
  const preAc = new AbortController()
  preAc.abort(new Error('already aborted'))
  await assert.rejects(() => sleep(100, preAc.signal, clock), /already aborted/)
})

test('ADR-06: controller.operation() routes directly to active generation without #scope caching', async () => {
  const lifecycle = createLifecycle({
    onStart: async () => {},
  })

  // Refused before start
  await assert.rejects(
    () => lifecycle.operation(async () => 'result'),
    LifecycleUnsafeStateError,
  )

  await lifecycle.start()

  // Allowed while running
  const res = await lifecycle.operation(async signal => {
    assert.equal(signal.aborted, false)
    return 'hello from operation'
  })
  assert.equal(res, 'hello from operation')

  await lifecycle.stop()

  // Refused after stop
  await assert.rejects(
    () => lifecycle.operation(async () => 'result'),
    LifecycleUnsafeStateError,
  )
})

test('ADR-06: AsyncLifecycle.operation() routes directly to active generation without #scope caching', async () => {
  class TestPuppet extends AsyncLifecycle {

    public constructor () {
      super()
    }

    protected override async onStart (_scope: LifecycleScope): Promise<void> {}

    public sendText (text: string): Promise<string> {
      return this.operation(async () => `echo:${text}`)
    }

  }

  const puppet = new TestPuppet()

  // Before start: throws LifecycleUnsafeStateError
  await assert.rejects(
    () => puppet.sendText('hi'),
    LifecycleUnsafeStateError,
  )

  await puppet.start()
  const reply = await puppet.sendText('hi')
  assert.equal(reply, 'echo:hi')

  await puppet.stop()
  await assert.rejects(
    () => puppet.sendText('hi'),
    LifecycleUnsafeStateError,
  )
})

test('AsyncLifecycle.operation() forwards allowStarting option during onStart()', async () => {
  class StartupOpService extends AsyncLifecycle {

    public startupResult: string | undefined

    public constructor () {
      super()
    }

    protected override async onStart (): Promise<void> {
      this.startupResult = await this.operation(async () => 'started-op', { allowStarting: true })
    }

  }

  const service = new StartupOpService()
  await service.start()
  assert.equal(service.startupResult, 'started-op')
  await service.stop()
})

test('Semantic state awaiters: whenRunning() and whenStopped()', async () => {
  const lifecycle = createLifecycle({
    onStart: async () => {},
  })

  let reachedRunning = false
  lifecycle.whenRunning().then(() => { reachedRunning = true })

  let reachedStopped = false
  lifecycle.whenStopped().then(() => { reachedStopped = true })

  // Stopped initially -> whenStopped() resolves immediately
  await flushTurns()
  assert.equal(reachedStopped, true)
  assert.equal(reachedRunning, false)

  await lifecycle.start()
  assert.equal(reachedRunning, true)

  reachedStopped = false
  const stoppedPromise = lifecycle.whenStopped().then(() => { reachedStopped = true })
  assert.equal(reachedStopped, false)

  await lifecycle.stop()
  await stoppedPromise
  assert.equal(reachedStopped, true)
})

test('Companions: destructuring safety and options forwarding', async () => {
  let addOptions: any
  let removeOptions: any
  const mockTarget = {
    addEventListener (_event: string, _listener: any, options: any) {
      addOptions = options
    },
    removeEventListener (_event: string, _listener: any, options: any) {
      removeOptions = options
    },
  }

  const clock = new ManualClock()
  const lifecycle = createLifecycle({
    onStart: scope => {
      const { listen, operation, watchdog } = scope
      listen(mockTarget, 'custom', () => {}, { capture: true })
      assert.equal(addOptions.capture, true)

      operation(async () => 'op-ok')

      const wd1 = watchdog({ timeoutMs: 50, onTimeout: 'fail', clock })
      wd1.feed()
      wd1.disarm()

      const wd2 = watchdog(50, { onTimeout: 'recover', clock })
      wd2.feed()
      wd2.disarm()

      assert.throws(() => watchdog({ timeoutMs: 50, onTimeout: 'invalid' as any }), TypeError)
    },
  }, { clock })

  await lifecycle.start()
  await lifecycle.stop()
  assert.equal(removeOptions.capture, true)
})

test('scope.listen removes the actual capture registration after options mutate', async () => {
  const target = new EventTarget()
  const options = { capture: true }
  let calls = 0
  const lifecycle = createLifecycle({
    onStart: scope => scope.listen(target, 'event', () => { calls++ }, options),
  })
  await lifecycle.start()
  target.dispatchEvent(new Event('event'))
  assert.equal(calls, 1)
  options.capture = false
  await lifecycle.stop()
  target.dispatchEvent(new Event('event'))
  assert.equal(calls, 1)
})

test('AsyncLifecycle & example classes coverage: getters, awaiters, prototype methods', async () => {
  class FullLifecycle extends AsyncLifecycle {

    public cond!: LifecycleConditionHandle
    public constructor () {
      super()
    }

    protected override onStart (scope: LifecycleScope): void {
      this.cond = this.condition('test-cond')
      scope.defer(() => {})
    }

  }

  const instance = new FullLifecycle()
  assert.equal(instance.isStopped, true)
  assert.equal(instance.isStarting, false)
  assert.equal(instance.isStopping, false)
  assert.equal(instance.isFailed, false)
  assert.equal(instance.isRunning, false)
  assert.equal(instance.isActive, false)

  await instance.whenStopped()

  // Directly exercise prototype accessors on AsyncLifecycle.prototype
  const proto = AsyncLifecycle.prototype as any
  const descState = Object.getOwnPropertyDescriptor(proto, 'state')!
  const descRunning = Object.getOwnPropertyDescriptor(proto, 'isRunning')!
  const descActive = Object.getOwnPropertyDescriptor(proto, 'isActive')!
  const descStarting = Object.getOwnPropertyDescriptor(proto, 'isStarting')!
  const descStopping = Object.getOwnPropertyDescriptor(proto, 'isStopping')!
  const descStopped = Object.getOwnPropertyDescriptor(proto, 'isStopped')!
  const descFailed = Object.getOwnPropertyDescriptor(proto, 'isFailed')!

  assert.equal(descState.get!.call(instance).kind, 'stopped')
  assert.equal(descRunning.get!.call(instance), false)
  assert.equal(descActive.get!.call(instance), false)
  assert.equal(descStarting.get!.call(instance), false)
  assert.equal(descStopping.get!.call(instance), false)
  assert.equal(descStopped.get!.call(instance), true)
  assert.equal(descFailed.get!.call(instance), false)

  await proto.whenStopped.call(instance)

  const startPromise = proto.start.call(instance)
  await instance.whenRunning()
  await startPromise

  assert.equal(descRunning.get!.call(instance), true)
  assert.equal(descActive.get!.call(instance), true)
  assert.equal(descStopped.get!.call(instance), false)

  await proto.whenRunning.call(instance)
  const opRes = await proto.operation.call(instance, async () => 123)
  assert.equal(opRes, 123)

  const whenStateRes = await proto.whenState.call(instance, (s: any) => s.kind === 'running')
  assert.equal(whenStateRes.kind, 'running')

  await proto.restart.call(instance)
  assert.equal(instance.isRunning, true)

  await proto.stop.call(instance)
  assert.equal(instance.isStopped, true)

  // Subclass override test
  class OverrideLifecycleProto extends AsyncLifecycle {

    public constructor () {
      super()
    }

    public [CANONICAL_LIFECYCLE] () {}
    protected override onStart (): void {}

  }
  assert.throws(() => new OverrideLifecycleProto(), LifecycleOverrideError)

  class OverrideLifecycleField extends AsyncLifecycle {

    public [CANONICAL_LIFECYCLE]: any = {}
    public constructor () {
      super()
    }

    protected override onStart (): void {}

  }
  assert.throws(() => new OverrideLifecycleField(), TypeError)

  // Minimal subclass covering default onStop / onStateChange
  class MinimalAsync extends AsyncLifecycle {

    public constructor () {
      super()
    }

    protected override onStart (): void {}

  }
  const min = new MinimalAsync()
  await min.start()
  await min.stop()

  // PuppetMock coverage
  const puppet = new PuppetMock()
  assert.equal(puppet.isLoggedIn, false)
  await exerciseDelegatedLifecycle(puppet)

  // Wechaty coverage
  const wechaty = new Wechaty(new PuppetMock())
  assert.equal(wechaty.isLoggedIn, false)
  await exerciseDelegatedLifecycle(wechaty)
})

async function exerciseDelegatedLifecycle (target: Lifecycle): Promise<void> {
  assert.equal(target.state.kind, 'stopped')
  assert.equal(target.isStopped, true)
  assert.equal(target.isRunning, false)
  assert.equal(target.isActive, false)
  assert.equal(target.isStarting, false)
  assert.equal(target.isStopping, false)
  assert.equal(target.isFailed, false)

  await target.whenStopped()
  const startP = target.start()
  await target.whenRunning()
  await startP

  assert.equal(target.state.kind, 'running')
  assert.equal(target.isRunning, true)
  assert.equal(target.isActive, true)
  assert.equal(target.isStopped, false)

  const snapshot = await target.whenState(s => s.kind === 'running')
  assert.equal(snapshot.kind, 'running')

  await target.restart()
  assert.equal(target.isRunning, true)

  await target[Symbol.asyncDispose]()
  assert.equal(target.isStopped, true)
}

test('LifecycleScope.isSealed flips synchronously on stop, restart, recover, and fail', async () => {
  const scopes: LifecycleScope[] = []
  const lc = createLifecycle({
    onStart: scope => {
      scopes.push(scope)
    },
  })

  await lc.start()
  const s1 = scopes[0]!
  assert.equal(s1.isSealed, false)

  // stop() seals synchronously before signal.aborted flips
  const stopP = lc.stop()
  assert.equal(s1.isSealed, true)
  await stopP

  // recover() seals synchronously
  await lc.start()
  const s2 = scopes[1]!
  assert.equal(s2.isSealed, false)
  s2.recover('test recover')
  assert.equal(s2.isSealed, true)
  await lc.whenState(s => s.kind === 'running' && s.generation > s2.generation)

  // fail() seals synchronously
  const s3 = scopes[2]!
  assert.equal(s3.isSealed, false)
  s3.fail(new Error('boom'))
  assert.equal(s3.isSealed, true)
  await lc.whenState(s => s.kind === 'failed')
})

async function flushTurns (count = 10): Promise<void> {
  for (let i = 0; i < count; i++) {
    await Promise.resolve()
  }
}
