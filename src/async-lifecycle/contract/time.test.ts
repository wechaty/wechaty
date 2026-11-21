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
 * Contract tests for start and stop deadlines (README §8, C-TIME-*), on the
 * manual clock. They need the `clock` capability, so the Codex comparison
 * implementation, whose deadlines use real timers, is skipped.
 */

import assert from 'node:assert/strict'

import type { Lifecycle, LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, ManualClock, observe, type Observed, shutdown } from './harness.ts'
import { contract } from './suite.ts'

/** Resolve once `signal` aborts, at once if it already has. */
function aborted (signal: AbortSignal): Promise<void> {
  return signal.aborted
    ? Promise.resolve()
    : new Promise(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
}

for (const cleanup of [ 'success', 'failure', 'timeout' ] as const) {
  contract(`C-TIME-02.a-${cleanup}`, `a stop() issued from the start-timeout abort observes its retirement: ${cleanup}`, { needs: [ 'clock' ] }, async ({ make }) => {
    // Codex source test also expected one onStop call; D8 says none for a run that never reached running.
    const clock = new ManualClock()
    const gate = Promise.withResolvers<void>()
    const reason = new Error('release failed')
    let lifecycle!: Lifecycle
    let stop: Observed<void> | undefined
    let stops = 0
    let releases = 0
    ;({ lifecycle } = make({
      async onStart (scope) {
        scope.defer(() => {
          if (++releases === 1 && cleanup === 'failure') {
            throw reason
          }
        })
        scope.signal.addEventListener('abort', () => {
          stop = observe(lifecycle.stop())
          if (cleanup !== 'timeout') {
            gate.resolve()
          }
        }, { once: true })
        await gate.promise
      },
      onStop () { stops++ },
    }, { clock, startTimeoutMs: 10, stopTimeoutMs: cleanup === 'timeout' ? 25 : 1000 }))

    const started = observe(lifecycle.start())
    await clock.advance(10)
    assert.equal(errorName(started.error), 'LifecycleTimeoutError', 'the original caller receives the start timeout')
    assert.ok(stop, 'the abort listener issued stop()')

    if (cleanup === 'timeout') {
      await clock.advance(25)
      assert.equal(errorName(stop.error), 'LifecycleTimeoutError')
      assert.ok(lifecycle.state.kind === 'failed' && !lifecycle.state.cleanupComplete)
      gate.resolve()
    } else if (cleanup === 'failure') {
      assert.equal(stop.error, reason)
      assert.ok(lifecycle.state.kind === 'failed' && !lifecycle.state.cleanupComplete)
    } else {
      assert.equal(stop.status, 'resolved')
    }
    if (cleanup !== 'success') {
      const retried = await shutdown(lifecycle)
      assert.equal(retried.status, 'resolved')
    }
    assert.equal(lifecycle.state.kind, 'stopped')
    assert.equal(stops, 0, 'D8: no onStop for a generation that never reached running')
    assert.equal(releases, cleanup === 'failure' ? 2 : 1)
  })
}

for (const command of [ 'start', 'restart' ] as const) {
  contract(`C-TIME-02.b-${command}`, `a ${command}() issued from the start-timeout abort waits for the expired generation to retire`, { needs: [ 'clock' ] }, async ({ make }) => {
    const clock = new ManualClock()
    const release = Promise.withResolvers<void>()
    const trace: string[] = []
    let lifecycle!: Lifecycle
    let replacement: Observed<void> | undefined
    ;({ lifecycle } = make({
      async onStart (scope) {
        if (trace.length > 0) {
          trace.push('replacement')
          return
        }
        trace.push('first start')
        scope.defer(async () => {
          await release.promise
          trace.push('released')
        })
        scope.signal.addEventListener('abort', () => { replacement = observe(lifecycle[command]()) }, { once: true })
        await aborted(scope.signal)
      },
    }, { clock, startTimeoutMs: 10, stopTimeoutMs: 1000 }))

    const started = observe(lifecycle.start())
    await clock.advance(10)
    assert.equal(errorName(started.error), 'LifecycleTimeoutError')
    assert.deepEqual(lifecycle.state, { kind: 'stopping', generation: 1 })
    assert.ok(replacement)
    assert.equal(replacement.status, 'pending')

    release.resolve()
    await flush()
    assert.equal(replacement.status, 'resolved')
    assert.deepEqual(trace, [ 'first start', 'released', 'replacement' ])
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
    await shutdown(lifecycle)
  })
}

contract('C-TIME-02.c', 'after a start timeout the generation retires, waiting for its hook; onStop is never called', { needs: [ 'clock' ] }, async ({ make }) => {
  // Codex source test expected an immediate dirty `failed`, a refused start(), and
  // one onStop. Per C-RET-01 step 5 and C-TIME-02 the generation is `stopping`
  // while it waits for the hook, and per D8 there is no onStop.
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  let goodbye = 0
  const { lifecycle } = make({
    onStart () { return gate.promise },
    onStop () { goodbye++ },
  }, { clock, startTimeoutMs: 10 })
  const started = observe(lifecycle.start())
  await clock.advance(10)
  assert.equal(errorName(started.error), 'LifecycleTimeoutError')
  assert.deepEqual(lifecycle.state, { kind: 'stopping', generation: 1 }, 'still retiring: the hook has not settled')

  const stopped = observe(lifecycle.stop())
  gate.reject(new Error('late startup failure'))
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(goodbye, 0)
})

contract('C-TIME-03.a', 'a stop deadline leaves onStop running with live resources, and a later stop() joins it', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  let hooks = 0
  let releases = 0
  let seenInStop: { releases: number, aborted: boolean } | undefined
  let current: { signal: AbortSignal } | undefined
  const { lifecycle } = make({
    onStart (scope) {
      current = scope
      scope.defer(() => { releases++ })
    },
    async onStop () {
      hooks++
      await gate.promise
      seenInStop = { releases, aborted: current!.signal.aborted }
    },
  }, { clock, stopTimeoutMs: 10 })
  await lifecycle.start()

  const first = observe(lifecycle.stop())
  await clock.advance(10)
  assert.equal(errorName(first.error), 'LifecycleTimeoutError')
  assert.equal(releases, 0)
  assert.equal(hooks, 1)
  assert.ok(lifecycle.state.kind === 'failed' && !lifecycle.state.cleanupComplete)

  const refused = observe(lifecycle.restart())
  await flush()
  assert.equal(errorName(refused.error), 'LifecycleUnsafeStateError')

  const retry = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(retry.status, 'resolved')
  assert.equal(hooks, 1, 'onStop is joined, never called twice')
  assert.equal(releases, 1)
  assert.deepEqual(seenInStop, { releases: 0, aborted: false })
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-TIME-03.b', 'an onStop that rejects after its stop deadline is reported once, to the stop() that joins it', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  const cause = new Error('late stop-hook rejection')
  let calls = 0
  const { lifecycle } = make({
    onStart () {},
    onStop () {
      calls++
      return gate.promise
    },
  }, { clock, stopTimeoutMs: 10 })
  await lifecycle.start()
  const first = observe(lifecycle.stop())
  await clock.advance(10)
  assert.equal(errorName(first.error), 'LifecycleTimeoutError')

  const second = observe(lifecycle.stop())
  gate.reject(cause)
  await flush()
  assert.equal(second.error, cause)
  assert.ok(lifecycle.state.kind === 'failed')
  assert.equal(lifecycle.state.cleanupError, cause)

  const third = await shutdown(lifecycle)
  assert.equal(third.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(calls, 1)
})

contract('C-TIME-03.c', 'a stop() joining a timed-out pass retries the release that failed in it, at once, and still reports that failure (D36)', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  const reason = new Error('first release failed')
  const trace: string[] = []
  let tries = 0
  const { lifecycle } = make({
    onStart (scope) {
      scope.defer(() => { trace.push('first') })
      scope.defer(() => {
        trace.push('second')
        return ++tries === 1 ? gate.promise : undefined
      })
    },
  }, { clock, stopTimeoutMs: 10 })
  await lifecycle.start()
  const first = observe(lifecycle.stop())
  await clock.advance(10)
  assert.equal(errorName(first.error), 'LifecycleTimeoutError')

  const joining = observe(lifecycle.stop())
  // Read through a call: an assertion would narrow `joining.status` statically.
  const status = () => joining.status
  await flush()
  assert.deepEqual(trace, [ 'second' ], 'the joining stop() did not start the pending release again')
  assert.equal(status(), 'pending', 'the joining stop() waits for the release it joined')
  gate.reject(reason)
  await flush()
  assert.deepEqual(trace, [ 'second', 'first', 'second' ], 'the failed release was retried once, by the same stop()')
  assert.equal(status(), 'rejected')
  assert.equal(joining.error, reason, 'the joined failure is still reported')
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'stop')
  assert.equal(failed.cleanupComplete, true, 'the retry released everything')

  await shutdown(lifecycle)
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.deepEqual(trace, [ 'second', 'first', 'second' ], 'nothing left to release')
})

contract('C-TIME-03.d', 'the stop deadline covers joining tasks, and resources stay live until the task returns', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const taskEntered = Promise.withResolvers<void>()
  const finishTask = Promise.withResolvers<void>()
  let released = false
  let releasedDuringTask: boolean | undefined
  const { lifecycle } = make({
    onStart (scope) {
      scope.defer(() => { released = true })
      scope.spawn(async signal => {
        taskEntered.resolve()
        await aborted(signal)
        await finishTask.promise
        releasedDuringTask = released
      })
    },
  }, { clock, stopTimeoutMs: 10 })
  await lifecycle.start()
  await taskEntered.promise

  const first = observe(lifecycle.stop())
  await clock.advance(10)
  assert.equal(errorName(first.error), 'LifecycleTimeoutError')
  assert.equal(released, false)

  const second = observe(lifecycle.stop())
  finishTask.resolve()
  await flush()
  assert.equal(second.status, 'resolved')
  assert.equal(released, true)
  assert.equal(releasedDuringTask, false)
})

// ---------------------------------------------------------------------------
// Ported from the Claude suite (src/async-lifecycle-claude/engine.test.ts)
// ---------------------------------------------------------------------------

contract('C-TIME-01.a', 'a deadline must be finite, greater than 0 and at most 2^31-1, or construction throws RangeError (D11)', {}, async ({ make }) => {
  // The Claude source test also accepted 0; D11 refuses it.
  for (const bad of [ Number.NaN, -1, 0, Number.POSITIVE_INFINITY, 2 ** 31 ]) {
    assert.throws(() => make({ onStart () {} }, { startTimeoutMs: bad }), RangeError, `startTimeoutMs ${bad}`)
    assert.throws(() => make({ onStart () {} }, { stopTimeoutMs: bad }), RangeError, `stopTimeoutMs ${bad}`)
  }
  make({ onStart () {} }, { startTimeoutMs: 1, stopTimeoutMs: 2 ** 31 - 1 })
})

contract('C-TIME-02.d', 'the start deadline fails the attempt, aborts the scope, and leaves no timer behind', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const { lifecycle } = make({
    onStart: scope => new Promise((_resolve, reject) => scope.signal.addEventListener('abort', () => reject(scope.signal.reason))),
  }, { startTimeoutMs: 100, clock })
  const started = observe(lifecycle.start())
  await clock.advance(99)
  assert.equal(started.status, 'pending')
  await clock.advance(1)
  assert.equal(errorName(started.error), 'LifecycleTimeoutError')
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'start')
  assert.equal(failed.cleanupComplete, true)
  assert.equal(clock.pending, 0, 'no timer is left behind')
})

contract('C-TIME-03.e', 'the stop deadline bounds a stop() that waits on an onStart ignoring abort', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart: () => gate.promise }, { stopTimeoutMs: 50, clock })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop())
  await clock.advance(60)
  assert.equal(errorName(stopped.error), 'LifecycleTimeoutError')
  assert.equal(started.status, 'rejected')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
  gate.resolve()
  await flush()
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-TIME-03.f', 'an onStart that ignores its start deadline keeps the generation dirty, refusing start(), until it settles', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart: () => gate.promise }, { startTimeoutMs: 100, stopTimeoutMs: 50, clock })
  const started = observe(lifecycle.start())
  await clock.advance(150)
  assert.equal(errorName(started.error), 'LifecycleTimeoutError')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false, 'the retirement hit its own deadline waiting for the hook')
  const refused = observe(lifecycle.start())
  await flush()
  assert.equal(errorName(refused.error), 'LifecycleUnsafeStateError')
  gate.resolve()
  await flush()
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-TIME-03.g', 'a release that hangs past the stop deadline is joined by the next stop(), not run again', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  let releases = 0
  const { lifecycle } = make({
    onStart: scope => scope.defer(() => { releases++; return gate.promise }),
  }, { stopTimeoutMs: 100, clock })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await clock.advance(100)
  assert.equal(errorName(stopped.error), 'LifecycleTimeoutError')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
  const retry = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(retry.status, 'resolved')
  assert.equal(releases, 1, 'the running release is joined, not repeated')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-TIME-03.h', 'one stop() has one deadline that covers joining earlier work and retrying what failed in it (D36)', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const first = Promise.withResolvers<void>()
  let calls = 0
  const { lifecycle } = make({
    onStart: scope => scope.defer(() => (++calls === 1 ? first.promise : new Promise(() => {}))),
  }, { stopTimeoutMs: 100, clock })
  await lifecycle.start()
  const stopping = observe(lifecycle.stop())
  await clock.advance(100)
  assert.equal(stopping.status, 'rejected')

  const retry = observe(lifecycle.stop())
  await clock.advance(50)
  first.reject(new Error('old release failed'))
  await flush()
  assert.equal(calls, 2, 'the failed release is retried in the same pass')
  await clock.advance(49)
  assert.equal(retry.status, 'pending')
  await clock.advance(1)
  assert.equal(errorName(retry.error), 'LifecycleTimeoutError', 'the retry shares the joining stop()\'s 100 ms')
})

for (const yields of [ false, true ]) {
  contract(`C-TIME-05.a-${yields ? 'after' : 'before'}`, `synchronous work ${yields ? 'after' : 'before'} a microtask in onStart counts against the start deadline (D30)`, { needs: [ 'clock' ] }, async ({ make }) => {
    // Ported from the Codex suite, which blocked the thread with Atomics.wait.
    // jump() is the same thing on the manual clock: time passes, no timer runs.
    const clock = new ManualClock()
    let running = 0
    const { lifecycle } = make({
      async onStart () {
        if (yields) {
          await Promise.resolve()
        }
        clock.jump(30)
      },
      onStateChange (state) { if (state.kind === 'running') { running++ } },
    }, { clock, startTimeoutMs: 10 })
    const started = observe(lifecycle.start())
    await flush()
    await clock.advance(0)
    assert.equal(errorName(started.error), 'LifecycleTimeoutError', 'onStart settled after its deadline')
    assert.equal(running, 0, 'running is never published past the deadline')
    await shutdown(lifecycle)
  })
}

contract('C-TIME-05.b', 'a release that blocks past the stop deadline makes that stop() a timeout, and is not run again (D30)', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  let releases = 0
  const { lifecycle } = make({
    onStart: scope => scope.defer(() => { releases++; clock.jump(30) }),
  }, { clock, stopTimeoutMs: 10 })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  await clock.advance(0)
  assert.equal(errorName(stopped.error), 'LifecycleTimeoutError')
  assert.equal(failedState(lifecycle.state).phase, 'stop')
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(releases, 1)
})

for (const retiring of [ 'starting', 'running', 'late' ] as const) {
  const what = retiring === 'late' ? 'while a late release runs on the idle instance (C-SCOPE-11)' : `while the ${retiring} generation is still live`
  contract(`C-TIME-05.c-${retiring}`, `restart()'s stop deadline starts when it is accepted, ${what} (D30, C-TIME-03)`, { needs: [ 'clock' ] }, async ({ make }) => {
    const clock = new ManualClock()
    const entered = Promise.withResolvers<void>()
    let starts = 0
    let retired: LifecycleScope | undefined
    const { lifecycle } = make({
      async onStart (scope) {
        retired ??= scope
        if (++starts === 1 && retiring === 'starting') {
          // A synchronous abort listener blocks the thread before retirement work begins.
          scope.signal.addEventListener('abort', () => clock.jump(40), { once: true })
          entered.resolve()
          await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
        }
      },
    }, { clock, stopTimeoutMs: 10 })
    const first = observe(lifecycle.start())
    if (retiring === 'starting') {
      await entered.promise
    } else {
      await flush()
      assert.equal(first.status, 'resolved')
    }
    const release = Promise.withResolvers<void>()
    if (retiring === 'late') {
      await lifecycle.stop()
      assert.throws(() => retired!.defer(() => release.promise), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
    }
    const restarted = observe(lifecycle.restart())
    if (retiring !== 'starting') {
      clock.jump(40) // the thread is blocked right after restart() is accepted
    }
    release.resolve()
    await flush()
    await clock.advance(0)
    assert.equal(errorName(restarted.error), 'LifecycleTimeoutError', 'the stop budget ran from acceptance')
    assert.equal(starts, 1, 'no replacement after a timed-out retirement')
    assert.equal(failedState(lifecycle.state).cleanupComplete, false)
    await shutdown(lifecycle)
  })
}

/**
 * Run `block` after `turns` microtask turns: time that passes after a hook or
 * release has settled but before the lifecycle commits its outcome. Where that
 * window lies depends on the kernel's own promise chain, so the C-TIME-05.d
 * tests sweep `turns` instead of assuming a count.
 */
function afterTurns (turns: number, block: () => void): void {
  const tick = () => {
    if (turns-- > 0) {
      queueMicrotask(tick)
    } else {
      block()
    }
  }
  queueMicrotask(tick)
}

/** Enough turns to cover the gap between settlement and commit in any kernel. */
const SWEEP = 40

contract('C-TIME-05.d-start', 'time passing after onStart settled but before `running` is committed still counts against the start deadline (D30)', { needs: [ 'clock' ] }, async ({ make }) => {
  // Ported from the Codex suite ("queued microtasks cannot publish running after
  // the startup deadline"), which used one turn count tuned to its kernel.
  for (let turns = 0; turns < SWEEP; turns++) {
    const clock = new ManualClock()
    const committedAt: number[] = []
    const { lifecycle } = make({
      onStart () { afterTurns(turns, () => clock.jump(30)) },
      onStateChange (state) { if (state.kind === 'running') { committedAt.push(clock.now()) } },
    }, { clock, startTimeoutMs: 10 })
    const started = observe(lifecycle.start())
    await flush()
    await clock.advance(0)
    if (started.status === 'resolved') {
      assert.ok(committedAt[0]! <= 10, `turn ${turns}: \`running\` was committed at ${committedAt[0]}, past the 10 ms deadline`)
    } else {
      assert.equal(errorName(started.error), 'LifecycleTimeoutError', `turn ${turns}`)
      assert.deepEqual(committedAt, [], `turn ${turns}: running is never published past the deadline`)
    }
    await shutdown(lifecycle)
  }
})

for (const late of [ false, true ]) {
  contract(`C-TIME-05.d-stop-${late ? 'late' : 'active'}`, `time passing after ${late ? 'a late release' : 'the last release'} settled but before \`stopped\` is committed still counts against the stop deadline (D30${late ? ', C-SCOPE-11' : ''})`, { needs: [ 'clock' ] }, async ({ make }) => {
    // Ported from the Codex suite ("stop checks its deadline before committing
    // active / detached cleanup", and "a stop joining detached cleanup receives
    // the same deadline outcome"), sweeping the turn count as C-TIME-05.d-start does.
    for (let turns = 0; turns < SWEEP; turns++) {
      const clock = new ManualClock()
      const committedAt: number[] = []
      const gate = Promise.withResolvers<void>()
      let releases = 0
      let retired: LifecycleScope | undefined
      let joined: Observed<void> | undefined
      const release = () => {
        releases++
        afterTurns(turns, () => {
          if (late) {
            // A stop() that joins in the window shares the outcome (C-RET-05).
            joined = observe(lifecycle.stop())
          }
          clock.jump(30)
        })
      }
      const { lifecycle } = make({
        onStart (scope) {
          retired = scope
          if (!late) {
            scope.defer(release)
          }
        },
        onStateChange (state) { if (state.kind === 'stopped') { committedAt.push(clock.now()) } },
      }, { clock, stopTimeoutMs: 10 })
      await lifecycle.start()
      if (late) {
        await lifecycle.stop()
        committedAt.length = 0
        assert.throws(() => retired!.defer(() => gate.promise.then(release)), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
      }
      const stopped = observe(lifecycle.stop())
      gate.resolve()
      await flush()
      await clock.advance(0)
      if (stopped.status === 'resolved') {
        assert.equal(committedAt.length, 1, `turn ${turns}: stop() resolved with one \`stopped\` commit (C-SCOPE-11)`)
        assert.ok(committedAt[0]! <= 10, `turn ${turns}: \`stopped\` was committed at ${committedAt[0]}, past the 10 ms deadline`)
      } else {
        assert.equal(errorName(stopped.error), 'LifecycleTimeoutError', `turn ${turns}`)
        assert.deepEqual(committedAt, [], `turn ${turns}`)
        if (late) {
          assert.equal(joined?.error, stopped.error, `turn ${turns}: the joining stop() gets the same timeout`)
        }
        const final = await shutdown(lifecycle)
        assert.equal(final.status, 'resolved', `turn ${turns}: the next stop() completes`)
        assert.equal(lifecycle.state.kind, 'stopped')
      }
      assert.equal(releases, 1, `turn ${turns}: a release that succeeded is not run again`)
    }
  })
}

contract('C-TIME-05.e', 'a late release that fails while a start waits, past the start deadline, makes the start a timeout and is still left for a stop() (D30, C-SCOPE-11)', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  const reason = new Error('late release failed')
  let retired: LifecycleScope | undefined
  let calls = 0
  const { lifecycle } = make({
    onStart (scope) {
      const first = retired
      if (first) {
        // The second run's start registers a late release on the first run.
        assert.throws(() => first.defer(() => (++calls === 1 ? gate.promise : undefined)), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
      } else {
        retired = scope
      }
    },
  }, { clock, startTimeoutMs: 10 })
  await lifecycle.start()
  await lifecycle.stop()
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(lifecycle.state.kind, 'starting', 'the start waits for the late release')
  clock.jump(30) // the thread was blocked past the start deadline
  gate.reject(reason)
  await flush()
  assert.equal(errorName(started.error), 'LifecycleTimeoutError', 'judged by the clock when the outcome is committed')
  assert.equal(calls, 1, 'the failed start does not retry the debt')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false, 'the debt is left for a stop()')
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(calls, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-TIME-05.f', 'a deadline timer that fires before the clock reaches the deadline does not expire it (D30)', { needs: [ 'clock' ] }, async ({ make }) => {
  // A real timer truncates a fractional delay, so it can fire up to a
  // millisecond early; this clock does the same.
  const manual = new ManualClock()
  const clock = {
    now          : () => manual.now(),
    setTimeout   : (callback: () => void, ms: number) => manual.setTimeout(callback, Math.trunc(ms)),
    clearTimeout : (handle: unknown) => manual.clearTimeout(handle),
  }
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({
    onStart () {
      manual.jump(0.5) // the remaining 9.5 ms is armed as a 9 ms timer
      return gate.promise
    },
  }, { clock, startTimeoutMs: 10 })
  const started = observe(lifecycle.start())
  await manual.advance(9)
  assert.equal(started.status, 'pending', 'at 9.5 ms the 10 ms deadline has not passed')
  gate.resolve()
  await flush()
  assert.equal(started.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'running')
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// Ported from the Copilot suite (src/async-lifecycle-copilot/async-lifecycle.test.ts)
// ---------------------------------------------------------------------------

contract('C-TIME-03.i', 'an onStop that rejects after its stop deadline, before any stop() joins, is reported by the next stop()', { needs: [ 'clock' ] }, async ({ make }) => {
  // The other timing of C-TIME-03.b: the rejection arrives while nobody waits.
  const clock = new ManualClock()
  const gate = Promise.withResolvers<void>()
  const cause = new Error('late stop-hook rejection')
  let calls = 0
  const { lifecycle } = make({
    onStart () {},
    onStop () {
      calls++
      return gate.promise
    },
  }, { clock, stopTimeoutMs: 10 })
  await lifecycle.start()
  const first = observe(lifecycle.stop())
  await clock.advance(10)
  assert.equal(errorName(first.error), 'LifecycleTimeoutError')
  gate.reject(cause)
  await flush()

  const second = observe(lifecycle.stop())
  await flush()
  assert.equal(second.error, cause, 'errors are never dropped')
  const failed = failedState(lifecycle.state)
  assert.equal(failed.cleanupError, cause)
  assert.equal(failed.cleanupComplete, true, 'onStop is never retried, and nothing else is owned')

  const third = await shutdown(lifecycle)
  assert.equal(third.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(calls, 1)
})
