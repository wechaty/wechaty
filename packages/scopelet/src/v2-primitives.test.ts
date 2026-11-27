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
import { sleep } from './clock.ts'
import { createLifecycle } from './create-lifecycle.ts'
import {
  LifecycleOverrideError,
  LifecycleUnsafeStateError,
} from './errors.ts'
import type { Lifecycle, LifecycleScope } from './types.ts'

test('ADR-01: createLifecycle.attach() decorates target instance with full Lifecycle API', async () => {
  class Service {

    public log: string[] = []

    constructor () {
      createLifecycle.attach(this, {
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

  // Can run operation directly on target
  const opResult = await service.operation(async signal => {
    assert.equal(signal.aborted, false)
    return 42
  })
  assert.equal(opResult, 42)

  await service.stop()
  assert.equal(state().kind, 'stopped')
  assert.equal(service.isStopped, true)
  assert.equal(service.isRunning, false)
  assert.deepEqual(service.log, ['started', 'stopped'])
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

test('ADR-02: Self-sovereign condition handles support set(), clear(), when(), and whenClear()', async () => {
  let innerScope!: LifecycleScope
  const lifecycle = createLifecycle({
    onStart: scope => {
      innerScope = scope
    },
  })

  const readyCondition = lifecycle.condition('ready')
  assert.equal(readyCondition.name, 'ready')
  assert.equal(readyCondition.isSet, false)

  await lifecycle.start()

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

  // Scoped condition handle
  const scopedLogin = innerScope.condition('login')
  assert.equal(scopedLogin.name, 'login')
  assert.equal(scopedLogin.isSet, false)

  scopedLogin.set()
  assert.equal(scopedLogin.isSet, true)

  scopedLogin.clear()
  assert.equal(scopedLogin.isSet, false)

  await lifecycle.stop()
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

test('ADR-04: scope.sleep() resolves and aborts gracefully with signal', async () => {
  let sleepCompleted = false
  let sleepAborted = false
  let innerScope!: LifecycleScope

  const lifecycle = createLifecycle({
    onStart: async scope => {
      innerScope = scope
      // Short sleep completes
      await scope.sleep(10)
      sleepCompleted = true
    },
  })

  await lifecycle.start()
  assert.equal(sleepCompleted, true)

  const sleepPromise = innerScope.sleep(10_000).catch(() => {
    sleepAborted = true
  })
  await lifecycle.stop()
  await sleepPromise
  assert.equal(sleepAborted, true)
  assert.equal(lifecycle.isStopped, true)
})

test('ADR-04: exported sleep() helper works standalone', async () => {
  const start = Date.now()
  await sleep(15)
  const elapsed = Date.now() - start
  assert.ok(elapsed >= 10, `expected elapsed >= 10, got ${elapsed}`)

  const ac = new AbortController()
  const p = sleep(5000, ac.signal)
  ac.abort(new Error('aborted sleep'))
  await assert.rejects(p, /aborted sleep/)
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

async function flushTurns (count = 10): Promise<void> {
  for (let i = 0; i < count; i++) {
    await Promise.resolve()
  }
}
