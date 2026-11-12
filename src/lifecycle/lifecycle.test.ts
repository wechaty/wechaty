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
 * Acceptance tests for the generic async {@link LifecycleController}.
 *
 * Several cases are the *inverse* of the `state-switch` defects reproduced in
 * RFC wechaty/wechaty#2905 §3.8 (cases A–F): where the old controller misbehaved,
 * the new one must behave correctly. Tests use deferred promises only (no real
 * puppet, timers, or network) so they are deterministic and portable across
 * Node.js and Deno via node:test / node:assert.
 */

import { test } from 'node:test'
import assert   from 'node:assert/strict'

import { LifecycleController }        from './lifecycle.ts'
import type { LifecycleHooks }        from './lifecycle-hooks.ts'
import {
  LifecycleStartError,
  LifecycleStopError,
  LifecycleSupersededError,
}                                     from './lifecycle-errors.ts'

/** A controllable hooks double exposing deferred start/stop + call counts. */
function makeHooks () {
  let resolveStart: (() => void) | undefined
  let rejectStart: ((e: unknown) => void) | undefined
  let resolveStop: (() => void) | undefined
  let rejectStop: ((e: unknown) => void) | undefined

  const counts = { start: 0, stop: 0 }
  const signals: AbortSignal[] = []

  const hooks: LifecycleHooks = {
    start ({ signal }) {
      counts.start += 1
      signals.push(signal)
      return new Promise<void>((resolve, reject) => {
        resolveStart = resolve
        rejectStart = reject
      })
    },
    stop () {
      counts.stop += 1
      return new Promise<void>((resolve, reject) => {
        resolveStop = resolve
        rejectStop = reject
      })
    },
  }

  return {
    counts,
    hooks,
    rejectStart: (e: unknown) => rejectStart!(e),
    rejectStop:  (e: unknown) => rejectStop!(e),
    resolveStart: () => resolveStart!(),
    resolveStop:  () => resolveStop!(),
    signals,
  }
}

/** Flush the microtask queue so reconciliation can advance. */
const tick = () => new Promise<void>(resolve => setImmediate(resolve))

test('start() resolves only after the start hook completes (observed truth)', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const started = lifecycle.start()
  await tick()

  assert.equal(lifecycle.state.kind, 'starting', 'should be starting while hook pending')
  assert.equal(h.counts.start, 1)

  h.resolveStart()
  await started

  assert.equal(lifecycle.state.kind, 'running', 'running only after hook resolved')
})

test('duplicate concurrent start() calls share a single attempt (single-flight)', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const a = lifecycle.start()
  const b = lifecycle.start()
  await tick()

  assert.equal(h.counts.start, 1, 'only one start hook invocation for coalesced requests')

  h.resolveStart()
  await Promise.all([ a, b ])
  assert.equal(lifecycle.state.kind, 'running')
})

test('idempotent start() when already running resolves without a new attempt', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const first = lifecycle.start()
  await tick()
  h.resolveStart()
  await first

  await lifecycle.start()
  assert.equal(h.counts.start, 1, 'no extra start hook for already-running service')
})

test('Case D inverse: start hook failure rejects start() with/without listeners', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const started = lifecycle.start()
  await tick()

  const boom = new Error('puppet start failed')
  h.rejectStart(boom)
  // rollback stop() must complete for a clean failed state
  await tick()
  h.resolveStop()

  await assert.rejects(started, (e: unknown) => {
    assert.ok(e instanceof LifecycleStartError)
    assert.equal(e.startError, boom)
    assert.equal(e.cleanupComplete, true)
    return true
  })

  assert.equal(lifecycle.state.kind, 'failed', 'failed, never stuck pending')
})

test('Case D inverse: after failure the instance is recoverable (no permanent pending)', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const first = lifecycle.start()
  await tick()
  h.rejectStart(new Error('first failure'))
  await tick()
  h.resolveStop()
  await assert.rejects(first)

  // Second start must settle, not hang forever (the old StateSwitch defect).
  const second = lifecycle.start()
  await tick()
  h.resolveStart()
  await second
  assert.equal(lifecycle.state.kind, 'running')
})

test('Case E inverse: whenState(running) rejects on terminal failure instead of hanging', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const waitRunning = lifecycle.whenState(s => s.kind === 'running')
  const started = lifecycle.start()
  await tick()

  h.rejectStart(new Error('startup error'))
  await tick()
  h.resolveStop()

  await assert.rejects(started, (e: unknown) => e instanceof LifecycleStartError)
  await assert.rejects(waitRunning, (e: unknown) => e instanceof LifecycleStartError)
})

test('failed.cleanupComplete is false when rollback cleanup itself fails', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const started = lifecycle.start()
  await tick()
  h.rejectStart(new Error('start failed'))
  await tick()
  h.rejectStop(new Error('cleanup failed'))

  await assert.rejects(started, (e: unknown) => {
    assert.ok(e instanceof LifecycleStartError)
    assert.equal(e.cleanupComplete, false)
    return true
  })

  const state = lifecycle.state
  assert.equal(state.kind, 'failed')
  assert.equal(state.kind === 'failed' && state.cleanupComplete, false)
})

test('Case C inverse: stop() during a pending start aborts it; no late running on a stopped service', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const started = lifecycle.start()
  // Attach the rejection expectation before yielding so the superseded start's
  // rejection is observed (it settles on a microtask once stop() supersedes it).
  const startedRejected = assert.rejects(started, (e: unknown) => e instanceof LifecycleSupersededError)
  await tick()
  assert.equal(h.signals[0]?.aborted, false)

  const stopped = lifecycle.stop()
  await tick()

  // The in-flight start's signal must be aborted (cooperative cancellation).
  assert.equal(h.signals[0]?.aborted, true, 'start signal aborted on supersession')

  await startedRejected

  // A late start-hook completion must NOT publish running on a stopping service.
  h.resolveStart()
  await tick()
  assert.notEqual(lifecycle.state.kind, 'running')

  h.resolveStop()
  await stopped
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('Case B inverse: a later stop() wins over an older start intent (intent authority)', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const started = lifecycle.start()
  const startedRejected = assert.rejects(started, (e: unknown) => e instanceof LifecycleSupersededError)
  await tick()

  const stopped = lifecycle.stop()
  await tick()
  await startedRejected

  h.resolveStart() // late completion of the superseded start
  await tick()
  h.resolveStop()
  await stopped

  assert.equal(lifecycle.state.kind, 'stopped', 'service stays stopped, not restarted')
})

test('stop() rejects with LifecycleStopError when cleanup fails (never fake stopped)', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const started = lifecycle.start()
  await tick()
  h.resolveStart()
  await started

  const stopped = lifecycle.stop()
  await tick()
  h.rejectStop(new Error('cannot release socket'))

  await assert.rejects(stopped, (e: unknown) => e instanceof LifecycleStopError)
  assert.equal(lifecycle.state.kind, 'failed', 'failure, not a false stopped')
})

test('whenState() caller abort cancels only that wait, not service intent', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const controller = new AbortController()
  const waited = lifecycle.whenState(s => s.kind === 'running', { signal: controller.signal })

  const started = lifecycle.start()
  await tick()

  controller.abort()
  await assert.rejects(waited, (e: unknown) => (e as Error)?.name === 'AbortError')

  // Service intent is unaffected: start still completes.
  h.resolveStart()
  await started
  assert.equal(lifecycle.state.kind, 'running')
})

test('start() with an already-aborted signal rejects without changing intent', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const controller = new AbortController()
  controller.abort()

  await assert.rejects(
    lifecycle.start({ signal: controller.signal }),
    (e: unknown) => (e as Error)?.name === 'AbortError',
  )
  assert.equal(h.counts.start, 0, 'no start attempt for an already-aborted request')
  assert.equal(lifecycle.state.kind, 'stopped')
})

test('restart() performs a stop then start cycle', async () => {
  const h = makeHooks()
  const lifecycle = new LifecycleController(h.hooks)

  const started = lifecycle.start()
  await tick()
  h.resolveStart()
  await started

  const restarted = lifecycle.restart()
  await tick()
  h.resolveStop()
  await tick()
  h.resolveStart()
  await restarted

  assert.equal(lifecycle.state.kind, 'running')
  assert.equal(h.counts.stop >= 1, true)
  assert.equal(h.counts.start, 2)
})
