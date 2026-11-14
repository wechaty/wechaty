#!/usr/bin/env -S node --import=tsx/esm
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
 * Behavioural contract tests for the async lifecycle module.
 *
 * These tests encode the original design discussion cases from
 * wechaty/wechaty#2905 §3.8 (the pitfalls A–F, asserted as the inverse: the
 * kernel must *not* exhibit the footgun) and the §9 acceptance traces listed in
 * wechaty/wechaty#2911. They run under both Node.js and Deno via `node:test`
 * and `node:assert/strict`, with no third-party runtime dependency.
 */

import assert from 'node:assert/strict'
import {
  test,
}           from 'node:test'

import {
  AsyncLifecycle,
  createLifecycle,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}           from './mod.ts'
import type {
  LifecycleScope,
  LifecycleState,
}           from './mod.ts'

/**
 * A tiny promise that settles on the next macrotask, used to let the
 * microtask-driven reconciler drain between synchronous assertions.
 */
function tick (ms = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * A manually-releasable promise, for freezing a hook mid-flight.
 */
function gate (): { promise: Promise<void>; open: () => void } {
  let open!: () => void
  const promise = new Promise<void>(resolve => { open = resolve })
  return { promise, open }
}

// =========================================================================
// Happy path and basic shape
// =========================================================================

test('start → running → stop → stopped with generation increments', async () => {
  const events: string[] = []
  const lc = createLifecycle({
    onStart       : () => { events.push('onStart') },
    onStop        : () => { events.push('onStop') },
    onStateChange : s => events.push('state:' + s.kind),
  })

  assert.equal(lc.state.kind, 'stopped')
  assert.equal(lc.state.generation, 0)

  await lc.start()
  {
    const s = lc.state
    assert.equal(s.kind, 'running')
    assert.equal(s.generation, 1)
  }

  await lc.stop()
  {
    const s = lc.state
    assert.equal(s.kind, 'stopped')
    assert.equal(s.generation, 1)
  }

  assert.deepEqual(events, [
    'state:starting',
    'onStart',
    'state:running',
    'state:stopping',
    'onStop',
    'state:stopped',
  ])
})

test('restart retires the old generation and starts a fresh one', async () => {
  let starts = 0
  const lc = createLifecycle({ onStart: () => { starts += 1 } })

  await lc.start()
  assert.equal(lc.state.generation, 1)

  await lc.restart()
  assert.equal(lc.state.kind, 'running')
  // gen1 is retired by restart; gen2 is the replacement run.
  assert.equal(lc.state.generation, 2)
  assert.equal(starts, 2)

  await lc.stop()
})

test('restart from stopped behaves like start', async () => {
  const lc = createLifecycle({ onStart: () => {} })
  await lc.restart()
  assert.equal(lc.state.kind, 'running')
  await lc.stop()
})

// =========================================================================
// §3.8 A (inverted): no double-start — concurrent starts share one attempt
// =========================================================================

test('§3.8-A concurrent equivalent start()s share one onStart', async () => {
  let starts = 0
  const lc = createLifecycle({ onStart: () => { starts += 1 } })

  await Promise.all([ lc.start(), lc.start(), lc.start() ])
  assert.equal(starts, 1, 'onStart runs exactly once for concurrent starts')
  assert.equal(lc.state.kind, 'running')

  await lc.stop()
})

test('§3.8-A start() while already running resolves without a new generation', async () => {
  let starts = 0
  const lc = createLifecycle({ onStart: () => { starts += 1 } })
  await lc.start()
  await lc.start()
  assert.equal(starts, 1)
  assert.equal(lc.state.generation, 1)
  await lc.stop()
})

// =========================================================================
// §3.8 B (inverted): a caller abort never stops the shared service
// =========================================================================

test('§3.8-B aborting one caller does not revoke accepted intent', async () => {
  const g = gate()
  const lc = createLifecycle({ onStart: () => g.promise })

  const ac = new AbortController()
  const aborted = lc.start({ signal: ac.signal })
  const patient = lc.start()

  ac.abort(new Error('caller gone'))
  await assert.rejects(aborted, /caller gone/)

  // The service still starts for the patient caller.
  g.open()
  await patient
  assert.equal(lc.state.kind, 'running')

  await lc.stop()
})

test('§3.8-B an already-aborted signal rejects before accepting intent', async () => {
  const lc = createLifecycle({ onStart: () => {} })
  const ac = new AbortController()
  ac.abort(new Error('pre-aborted'))
  await assert.rejects(lc.start({ signal: ac.signal }), /pre-aborted/)
  assert.equal(lc.state.kind, 'stopped', 'intent was never accepted')
})

// =========================================================================
// §3.8 C (inverted): stop supersedes a pending start permanently
// =========================================================================

test('§3.8-C stop() supersedes a pending start and wins', async () => {
  const g = gate()
  const lc = createLifecycle({ onStart: () => g.promise })

  const startP = lc.start()
  const startRejection = assert.rejects(startP, LifecycleSupersededError)
  await tick()

  const stopP = lc.stop()
  g.open() // let the frozen onStart finally settle
  await stopP
  await startRejection

  assert.equal(lc.state.kind, 'stopped')
})

// =========================================================================
// §3.8 D (inverted): a failed attempt ends — no implicit auto-retry loop
// =========================================================================

test('§3.8-D a failed start does not auto-retry', async () => {
  let attempts = 0
  const lc = createLifecycle({
    onStart: () => { attempts += 1; throw new Error('boom') },
  })

  await assert.rejects(lc.start(), /boom/)
  const state = lc.state
  assert.equal(state.kind, 'failed')
  assert.equal(state.kind === 'failed' && state.phase, 'start')

  // Give the reconciler ample time to (wrongly) loop.
  await tick(30)
  assert.equal(attempts, 1, 'onStart is not retried on its own')
  assert.equal(lc.state.kind, 'failed')
})

test('§3.8-D a start failure publishes failed { phase: start }', async () => {
  const lc = createLifecycle({ onStart: () => { throw new Error('x') } })
  await assert.rejects(lc.start())
  const s = lc.state
  assert.equal(s.kind, 'failed')
  if (s.kind === 'failed') {
    assert.equal(s.phase, 'start')
    assert.equal((s.error as Error).message, 'x')
    assert.equal(s.cleanupComplete, true, 'clean failure with no live resources')
  }
})

// =========================================================================
// §3.8 E (inverted): failed never means safely stopped; a dirty failure
// blocks a new generation until stop() finishes cleanup
// =========================================================================

test('§3.8-E a dirty stop failure is not treated as stopped', async () => {
  const lc = createLifecycle({
    onStart : scope => {
      scope.defer(() => { throw new Error('cleanup failed') })
    },
    onStop  : () => { throw new Error('goodbye failed') },
  })

  await lc.start()
  await assert.rejects(lc.stop(), /goodbye failed|cleanup failed/)

  const s = lc.state
  assert.equal(s.kind, 'failed')
  if (s.kind === 'failed') {
    assert.equal(s.phase, 'stop')
    assert.equal(s.cleanupComplete, false, 'cleanup did not finish')
  }
})

test('§3.8-E a dirty failure blocks start until stop() retries cleanup', async () => {
  let starts = 0
  let failStop = true
  const lc = createLifecycle({
    onStart : () => { starts += 1 },
    onStop  : () => { if (failStop) { failStop = false; throw new Error('dirty') } },
  })
  await lc.start()
  await assert.rejects(lc.stop(), /dirty/)
  {
    const s = lc.state
    assert.equal(s.kind, 'failed')
    assert.equal(s.kind === 'failed' && s.cleanupComplete, false)
  }

  // stop() retries the remaining cleanup, clearing the dirty failure.
  await lc.stop()
  assert.equal(lc.state.kind, 'stopped')

  // Now a start is allowed again.
  await lc.start()
  assert.equal(lc.state.kind, 'running')
  assert.equal(starts, 2)
  await lc.stop()
})

// =========================================================================
// §3.8 F (inverted): resources release in reverse order, every disposer runs
// =========================================================================

test('§3.8-F resources release in reverse (LIFO) order', async () => {
  const order: string[] = []
  const lc = createLifecycle({
    onStart: scope => {
      scope.defer(() => { order.push('one') })
      scope.defer(() => { order.push('two') })
      scope.defer(() => { order.push('three') })
    },
  })
  await lc.start()
  await lc.stop()
  assert.deepEqual(order, [ 'three', 'two', 'one' ])
})

test('§3.8-F every disposer runs even when one throws; errors aggregate', async () => {
  const ran: string[] = []
  const lc = createLifecycle({
    onStart: scope => {
      scope.defer(() => { ran.push('a') })
      scope.defer(() => { ran.push('b'); throw new Error('b-failed') })
      scope.defer(() => { ran.push('c') })
    },
  })
  await lc.start()
  await assert.rejects(lc.stop(), /b-failed/)
  assert.deepEqual(ran, [ 'c', 'b', 'a' ], 'all disposers ran despite the throw')
})

test('§3.8-F use() disposes AsyncDisposable and Disposable resources', async () => {
  const closed: string[] = []
  const asyncRes = { [Symbol.asyncDispose]: async () => { closed.push('async') } }
  const syncRes = { [Symbol.dispose]: () => { closed.push('sync') } }

  const lc = createLifecycle({
    onStart: scope => {
      scope.use(asyncRes)
      scope.use(syncRes)
    },
  })
  await lc.start()
  await lc.stop()
  assert.deepEqual(closed, [ 'sync', 'async' ], 'reverse order, both kinds disposed')
})

// =========================================================================
// Conditions (generation-bound "await ready")
// =========================================================================

test('condition.wait() before start binds to the next generation', async () => {
  const lc = createLifecycle({ onStart: scope => { scope.set(ready) } })
  const ready = lc.condition('ready')
  const waited = ready.wait()
  await lc.start()
  await waited // resolves
  await lc.stop()
})

test('condition rejects if its generation retires without setting it', async () => {
  const g = gate()
  const lc = createLifecycle({ onStart: () => g.promise })
  const ready = lc.condition('ready')
  const waited = ready.wait()
  const rejection = assert.rejects(waited, LifecycleSupersededError)

  // Do not await the gated start; it will be superseded by the stop below.
  const startRejection = assert.rejects(lc.start(), LifecycleSupersededError)
  await tick()
  // stop() cannot settle until onStart unblocks (the worker is parked inside
  // #runStart awaiting the gate), so request the stop and open the gate before
  // awaiting it; retirement then supersedes the pending start and the condition.
  const stopped = lc.stop()
  g.open()
  await stopped
  await rejection
  await startRejection
})

test('a condition resolution does not cross generations', async () => {
  let setCount = 0
  const lc = createLifecycle({
    onStart: scope => { setCount += 1; if (setCount === 1) { scope.set(ready) } },
  })
  const ready = lc.condition('ready')

  // Bind the wait to gen1 before start; gen1 sets ready during onStart.
  const gen1Ready = ready.wait()
  await lc.start()
  await gen1Ready // resolved by gen1

  await lc.restart() // gen2 does NOT set ready

  // A fresh wait binds to the running gen2, which never sets ready.
  const ac = new AbortController()
  const pending = ready.wait({ signal: ac.signal })
  const rejection = assert.rejects(pending, /give up/)
  ac.abort(new Error('give up'))
  await rejection

  await lc.stop()
})

// =========================================================================
// whenState (condition observation across generations)
// =========================================================================

test('whenState resolves immediately when the predicate already matches', async () => {
  const lc = createLifecycle({ onStart: () => {} })
  const s = await lc.whenState(state => state.kind === 'stopped')
  assert.equal(s.kind, 'stopped')
})

test('whenState resolves on the first matching future snapshot', async () => {
  const lc = createLifecycle({ onStart: () => {} })
  const running = lc.whenState(s => s.kind === 'running')
  await lc.start()
  const s = await running
  assert.equal(s.kind, 'running')
  await lc.stop()
})

test('whenState rejects when its predicate throws', async () => {
  const lc = createLifecycle({ onStart: () => {} })
  await assert.rejects(
    lc.whenState(() => { throw new Error('bad predicate') }),
    /bad predicate/,
  )
})

test('whenState rejects on caller abort without affecting the service', async () => {
  const lc = createLifecycle({ onStart: () => {} })
  const ac = new AbortController()
  const pending = lc.whenState(s => s.kind === 'running', { signal: ac.signal })
  ac.abort(new Error('abort wait'))
  await assert.rejects(pending, /abort wait/)
})

// =========================================================================
// scope.fail → failed { phase: run }
// =========================================================================

test('scope.fail on a running generation yields failed { phase: run }', async () => {
  let failer!: (error: unknown) => void
  const lc = createLifecycle({
    onStart: scope => { failer = error => scope.fail(error) },
  })
  await lc.start()
  failer(new Error('watchdog'))
  await lc.whenState(s => s.kind === 'failed')

  const s = lc.state
  assert.equal(s.kind, 'failed')
  if (s.kind === 'failed') {
    assert.equal(s.phase, 'run')
    assert.equal((s.error as Error).message, 'watchdog')
  }
})

test('a run failure does not auto-retry', async () => {
  let starts = 0
  let failer!: (error: unknown) => void
  const lc = createLifecycle({
    onStart: scope => { starts += 1; failer = error => scope.fail(error) },
  })
  await lc.start()
  failer(new Error('down'))
  await lc.whenState(s => s.kind === 'failed')
  await tick(30)
  assert.equal(starts, 1, 'no implicit restart after a run failure')
})

// =========================================================================
// spawn (owned background task)
// =========================================================================

test('spawn task receives an abort signal that fires on retirement', async () => {
  let sawAbort = false
  const lc = createLifecycle({
    onStart: scope => {
      scope.spawn(async signal => {
        await new Promise<void>(resolve => {
          signal.addEventListener('abort', () => { sawAbort = true; resolve() }, { once: true })
        })
      })
    },
  })
  await lc.start()
  await lc.stop()
  assert.equal(sawAbort, true, 'the task was signalled on retirement')
})

test('a spawned task rejection fails the running generation', async () => {
  const lc = createLifecycle({
    onStart: scope => {
      // Yield before throwing so the failure lands while running, not starting.
      scope.spawn(async () => { await tick(); throw new Error('task died') })
    },
  })
  await lc.start()
  await lc.whenState(s => s.kind === 'failed')
  const s = lc.state
  assert.equal(s.kind, 'failed')
  assert.equal(s.kind === 'failed' && s.phase, 'run')
})

// =========================================================================
// child lifecycles (scope.start)
// =========================================================================

test('scope.start owns a child and stops it on parent retirement', async () => {
  const child = createLifecycle({ onStart: () => {} })
  const parent = createLifecycle({
    onStart: async scope => { await scope.start(child) },
  })

  await parent.start()
  assert.equal(child.state.kind, 'running')

  await parent.stop()
  assert.equal(child.state.kind, 'stopped', 'child stopped with the parent')
})

test('scope.start refuses a child that is not in a safe state', async () => {
  const child = createLifecycle({ onStart: () => {} })
  await child.start() // child is now running — unsafe to re-own

  const parent = createLifecycle({
    onStart: async scope => { await scope.start(child) },
  })
  await assert.rejects(parent.start(), LifecycleUnsafeStateError)

  await child.stop()
})

test('a child failing out of running fails the parent', async () => {
  let childFailer!: (error: unknown) => void
  const child = createLifecycle({
    onStart: scope => { childFailer = error => scope.fail(error) },
  })
  const parent = createLifecycle({
    onStart: async scope => { await scope.start(child) },
  })
  await parent.start()
  childFailer(new Error('child down'))
  await parent.whenState(s => s.kind === 'failed')

  const s = parent.state
  assert.equal(s.kind, 'failed')
  assert.equal(s.kind === 'failed' && s.phase, 'run')
})

// =========================================================================
// timeouts
// =========================================================================

test('startTimeoutMs fails the attempt with LifecycleTimeoutError', async () => {
  const g = gate()
  const lc = createLifecycle(
    { onStart: () => g.promise },
    { startTimeoutMs: 10 },
  )
  await assert.rejects(lc.start(), LifecycleTimeoutError)
  g.open()
  assert.equal(lc.state.kind, 'failed')
  assert.equal(lc.state.kind === 'failed' && lc.state.phase, 'start')
})

test('startTimeoutMs aborts the scope signal', async () => {
  let aborted = false
  const g = gate()
  const lc = createLifecycle(
    {
      onStart: scope => {
        scope.signal.addEventListener('abort', () => { aborted = true }, { once: true })
        return g.promise
      },
    },
    { startTimeoutMs: 10 },
  )
  await assert.rejects(lc.start(), LifecycleTimeoutError)
  assert.equal(aborted, true)
  g.open()
})

// =========================================================================
// recover (authority-checked recovery)
// =========================================================================

test('recover restarts a cleanly failed lifecycle and reports recovered', async () => {
  let fail = true
  const lc = createLifecycle({
    onStart: () => { if (fail) { fail = false; throw new Error('first boom') } },
  })
  await assert.rejects(lc.start(), /first boom/)
  const observed = lc.state
  assert.equal(observed.kind, 'failed')

  const result = await lc.recover(observed)
  assert.equal(result, 'recovered')
  assert.equal(lc.state.kind, 'running')
  await lc.stop()
})

test('recover against a stale snapshot reports superseded', async () => {
  const lc = createLifecycle({ onStart: () => { throw new Error('boom') } })
  await assert.rejects(lc.start(), /boom/)
  const stale = lc.state

  // A user command bumps the intent revision, invalidating the observation.
  const startP = lc.start().catch(() => {})
  const result = await lc.recover(stale)
  assert.equal(result, 'superseded')
  await startP
})

// =========================================================================
// AsyncLifecycle (inheritance entry point)
// =========================================================================

test('AsyncLifecycle subclass start/stop drive onStart/onStop', async () => {
  const events: string[] = []
  class Service extends AsyncLifecycle {

    constructor () { super({ name: 'svc' }) }
    protected override onStart (_scope: LifecycleScope): void { events.push('onStart') }
    protected override onStop (_scope: LifecycleScope): void { events.push('onStop') }

  }

  const svc = new Service()
  await svc.start()
  assert.equal(svc.state.kind, 'running')
  await svc.stop()
  assert.equal(svc.state.kind, 'stopped')
  assert.deepEqual(events, [ 'onStart', 'onStop' ])
})

test('AsyncLifecycle throws if a subclass overrides a sealed caller member', () => {
  class Bad extends AsyncLifecycle {

    constructor () { super() }
    protected override onStart (): void {}
    // Illegal override of the sealed caller API.
    override start (): Promise<void> { return Promise.resolve() }

  }
  assert.throws(() => new Bad(), /must not override 'start\(\)'/)
})

test('AsyncLifecycle supports await using via Symbol.asyncDispose', async () => {
  let stopped = false
  class Service extends AsyncLifecycle {

    constructor () { super() }
    protected override onStart (): void {}
    protected override onStop (): void { stopped = true }

  }
  {
    await using svc = new Service()
    await svc.start()
    assert.equal(svc.state.kind, 'running')
  }
  assert.equal(stopped, true, 'asyncDispose stopped the service')
})

// =========================================================================
// §9 acceptance: state snapshots are frozen value objects
// =========================================================================

test('state snapshots are frozen', async () => {
  const lc = createLifecycle({ onStart: () => {} })
  assert.equal(Object.isFrozen(lc.state), true)
  await lc.start()
  assert.equal(Object.isFrozen(lc.state), true)
  await lc.stop()
})

test('onStateChange observer exceptions are isolated', async () => {
  const lc = createLifecycle({
    onStart       : () => {},
    onStateChange : () => { throw new Error('observer blew up') },
  })
  // Must not reject despite the throwing observer.
  await lc.start()
  assert.equal(lc.state.kind, 'running')
  await lc.stop()
})

// =========================================================================
// Collected types smoke: LifecycleState narrowing compiles and runs
// =========================================================================

test('failed snapshot carries phase/error/cleanup fields', async () => {
  const lc = createLifecycle({ onStart: () => { throw new Error('nope') } })
  await assert.rejects(lc.start())
  const s: LifecycleState = lc.state
  if (s.kind === 'failed') {
    assert.equal(typeof s.phase, 'string')
    assert.equal(typeof s.cleanupComplete, 'boolean')
  } else {
    assert.fail('expected failed state')
  }
})
