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
 * The six #2905 traces (§3.8), inverted into acceptance tests for the new
 * module. Each replays the scenario of the reproduction script in
 * wechaty/wechaty#2905 (comment 6819182496) against the S1 API and asserts the
 * behavior the old `state-switch` controller got wrong. Most behaviors also
 * have a clause test elsewhere; these keep the motivating regressions as
 * whole, recognizable scenarios, as `bugs.test.ts` does for B1 to B3.
 *
 * Lifecycle promises are observed and settled with `flush()`, never awaited,
 * so an implementation that hangs fails the test instead of hanging the run.
 */

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import type { LifecycleRecoverResult, LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, ManualClock, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

/** A hook body that waits on a gate the test opens, logging entry and exit. */
function gated (trace: string[], name: string, gates: PromiseWithResolvers<void>[]) {
  return async () => {
    trace.push(`${name}>`)
    const gate = Promise.withResolvers<void>()
    gates.push(gate)
    await gate.promise
    trace.push(`${name}<`)
  }
}

contract('2905-A', 'two start()s queued behind an in-flight stop() enter onStart once, never concurrently (C-CMD-03, C-CMD-06)', {}, async ({ make }) => {
  // Old: both callers passed the active check and onStart was entered twice.
  const trace: string[] = []
  const starts: PromiseWithResolvers<void>[] = []
  const stops: PromiseWithResolvers<void>[] = []
  const { lifecycle } = make({ onStart: gated(trace, 'onStart', starts), onStop: gated(trace, 'onStop', stops) })
  const first = observe(lifecycle.start())
  await flush()
  starts[0]!.resolve()
  await flush()
  assert.equal(first.status, 'resolved')

  const stopped = observe(lifecycle.stop())
  await flush()
  const a = observe(lifecycle.start())
  const b = observe(lifecycle.start())
  await flush()
  stops[0]!.resolve()
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(starts.length, 2, 'one more onStart, not two')
  starts[1]!.resolve()
  await flush()
  assert.deepEqual([ a.status, b.status ], [ 'resolved', 'resolved' ])
  assert.deepEqual(trace, [ 'onStart>', 'onStart<', 'onStop>', 'onStop<', 'onStart>', 'onStart<' ])
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

for (const supervisor of [ 'recover', 'restart' ] as const) {
  contract(`2905-B-${supervisor}`, `a supervisor ${supervisor === 'recover' ? 'scope.recover()' : 'restart()'} racing a user stop() never restarts the stopped service (C-REC-04, C-CMD-07)`, { needs: supervisor === 'recover' ? [ 'scope.recover' ] : [] }, async ({ make }) => {
    // Old: reset() waited on stable(), then started the service the user had
    // just stopped. Trace `onStart> onStart< onStop> onStop< onStart> onStart<`.
    const trace: string[] = []
    const starts: PromiseWithResolvers<void>[] = []
    const stops: PromiseWithResolvers<void>[] = []
    let scope: LifecycleScope | undefined
    const { lifecycle } = make({
      onStart: async current => { scope ??= current; await gated(trace, 'onStart', starts)() },
      onStop: gated(trace, 'onStop', stops),
    })
    const started = observe(lifecycle.start())
    await flush()
    starts[0]!.resolve()
    await flush()
    assert.equal(started.status, 'resolved')

    const reset = supervisor === 'recover'
      ? observe<LifecycleRecoverResult | void>(scope!.recover(new Error('watchdog')))
      : observe<LifecycleRecoverResult | void>(lifecycle.restart())
    await flush()
    const stopped = observe(lifecycle.stop())
    await flush()
    for (const gate of stops) {
      gate.resolve()
    }
    await flush()
    for (const gate of starts) {
      gate.resolve()
    }
    await flush()
    assert.equal(stopped.status, 'resolved')
    if (supervisor === 'recover') {
      assert.equal(reset.value, 'superseded')
    } else {
      assert.equal(errorName(reset.error), 'LifecycleSupersededError')
    }
    assert.deepEqual(trace, [ 'onStart>', 'onStart<', 'onStop>', 'onStop<' ], 'the service is not started again')
    assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
  })
}

contract('2905-C', 'stop() during a slow onStart that ignores abort never reports success early, and the late completion never publishes running (C-CMD-07, C-TIME-03)', { needs: [ 'clock' ] }, async ({ make }) => {
  // Old: stop() resolved `inactive` after a 5 s timeout, then the late onStart
  // published `active === true` on the stopped service.
  const clock = new ManualClock()
  const trace: string[] = []
  const starts: PromiseWithResolvers<void>[] = []
  const running: number[] = []
  const { lifecycle } = make({
    onStart: gated(trace, 'onStart', starts),
    onStateChange (state) { if (state.kind === 'running') { running.push(state.generation) } },
  }, { clock, stopTimeoutMs: 5000 })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop())
  await clock.advance(5000)
  assert.equal(errorName(stopped.error), 'LifecycleTimeoutError', 'a timeout is not a successful stop')
  const dirty = failedState(lifecycle.state)
  assert.equal(dirty.phase, 'stop')
  assert.equal(dirty.cleanupComplete, false, 'the hook is still running')

  starts[0]!.resolve()
  await flush()
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.deepEqual(running, [], 'the late completion never publishes running')
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('2905-D', 'a failing onStart with no listener anywhere rejects start(), and the instance stays usable (C-CMD-14, C-CMD-09)', {}, async ({ make }) => {
  // Old: with no `error` listener the state stayed `pending`, a second start()
  // never settled, and stop() timed out: the instance was unrecoverable.
  const boom = new Error('boom')
  let calls = 0
  const { lifecycle } = make({ onStart () { calls++; throw boom } })
  const first = observe(lifecycle.start())
  await flush()
  assert.equal(first.error, boom)
  assert.equal(failedState(lifecycle.state).phase, 'start')
  const second = observe(lifecycle.start())
  await flush()
  assert.equal(second.error, boom, 'a second start() runs a new attempt and settles')
  assert.equal(calls, 2)
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 2 })
})

contract('2905-E', 'after a failing onStart, start() rejects, a readiness wait rejects, and a state observer sees `failed` (C-CMD-16, C-COND-04)', {}, async ({ make }) => {
  // Old: a stable('active') waiter never settled. The fix separates attempt
  // results (start() rejects), readiness (the condition wait rejects) and
  // observation (whenState sees the failed snapshot).
  const boom = new Error('boom')
  const subject = make({ onStart () { throw boom } })
  const { lifecycle } = subject
  const ready = observe(subject.condition('ready').wait())
  const settled = observe(lifecycle.whenState(state => state.kind === 'running' || state.kind === 'failed'))
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(started.error, boom)
  assert.equal(settled.value?.kind, 'failed')
  assert.equal(ready.status, 'rejected', 'the readiness wait settles')
  assert.equal(errorName(ready.error), 'LifecycleSupersededError', 'D28')
  assert.equal((ready.error as Error).cause, boom)
})

contract('2905-F', 'start/stop three times leaves no ready, logout or reset listener behind (C-SCOPE-03)', {}, async ({ make }) => {
  // Old: readyMixin added the listeners on every start() and never removed
  // them: counts went 1, 2, 3. The `listen` companion (S4) will replace the
  // `on` plus `defer(off)` pairs.
  const puppet = new EventEmitter()
  const events = [ 'ready', 'logout', 'reset' ] as const
  const counts = () => events.map(event => puppet.listenerCount(event))
  const { lifecycle } = make({
    onStart (scope) {
      for (const event of events) {
        const listener = () => {}
        puppet.on(event, listener)
        scope.defer(() => puppet.off(event, listener))
      }
    },
  })
  for (let cycle = 1; cycle <= 3; cycle++) {
    await lifecycle.start()
    assert.deepEqual(counts(), [ 1, 1, 1 ], `cycle ${cycle}: one listener each while running`)
    await lifecycle.stop()
    assert.deepEqual(counts(), [ 0, 0, 0 ], `cycle ${cycle}: none after stop()`)
  }
})
