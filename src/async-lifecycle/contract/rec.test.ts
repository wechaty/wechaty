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
 */

import assert from 'node:assert/strict'

import type { LifecycleRecoverResult, LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, observe, type Observed, shutdown, stateTrace } from './harness.ts'
import { contract } from './suite.ts'

contract('C-REC-02.a', 'a running generation can recover into a fresh one, again and again', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let scope: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (current) { scope = current } })
  await lifecycle.start()
  for (let generation = 1; generation <= 2; generation++) {
    const recovered = observe(scope!.recover(new Error(`stale ${generation}`)))
    await flush()
    assert.equal(recovered.status, 'resolved')
    assert.equal(recovered.value, 'recovered')
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: generation + 1 })
  }
  await shutdown(lifecycle)
})

contract('C-REC-03.a', 'stop() during the replacement\'s startup supersedes the recovery, and it is never reported as failed', { needs: [ 'scope.recover' ] }, async ({ make }) => {
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
  const recovered = observe(first!.recover(new Error('needs recovery')))
  await replacementEntered.promise
  assert.equal(lifecycle.state.kind, 'starting')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(recovered.status, 'resolved')
  assert.equal(recovered.value, 'superseded')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-REC-03.b', 'recover() before `running` acts like fail(): the first boot fails fast and the result is `failed`', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const reason = new Error('bad credentials')
  let result: ReturnType<typeof observe<LifecycleRecoverResult>> | undefined
  const { lifecycle } = make({
    onStart (scope) {
      result = observe(scope.recover(reason))
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(result!.status, 'resolved', 'D10: recover() never rejects')
  assert.equal(result!.value, 'failed')
  assert.equal(started.error, reason)
  assert.ok(lifecycle.state.kind === 'failed')
  assert.equal(lifecycle.state.phase, 'start')
  await shutdown(lifecycle)
})

contract('C-REC-03.c', 'recover() from a retired scope resolves `superseded` and changes nothing', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let first: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { first ??= scope } })
  await lifecycle.start()
  await lifecycle.restart()
  const snapshot = lifecycle.state
  const stale = observe(first!.recover(new Error('stale')))
  await flush()
  assert.equal(stale.value, 'superseded')
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
  const recovered = observe(saved!.recover(new Error('stale socket')))
  await flush()
  assert.equal(recovered.value, 'recovered')
  assert.deepEqual(trace.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'starting:2', 'running:2' ])
  await shutdown(lifecycle)
})

contract('C-REC-03.d', 'recover() resolves `failed` when the replacement fails, or when the retirement leaves debt (D10)', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const boom = new Error('boom')
  let saved: LifecycleScope | undefined
  const a = make({ onStart (scope) { saved = scope; if (scope.generation === 2) { throw boom } } })
  await a.lifecycle.start()
  const first = observe(saved!.recover())
  await flush()
  assert.equal(first.status, 'resolved', 'D10: recover() never rejects')
  assert.equal(first.value, 'failed')

  const release = new Error('release')
  const b = make({ onStart (scope) { saved = scope; scope.defer(() => { throw release }) } })
  await b.lifecycle.start()
  const second = observe(saved!.recover())
  await flush()
  assert.equal(second.value, 'failed')
  assert.equal(failedState(b.lifecycle.state).cleanupComplete, false)
})

contract('C-REC-04.a', 'a user stop() during recovery wins: the recovery is superseded and the lifecycle ends stopped (#2905 B)', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope }, onStop: () => gate.promise })
  await lifecycle.start()
  const recovering = observe(saved!.recover())
  await flush()
  const stopped = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(recovering.value, 'superseded')
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
})

contract('C-REC-04.b', 'a user start() during a recovery\'s retirement joins the replacement, and the recovery reports `recovered`', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  // The Claude source test expected the recovery to be superseded. C-REC-03
  // (revised in the S1 review) decides that a start() joins the replacement.
  const gate = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope }, onStop: () => gate.promise })
  await lifecycle.start()
  const recovering = observe(saved!.recover())
  await flush()
  const started = observe(lifecycle.start())
  gate.resolve()
  await flush()
  assert.equal(started.status, 'resolved')
  assert.equal(recovering.value, 'recovered')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-REC-04.c', 'a user start() while the recovery\'s replacement is starting joins it', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope; return scope.generation === 2 ? gate.promise : undefined } })
  await lifecycle.start()
  const recovering = observe(saved!.recover())
  await flush()
  assert.deepEqual(lifecycle.state, { kind: 'starting', generation: 2 })
  const started = observe(lifecycle.start())
  gate.resolve()
  await flush()
  assert.equal(started.status, 'resolved')
  assert.equal(recovering.value, 'recovered')
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
  const recovering = observe(saved!.recover())
  await flush()
  const started = observe(lifecycle.start())
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(recovering.value, 'superseded')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-REC-05.a', 'a task may trigger recovery with `void scope.recover()`', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const trigger = Promise.withResolvers<void>()
  const { lifecycle } = make({
    onStart (scope) {
      if (scope.generation === 1) {
        scope.spawn(async () => { await trigger.promise; void scope.recover() })
      }
    },
  })
  await lifecycle.start()
  trigger.resolve()
  await flush()
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
  contract(`C-REC-05.b-${when}`, `a task that requested recovery and then rejects ${when === 'at-once' ? 'at once' : 'during the last release'} fails the recovery: \'failed\' and failed { stop } (C-SCOPE-07)`, { needs: [ 'scope.recover' ] }, async ({ make }) => {
    // The requesting task is exempt from the join (C-REC-05), so it can wait
    // for a release; its rejection while the generation retires is still a
    // cleanup error (C-SCOPE-07), so the replacement does not start (C-RET-06).
    const requesterError = new Error('recovery requester failed')
    const go = Promise.withResolvers<void>()
    const releaseStarted = Promise.withResolvers<void>()
    const finishRelease = Promise.withResolvers<void>()
    let starts = 0
    let outcome: Observed<LifecycleRecoverResult> | undefined
    const { lifecycle } = make({
      onStart (scope) {
        if (++starts > 1) {
          return
        }
        scope.defer(async () => {
          releaseStarted.resolve()
          await finishRelease.promise
        })
        scope.spawn(async () => {
          await go.promise
          outcome = observe(scope.recover())
          if (when === 'during-release') {
            await releaseStarted.promise
          }
          throw requesterError
        })
      },
    })
    await lifecycle.start()
    go.resolve()
    await flush()
    finishRelease.resolve()
    await flush()
    assert.equal(outcome?.value, 'failed')
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
    ? 'a task that calls recover() while a recovery already retires, then rejects, fails the recovery: \'failed\', failed { stop }, and no replacement (C-SCOPE-07)'
    : 'a task that calls recover() while a recovery already retires gets \'superseded\' at once and is joined as usual; the recovery reports \'recovered\''
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
          late = await scope.recover()
          await hold.promise
          if (rejects) {
            throw requesterError
          }
        })
      },
    })
    await lifecycle.start()
    const recovery = observe(first!.recover())
    await flush()
    go.resolve()
    await flush()
    assert.equal(late, 'superseded')
    assert.equal(recovery.status, 'pending', 'the late caller is joined, not exempt')
    assert.equal(starts, 1)
    hold.resolve()
    await flush()
    if (rejects) {
      assert.equal(recovery.value, 'failed')
      const failed = failedState(lifecycle.state)
      assert.equal(failed.phase, 'stop')
      assert.equal(failed.error, requesterError)
      assert.equal(failed.cleanupComplete, true)
      assert.equal(starts, 1, 'no replacement after a failed retirement')
    } else {
      assert.equal(recovery.value, 'recovered')
      assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
      await shutdown(lifecycle)
    }
  })
}

contract('C-REC-04.e', 'a user restart() during a task\'s recovery supersedes it: the task gets \'superseded\' and the restart\'s replacement runs', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let saved: LifecycleScope | undefined
  let fromTask: LifecycleRecoverResult | undefined
  const { lifecycle } = make({ onStart (scope) { saved ??= scope } })
  await lifecycle.start()
  saved!.spawn(async () => { fromTask = await saved!.recover() })
  const restarted = observe(lifecycle.restart())
  const fromOwner = observe(saved!.recover())
  await flush()
  assert.equal(fromTask, 'superseded')
  assert.equal(fromOwner.value, 'superseded')
  assert.equal(restarted.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})
