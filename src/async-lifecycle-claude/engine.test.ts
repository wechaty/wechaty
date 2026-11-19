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
 * The lifecycle contract suite (wechaty/wechaty#2911 v1 design §4 and §6, and
 * the #2905 §3.8 cases A–F inverted). Every trace runs through both entry points
 * (`createLifecycle` and `AsyncLifecycle`), so the two shells are proven to share
 * one engine. Traces use gates (deferred promises), {@link flush} and a
 * {@link ManualClock}; nothing waits for real time.
 *
 * Tests named after a review finding pin the fix for that finding.
 */

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'

import { AsyncLifecycle } from './async-lifecycle.ts'
import { listen } from './companions/listen.ts'
import { createLifecycle } from './create-lifecycle.ts'
import {
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}                           from './errors.ts'
import { flush, ManualClock } from './testing.ts'
import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
  LifecycleStop,
}                           from './types.ts'

interface Subject {
  readonly lifecycle: Lifecycle
  condition (name: string): LifecycleCondition
}

type Make = (hooks: LifecycleHooks, options?: LifecycleOptions) => Subject

const SHELLS: ReadonlyArray<readonly [ string, Make ]> = [
  [ 'createLifecycle', (hooks, options) => {
    const controller = createLifecycle(hooks, options)
    return { lifecycle: controller, condition: name => controller.condition(name) }
  } ],
  [ 'AsyncLifecycle', (hooks, options) => {
    class Probe extends AsyncLifecycle {

      constructor () { super(options) }
      protected override onStart (scope: LifecycleScope) { return hooks.onStart(scope) }
      protected override onStop (stop: LifecycleStop) { return hooks.onStop?.(stop) }
      protected override onStateChange (state: LifecycleState, previous: LifecycleState) {
        hooks.onStateChange?.(state, previous)
      }

      declare (name: string) { return this.condition(name) }

    }
    const probe = new Probe()
    return { lifecycle: probe, condition: name => probe.declare(name) }
  } ],
]

/** Record `kind:generation` for every committed snapshot. */
function recorder () {
  const kinds: string[] = []
  return {
    kinds,
    onStateChange: (state: LifecycleState) => { kinds.push(`${state.kind}:${state.generation}`) },
  }
}

/** Resolve-or-reject outcome of a promise, for asserting without awaiting twice. */
function outcome<T> (promise: Promise<T>): { settled: boolean, value?: T, error?: unknown, rejected: boolean } {
  const box: { settled: boolean, value?: T, error?: unknown, rejected: boolean } = { settled: false, rejected: false }
  promise.then(
    value => { box.settled = true; box.value = value },
    error => { box.settled = true; box.rejected = true; box.error = error },
  )
  return box
}

function failedState (state: LifecycleState) {
  assert.equal(state.kind, 'failed')
  return state as Extract<LifecycleState, { kind: 'failed' }>
}

for (const [ shell, make ] of SHELLS) {
  const t = (name: string, fn: () => Promise<void> | void) => test(`${shell}: ${name}`, fn)

  // ===========================================================================
  // Basic transitions
  // ===========================================================================

  t('start → running → stop → stopped, one generation per attempt', async () => {
    const rec = recorder()
    const generations: number[] = []
    const { lifecycle } = make({ onStart: scope => { generations.push(scope.generation) }, ...rec })

    await lifecycle.start()
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
    assert.ok(Object.isFrozen(lifecycle.state))
    await lifecycle.stop()
    await lifecycle.start()
    assert.deepEqual(generations, [ 1, 2 ])
    assert.deepEqual(rec.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'stopped:1', 'starting:2', 'running:2' ])
  })

  t('restart goes running → stopping → starting → running with reason restart', async () => {
    const rec = recorder()
    const reasons: string[] = []
    const { lifecycle } = make({ onStart: () => {}, onStop: stop => { reasons.push(stop.reason) }, ...rec })
    await lifecycle.start()
    await lifecycle.restart()
    assert.deepEqual(rec.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'starting:2', 'running:2' ])
    assert.deepEqual(reasons, [ 'restart' ])
  })

  t('restart from stopped behaves like start', async () => {
    const { lifecycle } = make({ onStart: () => {} })
    await lifecycle.restart()
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
  })

  t('start() while running resolves without a new generation (#2905 A)', async () => {
    let starts = 0
    const { lifecycle } = make({ onStart: () => { starts++ } })
    await lifecycle.start()
    await lifecycle.start()
    assert.equal(starts, 1)
    assert.equal(lifecycle.state.generation, 1)
  })

  t('#2905 A: stop() in flight, then two start()s: one onStart, never concurrent', async () => {
    let active = 0
    let maxActive = 0
    let starts = 0
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({
      onStart: async () => {
        starts++; active++; maxActive = Math.max(maxActive, active)
        await flush(5)
        active--
      },
      onStop: () => gate.promise,
    })
    await lifecycle.start()
    const stopping = lifecycle.stop()
    const a = lifecycle.start()
    const b = lifecycle.start()
    gate.resolve()
    await Promise.all([ stopping, a, b ])
    assert.equal(starts, 2)
    assert.equal(maxActive, 1)
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('a caller abort cancels only that wait, never the accepted intent', async () => {
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({ onStart: () => gate.promise })
    const controller = new AbortController()
    const mine = lifecycle.start({ signal: controller.signal })
    const theirs = lifecycle.start()
    controller.abort(new Error('mine only'))
    await assert.rejects(mine, /mine only/)
    gate.resolve()
    await theirs
    assert.equal(lifecycle.state.kind, 'running')
  })

  t('an already-aborted signal rejects before any intent is accepted', async () => {
    let starts = 0
    const subject = make({ onStart: () => { starts++ } })
    const signal = AbortSignal.abort(new Error('pre-aborted'))
    await assert.rejects(subject.lifecycle.start({ signal }), /pre-aborted/)
    await assert.rejects(subject.lifecycle.restart({ signal }), /pre-aborted/)
    await assert.rejects(subject.lifecycle.stop({ signal }), /pre-aborted/)
    await assert.rejects(subject.lifecycle.whenState(() => true, { signal }), /pre-aborted/)
    await assert.rejects(subject.condition('ready').wait({ signal }), /pre-aborted/)
    await flush()
    assert.equal(starts, 0)
    assert.deepEqual(subject.lifecycle.state, { kind: 'stopped', generation: 0 })
  })

  // ===========================================================================
  // Supersession and startup cancellation
  // ===========================================================================

  t('#2905 C: stop() aborts a pending abort-aware onStart at once', async () => {
    const rec = recorder()
    let saved!: LifecycleScope
    const { lifecycle } = make({
      onStart: scope => new Promise((_, reject) => {
        saved = scope
        scope.signal.addEventListener('abort', () => reject(scope.signal.reason))
      }),
      ...rec,
    })
    const starting = lifecycle.start()
    await flush()
    const stopping = lifecycle.stop()
    assert.equal(saved.signal.aborted, true, 'aborted synchronously when stop() is accepted')
    await stopping
    await assert.rejects(starting, LifecycleSupersededError)
    assert.deepEqual(rec.kinds, [ 'starting:1', 'stopping:1', 'stopped:1' ])
  })

  t('#2905 C: an onStart that ignores abort and resolves late never publishes running', async () => {
    const rec = recorder()
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({ onStart: () => gate.promise, ...rec })
    const starting = lifecycle.start()
    await flush()
    const stopping = outcome(lifecycle.stop())
    await flush()
    assert.equal(lifecycle.state.kind, 'stopping')
    assert.equal(stopping.settled, false, 'stop waits for onStart to settle')
    gate.resolve()
    await assert.rejects(starting, LifecycleSupersededError)
    await flush()
    assert.equal(stopping.settled && !stopping.rejected, true)
    assert.ok(!rec.kinds.includes('running:1'))
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('stop → start during a gated onStart starts a fresh generation', async () => {
    const rec = recorder()
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({
      onStart: scope => scope.generation === 1 ? gate.promise : undefined,
      ...rec,
    })
    const first = lifecycle.start()
    await flush()
    void lifecycle.stop()
    const second = lifecycle.start()
    gate.resolve()
    await assert.rejects(first, LifecycleSupersededError)
    await second
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
    assert.ok(!rec.kinds.includes('running:1'))
  })

  t('a start() from an abort listener gets its own attempt, not the superseded one', async () => {
    const gate = Promise.withResolvers<void>()
    let restarted: Promise<void> | undefined
    const { lifecycle } = make({
      onStart: scope => {
        if (scope.generation === 1) {
          scope.signal.addEventListener('abort', () => { restarted = lifecycle.start() })
          return gate.promise
        }
        return undefined
      },
    })
    const first = lifecycle.start()
    await flush()
    const stopping = lifecycle.stop()
    assert.ok(restarted, 'the abort listener ran synchronously inside stop()')
    gate.resolve()
    await assert.rejects(first, LifecycleSupersededError)
    await stopping // generation 1 retired cleanly
    await restarted
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('restart during a gated start retires it before the replacement', async () => {
    const rec = recorder()
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({ onStart: scope => scope.generation === 1 ? gate.promise : undefined, ...rec })
    const first = lifecycle.start()
    await flush()
    const restarted = lifecycle.restart()
    gate.resolve()
    await assert.rejects(first, LifecycleSupersededError)
    await restarted
    assert.deepEqual(rec.kinds, [ 'starting:1', 'stopping:1', 'starting:2', 'running:2' ])
  })

  t('concurrent restart() calls share one replacement', async () => {
    let starts = 0
    const { lifecycle } = make({ onStart: () => { starts++ } })
    await lifecycle.start()
    await Promise.all([ lifecycle.restart(), lifecycle.restart() ])
    assert.equal(starts, 2)
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('a start() from an abort listener during restart joins the restart', async () => {
    const gate = Promise.withResolvers<void>()
    let joined: Promise<void> | undefined
    const { lifecycle } = make({
      onStart: scope => {
        if (scope.generation === 1) {
          scope.signal.addEventListener('abort', () => { joined = lifecycle.start() })
          return gate.promise
        }
        return undefined
      },
    })
    const first = lifecycle.start()
    await flush()
    const restarting = lifecycle.restart()
    gate.resolve()
    await assert.rejects(first, LifecycleSupersededError)
    await restarting
    await joined
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('a stop() from an abort listener during restart supersedes the restart', async () => {
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({
      onStart: scope => {
        if (scope.generation === 1) {
          scope.signal.addEventListener('abort', () => { void lifecycle.stop() })
          return gate.promise
        }
        return undefined
      },
    })
    const first = outcome(lifecycle.start())
    await flush()
    const restarting = outcome(lifecycle.restart())
    gate.resolve()
    await flush()
    assert.ok(first.rejected)
    assert.ok(restarting.error instanceof LifecycleSupersededError)
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('restart() followed by stop() ends stopped; restart() followed by start() does not hang', async () => {
    const { lifecycle } = make({ onStart: () => {} })
    await lifecycle.start()
    const restarted = lifecycle.restart()
    await lifecycle.stop()
    await assert.rejects(restarted, LifecycleSupersededError)
    assert.equal(lifecycle.state.kind, 'stopped')

    await lifecycle.start()
    const again = lifecycle.restart()
    const joined = lifecycle.start()
    await Promise.all([ again, joined ])
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 3 })
  })

  // ===========================================================================
  // Start failures
  // ===========================================================================

  t('#2905 D: a failed onStart publishes failed { start } and is not retried', async () => {
    const boom = new Error('boom')
    let starts = 0
    const { lifecycle } = make({ onStart: () => { if (++starts === 1) { throw boom } } })
    await assert.rejects(lifecycle.start(), boom)
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'start')
    assert.equal(failed.error, boom)
    assert.equal(failed.cleanupComplete, true)
    await flush()
    assert.equal(starts, 1, 'a failed attempt ends')
    await lifecycle.start()
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('#2905 E: a failed onStart rejects the condition waits bound to it', async () => {
    const boom = new Error('boom')
    const subject = make({ onStart: () => { throw boom } })
    const ready = subject.condition('ready').wait()
    await assert.rejects(subject.lifecycle.start(), boom)
    await assert.rejects(ready, boom)
  })

  t('falsy rejection values are failures, kept as given', async () => {
    for (const value of [ undefined, null, false, 0, '' ]) {
      const { lifecycle } = make({ onStart: () => { throw value } })
      const result = outcome(lifecycle.start())
      await flush()
      assert.equal(result.rejected, true, `throw ${String(value)} must reject`)
      assert.equal(result.error, value)
      assert.equal(failedState(lifecycle.state).error, value)
    }
  })

  t('scope.fail(undefined) and a task throwing undefined fail the run', async () => {
    let saved!: LifecycleScope
    const a = make({ onStart: scope => { saved = scope } })
    await a.lifecycle.start()
    saved.fail(undefined)
    await flush()
    assert.deepEqual(failedState(a.lifecycle.state).phase, 'run')
    assert.equal(failedState(a.lifecycle.state).error, undefined)

    const gate = Promise.withResolvers<void>()
    const b = make({ onStart: scope => scope.spawn(async () => { await gate.promise; throw undefined }) })
    await b.lifecycle.start()
    gate.resolve()
    await flush()
    assert.equal(failedState(b.lifecycle.state).phase, 'run')
  })

  // ===========================================================================
  // Cleanup truth and dirty failures (#2905 §3.6)
  // ===========================================================================

  t('a failed release leaves a dirty failure that refuses start and is retried by stop()', async () => {
    const releaseError = new Error('release')
    let attempts = 0
    let other = 0
    let stops = 0
    const { lifecycle } = make({
      onStart: scope => {
        scope.defer(() => { other++ })
        scope.defer(() => { if (++attempts === 1) { throw releaseError } })
      },
      onStop: () => { stops++ },
    })
    await lifecycle.start()
    await assert.rejects(lifecycle.stop(), releaseError)
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'stop')
    assert.equal(failed.cleanupComplete, false)
    assert.equal(failed.cleanupError, releaseError)
    await assert.rejects(lifecycle.start(), LifecycleUnsafeStateError)
    await assert.rejects(lifecycle.restart(), LifecycleUnsafeStateError)

    await lifecycle.stop()
    assert.equal(lifecycle.state.kind, 'stopped')
    assert.equal(attempts, 2, 'only the failed release is retried')
    assert.equal(other, 1)
    assert.equal(stops, 1, 'a successful onStop is not replayed')
  })

  t('a release that keeps failing runs once per explicit stop(), never spins', async () => {
    let calls = 0
    const { lifecycle } = make({ onStart: scope => scope.defer(() => { calls++; throw new Error('always') }) })
    await lifecycle.start()
    await assert.rejects(lifecycle.stop())
    await flush()
    assert.equal(calls, 1)
    await assert.rejects(lifecycle.stop())
    await flush()
    assert.equal(calls, 2)
    assert.equal(failedState(lifecycle.state).cleanupComplete, false)
  })

  t('a stop() that supersedes a gated start cleans up once and stays dirty until asked again', async () => {
    const releaseError = new Error('release')
    const gate = Promise.withResolvers<void>()
    let calls = 0
    const { lifecycle } = make({
      onStart: async scope => {
        scope.defer(() => { if (++calls === 1) { throw releaseError } })
        await gate.promise
      },
    })
    const starting = lifecycle.start()
    await flush()
    const stopping = lifecycle.stop()
    gate.resolve()
    await assert.rejects(stopping, releaseError)
    await assert.rejects(starting, LifecycleSupersededError)
    await flush()
    assert.equal(calls, 1)
    assert.equal(failedState(lifecycle.state).cleanupComplete, false)
    await lifecycle.stop()
    assert.equal(calls, 2)
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('a dirty restart rejects its replacement and starts nothing', async () => {
    const releaseError = new Error('release')
    const generations: number[] = []
    const { lifecycle } = make({
      onStart: scope => {
        generations.push(scope.generation)
        scope.defer(() => { if (scope.generation === 1) { throw releaseError } })
      },
    })
    await lifecycle.start()
    await assert.rejects(lifecycle.restart(), releaseError)
    await flush()
    assert.deepEqual(generations, [ 1 ])
    assert.equal(failedState(lifecycle.state).cleanupComplete, false)
  })

  t('superseded startup with failing cleanup rejects its condition waits', async () => {
    const releaseError = new Error('release')
    const gate = Promise.withResolvers<void>()
    const subject = make({
      onStart: async scope => {
        scope.defer(() => { if (scope.generation === 1) { throw releaseError } })
        await gate.promise
      },
    })
    const ready = outcome(subject.condition('ready').wait())
    const starting = subject.lifecycle.start()
    await flush()
    const restarted = subject.lifecycle.restart()
    gate.resolve()
    await assert.rejects(restarted, releaseError)
    await assert.rejects(starting, LifecycleSupersededError)
    await flush()
    assert.equal(ready.rejected, true)
  })

  t('every release runs when one throws; several errors aggregate', async () => {
    const ran: string[] = []
    const { lifecycle } = make({
      onStart: scope => {
        scope.defer(() => { ran.push('a'); throw new Error('a') })
        scope.defer(() => { ran.push('b') })
        scope.defer(() => { ran.push('c'); throw new Error('c') })
      },
    })
    await lifecycle.start()
    const error = await lifecycle.stop().then(() => undefined, (e: unknown) => e)
    assert.deepEqual(ran, [ 'c', 'b', 'a' ])
    assert.ok(error instanceof AggregateError)
    assert.deepEqual(error.errors.map((e: Error) => e.message), [ 'c', 'a' ])
  })

  // ===========================================================================
  // onStop and retirement order (v1 §4.3)
  // ===========================================================================

  t('onStop runs with live resources, before scope.signal aborts, with a deadline signal', async () => {
    const log: string[] = []
    let saved!: LifecycleScope
    const { lifecycle } = make({
      onStart: scope => {
        saved = scope
        scope.defer(() => { log.push('release') })
      },
      onStop: stop => {
        log.push(`onStop reason=${stop.reason} aborted=${saved.signal.aborted} same=${stop.signal === saved.signal}`)
      },
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.deepEqual(log, [ 'onStop reason=stop aborted=false same=false', 'release' ])
  })

  t('onStop is not called for a run that never reached running', async () => {
    let stops = 0
    const gate = Promise.withResolvers<void>()
    const a = make({ onStart: () => { throw new Error('x') }, onStop: () => { stops++ } })
    await assert.rejects(a.lifecycle.start())
    const b = make({ onStart: () => gate.promise, onStop: () => { stops++ } })
    const starting = b.lifecycle.start()
    await flush()
    const stopping = b.lifecycle.stop()
    gate.resolve()
    await stopping
    await assert.rejects(starting)
    assert.equal(stops, 0)
  })

  t('onStop receives failure and recover reasons', async () => {
    const reasons: string[] = []
    let saved!: LifecycleScope
    const { lifecycle } = make({ onStart: scope => { saved = scope }, onStop: stop => { reasons.push(stop.reason) } })
    await lifecycle.start()
    assert.equal(await saved.recover(), 'recovered')
    saved.fail(new Error('x'))
    await flush()
    assert.deepEqual(reasons, [ 'recover', 'failure' ])
  })

  t('a throwing onStop is reported, but released resources make the failure clean', async () => {
    const goodbye = new Error('goodbye')
    let released = 0
    const { lifecycle } = make({
      onStart: scope => scope.defer(() => { released++ }),
      onStop: () => { throw goodbye },
    })
    await lifecycle.start()
    await assert.rejects(lifecycle.stop(), goodbye)
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'stop')
    assert.equal(failed.cleanupComplete, true)
    assert.equal(released, 1)
    await lifecycle.start()
    assert.equal(lifecycle.state.kind, 'running')
  })

  t('an onStop rejecting with undefined is a cleanup failure, not success', async () => {
    const a = make({ onStart: () => {}, onStop: () => { throw undefined } })
    await a.lifecycle.start()
    const stopping = outcome(a.lifecycle.stop())
    await flush()
    assert.ok(stopping.rejected)
    assert.equal(stopping.error, undefined)
    const failed = failedState(a.lifecycle.state)
    assert.equal(failed.phase, 'stop')
    assert.equal(failed.cleanupComplete, true)
    assert.ok('cleanupError' in failed)

    let starts = 0
    const b = make({ onStart: () => { starts++ }, onStop: () => { throw undefined } })
    await b.lifecycle.start()
    const restarting = outcome(b.lifecycle.restart())
    await flush()
    assert.ok(restarting.rejected, 'the replacement is refused')
    assert.equal(starts, 1)
  })

  t('acquire, use, child, task and defer unwind in strict reverse order', async () => {
    const log: string[] = []
    const child = createLifecycle({ onStart: () => {}, onStop: () => { log.push('child') } })
    const { lifecycle } = make({
      onStart: async scope => {
        await scope.acquire(() => 'resource', () => { log.push('acquire') })
        scope.use({ [Symbol.dispose]: () => { log.push('use') } })
        await scope.start(child)
        scope.spawn(signal => new Promise<void>(resolve => {
          signal.addEventListener('abort', () => { log.push('task ends on abort'); resolve() })
        }))
        scope.defer(() => { log.push('defer') })
      },
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.deepEqual(log, [ 'task ends on abort', 'defer', 'child', 'use', 'acquire' ])
  })

  t('cleanup registered after a child still sees that child running', async () => {
    let seen = ''
    const child = createLifecycle({ onStart: () => {} })
    const { lifecycle } = make({
      onStart: async scope => {
        await scope.start(child)
        scope.defer(() => { seen = child.state.kind })
      },
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.equal(seen, 'running')
    assert.equal(child.state.kind, 'stopped')
  })

  t('use() accepts AsyncDisposable and Disposable and refuses anything else', async () => {
    const log: string[] = []
    let refused: unknown
    const { lifecycle } = make({
      onStart: scope => {
        scope.use({ [Symbol.asyncDispose]: async () => { log.push('async') } })
        scope.use({ [Symbol.dispose]: () => { log.push('sync') } })
        try {
          scope.use({} as Disposable)
        } catch (error) {
          refused = error
        }
      },
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.ok(refused instanceof TypeError)
    assert.deepEqual(log, [ 'sync', 'async' ])
  })

  // ===========================================================================
  // acquire and interrupt
  // ===========================================================================

  t('acquire records ownership before create and passes scope.signal', async () => {
    const log: string[] = []
    const { lifecycle } = make({
      onStart: async scope => {
        const resource = await scope.acquire(
          signal => { log.push(`create same-signal=${signal === scope.signal}`); return 'r' },
          r => { log.push(`release ${r}`) },
        )
        log.push(`got ${resource}`)
      },
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.deepEqual(log, [ 'create same-signal=true', 'got r', 'release r' ])
  })

  t('an acquisition that resolves after retirement began is released and acquire rejects', async () => {
    const log: string[] = []
    const gate = Promise.withResolvers<string>()
    const { lifecycle } = make({
      onStart: async scope => {
        try {
          await scope.acquire(() => gate.promise, r => { log.push(`release ${r}`) })
        } catch (error) {
          log.push(`rejected ${(error as Error).name}`)
          throw error
        }
      },
    })
    const starting = lifecycle.start()
    await flush()
    const stopping = lifecycle.stop()
    await flush()
    gate.resolve('late')
    await stopping
    await assert.rejects(starting, LifecycleSupersededError)
    assert.deepEqual(log, [ 'rejected LifecycleSupersededError', 'release late' ])
  })

  t('a failed create releases nothing', async () => {
    let released = 0
    const { lifecycle } = make({
      onStart: scope => scope.acquire(() => { throw new Error('create') }, () => { released++ }).then(() => {}),
    })
    await assert.rejects(lifecycle.start(), /create/)
    assert.equal(released, 0)
    assert.equal(failedState(lifecycle.state).cleanupComplete, true)
  })

  t('interrupt unblocks a dependent task before it is joined', async () => {
    const log: string[] = []
    const { lifecycle } = make({
      onStart: async scope => {
        const socket = await scope.acquire(
          () => new EventTarget(),
          () => { log.push('close') },
          { interrupt: s => s.dispatchEvent(new Event('end')) },
        )
        // This task ignores the abort signal: only the socket ending stops it.
        scope.spawn(() => new Promise<void>(resolve => {
          socket.addEventListener('end', () => { log.push('task ends'); resolve() })
        }))
      },
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.deepEqual(log, [ 'task ends', 'close' ])
  })

  t('an acquisition finishing after the interrupt pass is interrupted before release', async () => {
    const log: string[] = []
    const creating = Promise.withResolvers<EventTarget>()
    const { lifecycle } = make({
      onStart: scope => {
        const socket = scope.acquire(
          () => creating.promise,
          () => { log.push('close') },
          { interrupt: s => { log.push('interrupt'); s.dispatchEvent(new Event('end')) } },
        )
        socket.catch(() => {})
        scope.spawn(async () => {
          const s = await socket.catch(() => undefined)
          if (s) {
            await new Promise<void>(resolve => s.addEventListener('end', () => resolve()))
          }
        })
      },
    })
    await lifecycle.start()
    const stopping = lifecycle.stop()
    await flush()
    assert.deepEqual(log, [], 'the interrupt pass ran before the resource existed')
    creating.resolve(new EventTarget())
    await stopping
    assert.deepEqual(log, [ 'interrupt', 'close' ])
  })

  t('a late interrupt that throws is reported as a cleanup error', async () => {
    const creating = Promise.withResolvers<string>()
    const boom = new Error('interrupt')
    const { lifecycle } = make({
      onStart: scope => {
        void scope.acquire(() => creating.promise, () => {}, { interrupt: () => { throw boom } }).catch(() => {})
      },
    })
    await lifecycle.start()
    const stopping = lifecycle.stop()
    await flush()
    creating.resolve('r')
    await assert.rejects(stopping, boom)
    assert.equal(failedState(lifecycle.state).cleanupComplete, true)
  })

  // ===========================================================================
  // Sealed scopes and late debt
  // ===========================================================================

  t('a sealed scope releases late registrations at once and refuses new work', async () => {
    const log: string[] = []
    let saved!: LifecycleScope
    const child = createLifecycle({ onStart: () => { log.push('child started') } })
    const { lifecycle } = make({
      onStart: scope => { saved = scope },
      onStop: async () => {
        try { saved.defer(() => { log.push('late released') }) } catch (e) { log.push(`defer threw ${(e as Error).name}`) }
        await saved.acquire(() => { log.push('created') }, () => {}).catch(() => log.push('acquire refused'))
        try { saved.spawn(async () => { log.push('task ran') }) } catch { log.push('spawn refused') }
        await saved.start(child).catch(() => log.push('child refused'))
      },
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.deepEqual(log, [
      'late released', 'defer threw LifecycleSupersededError',
      'acquire refused', 'spawn refused', 'child refused',
    ])
    assert.equal(child.state.kind, 'stopped')
  })

  t('a failing late release after retirement becomes debt until stop() clears it', async () => {
    let saved!: LifecycleScope
    let calls = 0
    const { lifecycle } = make({ onStart: scope => { saved = scope } })
    await lifecycle.start()
    await lifecycle.stop()
    assert.throws(() => saved.defer(() => { if (++calls === 1) { throw new Error('late') } }))
    await flush()
    const failed = failedState(lifecycle.state)
    assert.equal(failed.cleanupComplete, false)
    await assert.rejects(lifecycle.start(), LifecycleUnsafeStateError)
    await lifecycle.stop()
    assert.equal(calls, 2)
    assert.equal(lifecycle.state.kind, 'stopped')
    await lifecycle.start()
  })

  t('debt from a retired generation is retried by the next retirement', async () => {
    let first!: LifecycleScope
    let calls = 0
    const { lifecycle } = make({ onStart: scope => { if (scope.generation === 1) { first = scope } } })
    await lifecycle.start()
    await lifecycle.stop()
    await lifecycle.start()
    assert.throws(() => first.defer(() => { if (++calls === 1) { throw new Error('late') } }))
    await flush()
    assert.equal(lifecycle.state.kind, 'running', 'a live run is not interrupted by old debt')
    await lifecycle.stop()
    assert.equal(calls, 2)
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('a stop() settles when debt clears on its own', async () => {
    const clock = new ManualClock()
    let saved!: LifecycleScope
    const gate = Promise.withResolvers<void>()
    let calls = 0
    const { lifecycle } = make({ onStart: scope => { saved = scope } }, { stopTimeoutMs: 50, clock })
    await lifecycle.start()
    await lifecycle.stop()
    assert.throws(() => saved.defer(() => {
      if (++calls === 1) { throw new Error('late') }
      return gate.promise
    }))
    await flush()
    const retry = outcome(lifecycle.stop())
    await clock.advance(60)
    assert.ok(retry.error instanceof LifecycleTimeoutError)
    gate.resolve()
    await flush()
    await lifecycle.stop()
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  // ===========================================================================
  // Tasks
  // ===========================================================================

  t('a spawned task gets scope.signal, aborted on retirement, and is joined', async () => {
    const log: string[] = []
    const { lifecycle } = make({
      onStart: scope => scope.spawn(async signal => {
        log.push(`same=${signal === scope.signal}`)
        await new Promise(resolve => signal.addEventListener('abort', resolve))
        await flush(3)
        log.push('joined')
      }),
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.deepEqual(log, [ 'same=true', 'joined' ])
  })

  t('a spawned task rejection fails the running generation', async () => {
    const crash = new Error('crash')
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({ onStart: scope => scope.spawn(async () => { await gate.promise; throw crash }) })
    await lifecycle.start()
    gate.resolve()
    await flush()
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'run')
    assert.equal(failed.error, crash)
    assert.equal(failed.cleanupComplete, true)
  })

  t('a task failing while retiring is reported once as a cleanup error', async () => {
    const late = new Error('late task')
    const { lifecycle } = make({
      onStart: scope => scope.spawn(async signal => {
        await new Promise(resolve => signal.addEventListener('abort', resolve))
        throw late
      }),
    })
    await lifecycle.start()
    await assert.rejects(lifecycle.stop(), late)
    assert.equal(failedState(lifecycle.state).cleanupComplete, true)
    await lifecycle.start()
  })

  // ===========================================================================
  // Children (v1 §4.5)
  // ===========================================================================

  t('scope.start refuses a child that is not stopped or cleanly failed', async () => {
    const child = createLifecycle({ onStart: () => {} })
    await child.start()
    const { lifecycle } = make({ onStart: scope => scope.start(child) })
    await assert.rejects(lifecycle.start(), LifecycleUnsafeStateError)
  })

  t('two parents cannot adopt the same child', async () => {
    const gate = Promise.withResolvers<void>()
    const child = createLifecycle({ onStart: () => gate.promise })
    const a = make({ onStart: scope => scope.start(child) })
    const b = createLifecycle({ onStart: scope => scope.start(child) })
    const startA = a.lifecycle.start()
    await assert.rejects(b.start(), LifecycleUnsafeStateError)
    gate.resolve()
    await startA
  })

  t('a child whose stop failed stays owned until its owner retries successfully', async () => {
    let fails = 1
    const child = createLifecycle({ onStart: scope => scope.defer(() => { if (fails-- > 0) { throw new Error('child release') } }) })
    const a = make({ onStart: scope => scope.start(child) })
    const b = createLifecycle({ onStart: scope => scope.start(child) })
    await a.lifecycle.start()
    await assert.rejects(a.lifecycle.stop())
    await child.stop() // repaired directly
    assert.equal(child.state.kind, 'stopped')
    await assert.rejects(b.start(), LifecycleUnsafeStateError)
    await a.lifecycle.stop()
    await b.start()
    assert.equal(child.state.kind, 'running')
  })

  t('a child exiting on its own fails the parent with the child error as cause', async () => {
    const exit = new Error('child exit')
    const gate = Promise.withResolvers<void>()
    let childScope!: LifecycleScope
    const child = createLifecycle({ onStart: scope => { childScope = scope }, onStop: () => gate.promise })
    const { lifecycle } = make({ onStart: scope => scope.start(child) })
    await lifecycle.start()
    childScope.fail(exit)
    await flush()
    assert.equal(lifecycle.state.kind, 'running', 'escalation waits for the child to commit failed')
    gate.resolve()
    await flush()
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'run')
    assert.equal((failed.error as Error).cause, exit)
  })

  t('a child that recovers itself does not fail its parent', async () => {
    let childScope!: LifecycleScope
    const child = createLifecycle({ onStart: scope => { childScope = scope } })
    const { lifecycle } = make({ onStart: scope => scope.start(child) })
    await lifecycle.start()
    assert.equal(await childScope.recover(), 'recovered')
    await flush()
    assert.deepEqual(child.state, { kind: 'running', generation: 2 })
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
  })

  t('a parent stopping during child startup cancels the child', async () => {
    const child = createLifecycle({
      onStart: scope => new Promise((_, reject) => scope.signal.addEventListener('abort', () => reject(scope.signal.reason))),
    })
    const { lifecycle } = make({ onStart: scope => scope.start(child) })
    const starting = lifecycle.start()
    await flush()
    await lifecycle.stop()
    await assert.rejects(starting, LifecycleSupersededError)
    assert.equal(child.state.kind, 'stopped')
  })

  t('three nested levels across both shells start in order and stop in reverse', async () => {
    const log: string[] = []
    const leaf = createLifecycle({ onStart: () => { log.push('leaf+') }, onStop: () => { log.push('leaf-') } })
    class Middle extends AsyncLifecycle {

      constructor () { super() }
      protected override async onStart (scope: LifecycleScope) { log.push('middle+'); await scope.start(leaf) }
      protected override onStop () { log.push('middle-') }

    }
    const middle = new Middle()
    const { lifecycle } = make({
      onStart: async scope => { log.push('root+'); await scope.start(middle) },
      onStop: () => { log.push('root-') },
    })
    await lifecycle.start()
    await lifecycle.stop()
    assert.deepEqual(log, [ 'root+', 'middle+', 'leaf+', 'root-', 'middle-', 'leaf-' ])
    assert.equal(leaf.state.kind, 'stopped')
    assert.equal(middle.state.kind, 'stopped')
  })

  // ===========================================================================
  // Conditions (v1 §4.6)
  // ===========================================================================

  t('a wait made before start binds to the next generation', async () => {
    const subject = make({ onStart: scope => scope.set(ready) })
    const ready = subject.condition('ready')
    const waiting = ready.wait()
    await subject.lifecycle.start()
    await waiting
  })

  t('stop() before any start rejects pre-start waits', async () => {
    const subject = make({ onStart: () => {} })
    const waiting = subject.condition('ready').wait()
    await subject.lifecycle.stop()
    await assert.rejects(waiting, LifecycleSupersededError)
  })

  t('set is a level: later waits resolve at once, clear blocks again', async () => {
    let saved!: LifecycleScope
    const subject = make({ onStart: scope => { saved = scope } })
    const ready = subject.condition('ready')
    await subject.lifecycle.start()
    saved.set(ready)
    await ready.wait()
    saved.clear(ready)
    const blocked = outcome(ready.wait())
    await flush()
    assert.equal(blocked.settled, false)
    saved.set(ready)
    await flush()
    assert.equal(blocked.settled, true)
  })

  t('a condition result never crosses generations', async () => {
    let saved!: LifecycleScope
    const subject = make({ onStart: scope => { saved = scope; if (scope.generation === 1) { scope.set(ready) } } })
    const ready = subject.condition('ready')
    await subject.lifecycle.start()
    await ready.wait()
    await subject.lifecycle.restart()
    const second = outcome(ready.wait())
    await flush()
    assert.equal(second.settled, false)
    saved.set(ready)
    await flush()
    assert.equal(second.settled && !second.rejected, true)
  })

  t('a wait made during stopping binds to the replacement', async () => {
    const gate = Promise.withResolvers<void>()
    const subject = make({
      onStart: scope => { if (scope.generation === 2) { scope.set(ready) } },
      onStop: () => gate.promise,
    })
    const ready = subject.condition('ready')
    await subject.lifecycle.start()
    const restarted = subject.lifecycle.restart()
    await flush()
    assert.equal(subject.lifecycle.state.kind, 'stopping')
    const waiting = ready.wait()
    gate.resolve()
    await restarted
    await waiting
  })

  t('a retiring or stale scope cannot set conditions', async () => {
    let saved!: LifecycleScope
    const subject = make({
      onStart: scope => { saved = scope },
      onStop: () => { saved.set(ready) },
    })
    const ready = subject.condition('ready')
    await subject.lifecycle.start()
    const first = outcome(ready.wait())
    await subject.lifecycle.restart()
    await flush()
    assert.equal(first.rejected, true, 'a wait bound to a retired generation rejects')
    const stale = saved
    await subject.lifecycle.restart()
    stale.set(ready)
    const waiting = outcome(ready.wait())
    await flush()
    assert.equal(waiting.settled, false)
  })

  t('a condition declared on another lifecycle is refused', async () => {
    const foreign = createLifecycle({ onStart: () => {} }).condition('ready')
    let refused: unknown
    const { lifecycle } = make({ onStart: scope => { try { scope.set(foreign) } catch (e) { refused = e } } })
    await lifecycle.start()
    assert.ok(refused instanceof TypeError)
  })

  t('a failing run rejects its condition waits with the failure', async () => {
    const crash = new Error('crash')
    let saved!: LifecycleScope
    const subject = make({ onStart: scope => { saved = scope } })
    await subject.lifecycle.start()
    const waiting = subject.condition('ready').wait()
    saved.fail(crash)
    await assert.rejects(waiting, crash)
  })

  // ===========================================================================
  // whenState
  // ===========================================================================

  t('whenState resolves now, on a later snapshot, or rejects on a throwing predicate', async () => {
    const { lifecycle } = make({ onStart: () => {} })
    assert.equal((await lifecycle.whenState(s => s.kind === 'stopped')).kind, 'stopped')
    const running = lifecycle.whenState(s => s.kind === 'running')
    await lifecycle.start()
    assert.deepEqual(await running, { kind: 'running', generation: 1 })
    const throwing = lifecycle.whenState(s => { if (s.kind === 'stopping') { throw new Error('predicate') } return false })
    await lifecycle.stop()
    await assert.rejects(throwing, /predicate/)
  })

  t('whenState rejects on caller abort without affecting the service', async () => {
    const { lifecycle } = make({ onStart: () => {} })
    const controller = new AbortController()
    const waiting = lifecycle.whenState(s => s.kind === 'failed', { signal: controller.signal })
    controller.abort(new Error('bye'))
    await assert.rejects(waiting, /bye/)
    await lifecycle.start()
    assert.equal(lifecycle.state.kind, 'running')
  })

  // ===========================================================================
  // Recovery (v1 §4.4)
  // ===========================================================================

  t('scope.recover() replaces a running generation with no stopped or failed between', async () => {
    const rec = recorder()
    let saved!: LifecycleScope
    const { lifecycle } = make({ onStart: scope => { saved = scope }, ...rec })
    await lifecycle.start()
    assert.equal(await saved.recover(new Error('stale socket')), 'recovered')
    assert.deepEqual(rec.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'starting:2', 'running:2' ])
  })

  t('a stale scope cannot recover a newer run', async () => {
    let first!: LifecycleScope
    const { lifecycle } = make({ onStart: scope => { if (scope.generation === 1) { first = scope } } })
    await lifecycle.start()
    await lifecycle.restart()
    assert.equal(await first.recover(), 'superseded')
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('#2905 B: a user stop() during recovery wins', async () => {
    const gate = Promise.withResolvers<void>()
    let saved!: LifecycleScope
    const { lifecycle } = make({ onStart: scope => { saved = scope }, onStop: () => gate.promise })
    await lifecycle.start()
    const recovering = saved.recover()
    await flush()
    const stopping = lifecycle.stop()
    gate.resolve()
    await stopping
    assert.equal(await recovering, 'superseded')
    await flush()
    assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
  })

  t('a user start() during recovery supersedes it and still runs', async () => {
    const gate = Promise.withResolvers<void>()
    let saved!: LifecycleScope
    const { lifecycle } = make({ onStart: scope => { saved = scope }, onStop: () => gate.promise })
    await lifecycle.start()
    const recovering = saved.recover()
    await flush()
    const starting = lifecycle.start()
    gate.resolve()
    await starting
    assert.equal(await recovering, 'superseded')
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('a user start() while the recovery replacement is starting joins it', async () => {
    const gate = Promise.withResolvers<void>()
    let saved!: LifecycleScope
    const { lifecycle } = make({ onStart: scope => { saved = scope; return scope.generation === 2 ? gate.promise : undefined } })
    await lifecycle.start()
    const recovering = saved.recover()
    await flush()
    assert.deepEqual(lifecycle.state, { kind: 'starting', generation: 2 })
    const starting = lifecycle.start()
    gate.resolve()
    await starting
    assert.equal(await recovering, 'recovered')
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('a start() joined to a recovery still rejects when stop() supersedes it', async () => {
    let saved!: LifecycleScope
    const { lifecycle } = make({
      onStart: scope => {
        saved = scope
        if (scope.generation === 2) {
          return new Promise((_, reject) => scope.signal.addEventListener('abort', () => reject(scope.signal.reason)))
        }
        return undefined
      },
    })
    await lifecycle.start()
    const recovering = saved.recover()
    await flush()
    const starting = outcome(lifecycle.start())
    await lifecycle.stop()
    await flush()
    assert.ok(starting.error instanceof LifecycleSupersededError)
    assert.equal(await recovering, 'superseded')
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('an owned task may trigger recovery with void scope.recover()', async () => {
    const trigger = Promise.withResolvers<void>()
    const { lifecycle } = make({
      onStart: scope => {
        if (scope.generation === 1) {
          scope.spawn(async () => { await trigger.promise; void scope.recover() })
        }
      },
    })
    await lifecycle.start()
    trigger.resolve()
    await flush()
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  })

  t('recover() rejects when the replacement fails or retirement is dirty', async () => {
    const boom = new Error('boom')
    let saved!: LifecycleScope
    const a = make({ onStart: scope => { saved = scope; if (scope.generation === 2) { throw boom } } })
    await a.lifecycle.start()
    await assert.rejects(saved.recover(), boom)

    const release = new Error('release')
    const b = make({ onStart: scope => { saved = scope; scope.defer(() => { throw release }) } })
    await b.lifecycle.start()
    await assert.rejects(saved.recover(), release)
    assert.equal(failedState(b.lifecycle.state).cleanupComplete, false)
  })

  t('recover() before running behaves like fail() and is safe to ignore', async () => {
    const reason = new Error('early')
    const { lifecycle } = make({ onStart: scope => { void scope.recover(reason) } })
    await assert.rejects(lifecycle.start(), reason)
    assert.equal(failedState(lifecycle.state).phase, 'start')
  })

  // ===========================================================================
  // Deadlines (manual clock)
  // ===========================================================================

  t('startTimeoutMs fails the attempt with LifecycleTimeoutError and aborts the scope', async () => {
    const clock = new ManualClock()
    const { lifecycle } = make({
      onStart: scope => new Promise((_, reject) => scope.signal.addEventListener('abort', () => reject(scope.signal.reason))),
    }, { startTimeoutMs: 100, clock })
    const starting = outcome(lifecycle.start())
    await clock.advance(99)
    assert.equal(starting.settled, false)
    await clock.advance(1)
    assert.ok(starting.error instanceof LifecycleTimeoutError)
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'start')
    assert.equal(failed.cleanupComplete, true)
    assert.equal(clock.pending, 0, 'no timer is left behind')
  })

  t('stopTimeoutMs bounds a stop() that waits on an onStart ignoring abort', async () => {
    const clock = new ManualClock()
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({ onStart: () => gate.promise }, { stopTimeoutMs: 50, clock })
    const starting = outcome(lifecycle.start())
    await flush()
    const stopping = outcome(lifecycle.stop())
    await clock.advance(60)
    assert.ok(stopping.error instanceof LifecycleTimeoutError)
    assert.ok(starting.rejected)
    assert.equal(failedState(lifecycle.state).cleanupComplete, false)
    gate.resolve()
    await lifecycle.stop()
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('an onStart that ignores its timeout keeps the generation dirty until it settles', async () => {
    const clock = new ManualClock()
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({ onStart: () => gate.promise }, { startTimeoutMs: 100, stopTimeoutMs: 50, clock })
    const starting = outcome(lifecycle.start())
    await clock.advance(150)
    assert.ok(starting.error instanceof LifecycleTimeoutError)
    const failed = failedState(lifecycle.state)
    assert.equal(failed.cleanupComplete, false)
    await assert.rejects(lifecycle.start(), LifecycleUnsafeStateError)
    gate.resolve()
    await lifecycle.stop()
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('stopTimeoutMs bounds a hanging release and the next stop() joins it', async () => {
    const clock = new ManualClock()
    const gate = Promise.withResolvers<void>()
    let releases = 0
    const { lifecycle } = make({
      onStart: scope => scope.defer(() => { releases++; return gate.promise }),
    }, { stopTimeoutMs: 100, clock })
    await lifecycle.start()
    const stopping = outcome(lifecycle.stop())
    await clock.advance(100)
    assert.ok(stopping.error instanceof LifecycleTimeoutError)
    assert.equal(failedState(lifecycle.state).cleanupComplete, false)
    const retry = lifecycle.stop()
    gate.resolve()
    await retry
    assert.equal(releases, 1, 'the running release is joined, not repeated')
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('one stop() has one deadline for joining earlier work and retrying', async () => {
    const clock = new ManualClock()
    const first = Promise.withResolvers<void>()
    let calls = 0
    const { lifecycle } = make({
      onStart: scope => scope.defer(() => (++calls === 1 ? first.promise : new Promise(() => {}))),
    }, { stopTimeoutMs: 100, clock })
    await lifecycle.start()
    const stopping = outcome(lifecycle.stop())
    await clock.advance(100)
    assert.equal(stopping.rejected, true)

    const retry = outcome(lifecycle.stop())
    await clock.advance(50)
    first.reject(new Error('old release failed'))
    await flush()
    assert.equal(calls, 2, 'the failed entry is retried in the same pass')
    await clock.advance(49)
    assert.equal(retry.settled, false)
    await clock.advance(1)
    assert.ok(retry.error instanceof LifecycleTimeoutError)
  })

  t('an onStop past its deadline stays tracked and blocks a clean retirement', async () => {
    const clock = new ManualClock()
    const gate = Promise.withResolvers<void>()
    let stops = 0
    const { lifecycle } = make({ onStart: () => {}, onStop: () => { stops++; return gate.promise } }, { stopTimeoutMs: 50, clock })
    await lifecycle.start()
    const stopping = outcome(lifecycle.stop())
    await clock.advance(50)
    assert.ok(stopping.error instanceof LifecycleTimeoutError)
    assert.equal(failedState(lifecycle.state).cleanupComplete, false)
    const retry = outcome(lifecycle.stop())
    await flush()
    assert.equal(retry.settled, false)
    gate.resolve()
    await flush()
    assert.equal(retry.settled && !retry.rejected, true)
    assert.equal(stops, 1)
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  // ===========================================================================
  // Observers and reentrancy
  // ===========================================================================

  t('observer exceptions are isolated', async () => {
    const { lifecycle } = make({ onStart: () => {}, onStateChange: () => { throw new Error('observer') } })
    await lifecycle.start()
    await lifecycle.stop()
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('an observer stop() on running does not reject the completed start', async () => {
    let subject!: Subject
    subject = make({
      onStart: () => {},
      onStateChange: state => { if (state.kind === 'running') { void subject.lifecycle.stop() } },
    })
    await subject.lifecycle.start()
    await subject.lifecycle.whenState(s => s.kind === 'stopped')
  })

  t('an observer stop() on a dirty failure gets its own outcome', async () => {
    let calls = 0
    let retry: Promise<void> | undefined
    let subject!: Subject
    subject = make({
      onStart: scope => scope.defer(() => { if (++calls === 1) { throw new Error('once') } }),
      onStateChange: state => {
        if (state.kind === 'failed' && !state.cleanupComplete && !retry) {
          retry = subject.lifecycle.stop()
        }
      },
    })
    await subject.lifecycle.start()
    await assert.rejects(subject.lifecycle.stop(), /once/)
    await retry
    assert.equal(calls, 2)
    assert.equal(subject.lifecycle.state.kind, 'stopped')
  })

  t('a start() accepted during failure cleanup starts a replacement', async () => {
    const rec = recorder()
    const gate = Promise.withResolvers<void>()
    let saved!: LifecycleScope
    const { lifecycle } = make({ onStart: scope => { saved = scope }, onStop: () => gate.promise, ...rec })
    await lifecycle.start()
    saved.fail(new Error('crash'))
    await flush()
    const starting = lifecycle.start()
    gate.resolve()
    await starting
    assert.deepEqual(rec.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'failed:1', 'starting:2', 'running:2' ])
  })

  t('a hook calling stop() synchronously never runs a second reconciler', async () => {
    let starts = 0
    let subject!: Subject
    subject = make({ onStart: () => { starts++; void subject.lifecycle.stop() } })
    await assert.rejects(subject.lifecycle.start(), LifecycleSupersededError)
    await flush()
    assert.equal(starts, 1)
    assert.equal(subject.lifecycle.state.kind, 'stopped')
  })

  t('stop() on a clean failure commits stopped', async () => {
    const { lifecycle } = make({ onStart: () => { throw new Error('x') } })
    await assert.rejects(lifecycle.start())
    await lifecycle.stop()
    await flush()
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  t('await using stops the lifecycle', async () => {
    let stops = 0
    const { lifecycle } = make({ onStart: () => {}, onStop: () => { stops++ } })
    {
      await using owned = lifecycle
      await owned.start()
    }
    assert.equal(stops, 1)
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  // ===========================================================================
  // #2905 F: listeners never accumulate across restarts
  // ===========================================================================

  t('#2905 F: start/stop ×3 never accumulates listeners', async () => {
    const puppet = new EventEmitter()
    const { lifecycle } = make({
      onStart: scope => {
        listen(scope, puppet, 'ready', () => {})
        listen(scope, puppet, 'logout', () => {})
      },
    })
    for (let i = 0; i < 3; i++) {
      await lifecycle.start()
      assert.equal(puppet.listenerCount('ready'), 1)
      assert.equal(puppet.listenerCount('logout'), 1)
      await lifecycle.stop()
      assert.equal(puppet.listenerCount('ready'), 0)
    }
  })
}
