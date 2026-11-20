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

import type { Lifecycle } from '../types.ts'
import { errorName, flush, ManualClock, observe, type Observed, shutdown } from './harness.ts'
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

contract('C-TIME-03.c', 'a release still running at the stop deadline is joined, and only failed releases are retried', { needs: [ 'clock' ] }, async ({ make }) => {
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

  // C-TIME-03 lets the joining stop() either report the pass's failure or retry
  // it at once; this test checks only what holds either way.
  const joining = observe(lifecycle.stop())
  // Read through a call: an assertion would narrow `joining.status` statically.
  const status = () => joining.status
  await flush()
  assert.deepEqual(trace, [ 'second' ], 'the joining stop() did not start the pending release again')
  assert.equal(status(), 'pending', 'the joining stop() waits for the release it joined')
  gate.reject(reason)
  await flush()
  assert.deepEqual(trace.slice(0, 2), [ 'second', 'first' ], 'the pass continued past the failure, newest first')
  assert.ok(
    status() === 'resolved' || (status() === 'rejected' && joining.error === reason),
    `the joining stop() either retried and resolved, or reported the release error; got ${status()} ${String(joining.error)}`,
  )

  await shutdown(lifecycle)
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.deepEqual(trace, [ 'second', 'first', 'second' ], 'only the failed release was retried, once')
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
