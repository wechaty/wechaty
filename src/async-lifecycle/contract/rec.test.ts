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
 * Contract tests for failure and recovery (README §9, C-REC-*).
 *
 * The Codex comparison implementation recovers through an owner-level
 * `recover(observedState)` instead of `scope.recover()` (not adopted in S1), so
 * its recovery tests are ported here as the `scope.recover()` behavior they
 * protect, and Codex is skipped for lack of `scope.recover`.
 *
 * `scope.recover()` returns its decision synchronously (D42), so these tests
 * assert the returned value at the call and read the recovery's outcome from
 * the lifecycle state.
 */

import assert from 'node:assert/strict'

import type { LifecycleRecoverResult, LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, observe, shutdown, stateTrace } from './harness.ts'
import { contract } from './suite.ts'

contract('C-REC-02.a', 'a running generation can recover into a fresh one, again and again', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let scope: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (current) { scope = current } })
  await lifecycle.start()
  for (let generation = 1; generation <= 2; generation++) {
    assert.equal(scope!.recover(new Error(`stale ${generation}`)), 'accepted')
    await flush()
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: generation + 1 })
  }
  await shutdown(lifecycle)
})

contract('C-REC-03.a', 'stop() during the replacement\'s startup supersedes the recovery, and the instance ends stopped, not failed', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let first: LifecycleScope | undefined
  const replacementEntered = Promise.withResolvers<void>()
  const { lifecycle } = make({
    async onStart (scope) {
      if (!first) {
        first = scope
        return
      }
      // The replacement is still `starting`, like an offline Io retrying (C-REC-06).
      replacementEntered.resolve()
      await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
    },
  })
  await lifecycle.start()
  assert.equal(first!.recover(new Error('needs recovery')), 'accepted')
  await replacementEntered.promise
  assert.equal(lifecycle.state.kind, 'starting')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-REC-03.b', 'recover() before `running` acts like fail(): the first boot fails fast and the result is `failed`', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const reason = new Error('bad credentials')
  let result: LifecycleRecoverResult | undefined
  const { lifecycle } = make({
    onStart (scope) {
      result = scope.recover(reason)
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(result, 'failed', 'decided at once (D42)')
  assert.equal(started.error, reason)
  assert.ok(lifecycle.state.kind === 'failed')
  assert.equal(lifecycle.state.phase, 'start')
  await shutdown(lifecycle)
})

contract('C-REC-03.c', 'recover() from a retired scope returns `superseded` and changes nothing', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let first: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { first ??= scope } })
  await lifecycle.start()
  await lifecycle.restart()
  const snapshot = lifecycle.state
  assert.equal(first!.recover(new Error('stale')), 'superseded')
  await flush()
  assert.equal(lifecycle.state, snapshot)
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// Ported from the Claude suite (src/async-lifecycle-claude/engine.test.ts)
// ---------------------------------------------------------------------------

contract('C-REC-02.b', 'recover() goes running, stopping, starting, running, with no stopped or failed in between', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const trace = stateTrace()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope }, onStateChange: trace.onStateChange })
  await lifecycle.start()
  assert.equal(saved!.recover(new Error('stale socket')), 'accepted')
  await flush()
  assert.deepEqual(trace.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'starting:2', 'running:2' ])
  await shutdown(lifecycle)
})

contract('C-REC-03.d', 'an accepted recovery whose replacement fails, or whose retirement leaves debt, ends `failed` (D42)', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const boom = new Error('boom')
  let saved: LifecycleScope | undefined
  const a = make({ onStart (scope) { saved = scope; if (scope.generation === 2) { throw boom } } })
  await a.lifecycle.start()
  assert.equal(saved!.recover(), 'accepted', 'the decision, not the outcome')
  await flush()
  const replaced = failedState(a.lifecycle.state)
  assert.equal(replaced.generation, 2)
  assert.equal(replaced.error, boom)

  const release = new Error('release')
  const b = make({ onStart (scope) { saved = scope; scope.defer(() => { throw release }) } })
  await b.lifecycle.start()
  assert.equal(saved!.recover(), 'accepted')
  await flush()
  const retired = failedState(b.lifecycle.state)
  assert.equal(retired.generation, 1, 'no replacement after a failed retirement')
  assert.equal(retired.cleanupComplete, false)
})

contract('C-REC-04.a', 'a user stop() during recovery wins: the recovery is superseded and the lifecycle ends stopped (#2905 B)', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  let starts = 0
  const { lifecycle } = make({ onStart (scope) { starts++; saved = scope }, onStop: () => gate.promise })
  await lifecycle.start()
  assert.equal(saved!.recover(), 'accepted')
  await flush()
  const stopped = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(starts, 1, 'no replacement')
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
})

contract('C-REC-04.b', 'a user start() during a recovery\'s retirement joins the replacement', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  // The Claude source test expected the recovery to be superseded. C-REC-03
  // (revised in the S1 review) decides that a start() joins the replacement.
  const gate = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  let starts = 0
  const { lifecycle } = make({ onStart (scope) { starts++; saved = scope }, onStop: () => gate.promise })
  await lifecycle.start()
  assert.equal(saved!.recover(), 'accepted')
  await flush()
  const started = observe(lifecycle.start())
  gate.resolve()
  await flush()
  assert.equal(started.status, 'resolved')
  assert.equal(starts, 2, 'one replacement, shared')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-REC-04.c', 'a user start() while the recovery\'s replacement is starting joins it', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope; return scope.generation === 2 ? gate.promise : undefined } })
  await lifecycle.start()
  assert.equal(saved!.recover(), 'accepted')
  await flush()
  assert.deepEqual(lifecycle.state, { kind: 'starting', generation: 2 })
  const started = observe(lifecycle.start())
  gate.resolve()
  await flush()
  assert.equal(started.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-REC-04.d', 'a start() that joined a recovery is still superseded by a later stop()', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({
    onStart (scope) {
      saved = scope
      if (scope.generation === 2) {
        return new Promise((_resolve, reject) => scope.signal.addEventListener('abort', () => reject(scope.signal.reason)))
      }
      return undefined
    },
  })
  await lifecycle.start()
  assert.equal(saved!.recover(), 'accepted')
  await flush()
  const started = observe(lifecycle.start())
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-REC-05.a', 'a task may request recovery with `scope.recover()` and return', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const trigger = Promise.withResolvers<void>()
  let result: LifecycleRecoverResult | undefined
  const { lifecycle } = make({
    onStart (scope) {
      if (scope.generation === 1) {
        scope.spawn(async () => { await trigger.promise; result = scope.recover() })
      }
    },
  })
  await lifecycle.start()
  trigger.resolve()
  await flush()
  assert.equal(result, 'accepted')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-REC-01.a', 'scope.fail(undefined) on a running generation fails it, phase `run`, keeping the value as given', {}, async ({ make }) => {
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope } })
  await lifecycle.start()
  saved!.fail(undefined)
  await flush()
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'run')
  assert.equal(failed.error, undefined)
  assert.equal(failed.cleanupComplete, true)
})

// ---------------------------------------------------------------------------
// Ported from the Copilot suite (src/async-lifecycle-copilot/async-lifecycle.test.ts)
// ---------------------------------------------------------------------------

for (const when of [ 'at-once', 'during-release' ] as const) {
  contract(`C-REC-05.b-${when}`, `a task that requested recovery and then rejects ${when === 'at-once' ? 'at once' : 'after its signal aborted'} is a cleanup error: failed { stop } and no replacement (C-SCOPE-07)`, { needs: [ 'scope.recover' ] }, async ({ make }) => {
    // The requesting task is joined like any other (C-REC-05, D42); its
    // rejection while the generation retires is a cleanup error (C-SCOPE-07),
    // so the replacement does not start (C-RET-06).
    const requesterError = new Error('recovery requester failed')
    const go = Promise.withResolvers<void>()
    let starts = 0
    let result: LifecycleRecoverResult | undefined
    const { lifecycle } = make({
      onStart (scope) {
        if (++starts > 1) {
          return
        }
        scope.spawn(async signal => {
          await go.promise
          result = scope.recover()
          if (when === 'during-release') {
            await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))
          }
          throw requesterError
        })
      },
    })
    await lifecycle.start()
    go.resolve()
    await flush()
    assert.equal(result, 'accepted')
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'stop')
    assert.equal(failed.error, requesterError)
    assert.equal(failed.cleanupComplete, true)
    assert.equal(starts, 1, 'no replacement after a failed retirement')
  })
}

for (const rejects of [ false, true ]) {
  const key = rejects ? 'C-REC-05.d' : 'C-REC-05.c'
  const title = rejects
    ? 'a task that calls recover() while a recovery already retires, then rejects, is a cleanup error: failed { stop }, and no replacement (C-SCOPE-07)'
    : 'a task that calls recover() while a recovery already retires gets \'superseded\' at once and is joined as usual'
  contract(key, title, { needs: [ 'scope.recover' ] }, async ({ make }) => {
    // The Copilot suite made such a late caller exempt from the join too; C-REC-03
    // and C-REC-05 make it a caller on a retiring scope: it gets 'superseded', it
    // is joined like any other task, and its rejection is a cleanup error.
    const requesterError = new Error('late recovery requester failed')
    const go = Promise.withResolvers<void>()
    const hold = Promise.withResolvers<void>()
    let first: LifecycleScope | undefined
    let late: LifecycleRecoverResult | undefined
    let starts = 0
    const { lifecycle } = make({
      onStart (scope) {
        starts++
        if (first) {
          return
        }
        first = scope
        scope.spawn(async () => {
          await go.promise
          late = scope.recover()
          await hold.promise
          if (rejects) {
            throw requesterError
          }
        })
      },
    })
    await lifecycle.start()
    assert.equal(first!.recover(), 'accepted')
    await flush()
    go.resolve()
    await flush()
    assert.equal(late, 'superseded')
    assert.equal(lifecycle.state.kind, 'stopping', 'the late caller is joined')
    assert.equal(starts, 1)
    hold.resolve()
    await flush()
    if (rejects) {
      const failed = failedState(lifecycle.state)
      assert.equal(failed.phase, 'stop')
      assert.equal(failed.error, requesterError)
      assert.equal(failed.cleanupComplete, true)
      assert.equal(starts, 1, 'no replacement after a failed retirement')
    } else {
      assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
      await shutdown(lifecycle)
    }
  })
}

contract('C-REC-04.e', 'a user restart() after a task\'s accepted recovery supersedes it: one replacement, the restart\'s, runs', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let saved: LifecycleScope | undefined
  let fromTask: LifecycleRecoverResult | undefined
  let starts = 0
  const { lifecycle } = make({ onStart (scope) { starts++; saved ??= scope } })
  await lifecycle.start()
  // A task's body runs synchronously up to its first await: this recovery is
  // accepted before the restart() below.
  saved!.spawn(async () => { fromTask = saved!.recover() })
  const restarted = observe(lifecycle.restart())
  assert.equal(saved!.recover(), 'superseded', 'the scope is already retiring')
  await flush()
  assert.equal(fromTask, 'accepted')
  assert.equal(restarted.status, 'resolved')
  assert.equal(starts, 2, 'one replacement, not two')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// From the acceptance lists: v1 design §6, #2911 §9 and the ChatGPT review §7
// ---------------------------------------------------------------------------

contract('C-REC-03.e', 'a delayed recover() from generation 1, after a user stop() and start(), returns `superseded` and leaves generation 2 running', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  // The #2905 follow-up: desired state is `running` again, but the recovery
  // was decided for a run the user already stopped.
  let first: LifecycleScope | undefined
  let starts = 0
  const { lifecycle } = make({ onStart (scope) { starts++; first ??= scope } })
  await lifecycle.start()
  await lifecycle.stop()
  await lifecycle.start()
  assert.equal(first!.recover(new Error('watchdog saw generation 1 stall')), 'superseded')
  await flush()
  assert.equal(starts, 2)
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// Rules that had no test of their own (S2 exit criteria)
// ---------------------------------------------------------------------------

contract('C-REC-06.a', 'a recovery whose replacement fails ends `failed`, and nothing retries it', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const boom = new Error('replacement failed')
  let saved: LifecycleScope | undefined
  let starts = 0
  const { lifecycle } = make({
    onStart (scope) {
      saved = scope
      if (++starts === 2) {
        throw boom
      }
    },
  })
  await lifecycle.start()
  assert.equal(saved!.recover(), 'accepted')
  await flush()
  const failed = failedState(lifecycle.state)
  assert.equal(failed.generation, 2)
  assert.equal(failed.phase, 'start')
  assert.equal(failed.error, boom)
  await flush()
  assert.equal(starts, 2, 'the module has no retry policy (D7)')
})

// ---------------------------------------------------------------------------
// D42: recover() returns its decision; nothing waits on it
// ---------------------------------------------------------------------------

contract('C-REC-05.e', 'a task that requests recovery, then waits for its signal, is joined and the replacement runs: no task can deadlock its own recovery (D42)', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const go = Promise.withResolvers<void>()
  let starts = 0
  let aborted = false
  const { lifecycle } = make({
    onStart (scope) {
      if (++starts > 1) {
        return
      }
      scope.spawn(async signal => {
        await go.promise // once `running`
        scope.recover(new Error('stale connection'))
        await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))
        aborted = true
      })
    },
  })
  await lifecycle.start()
  go.resolve()
  await flush()
  assert.ok(aborted, 'the task was joined after its signal aborted')
  assert.equal(starts, 2)
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})
