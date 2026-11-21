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
 * Contract tests for generation-bound conditions (README §11, C-COND-*).
 */

import assert from 'node:assert/strict'

import type { LifecycleCondition, LifecycleScope } from '../types.ts'
import { errorName, flush, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-COND-02.a', 'a wait created during retirement binds to the next generation, not the retiring one', {}, async ({ make }) => {
  let scope: LifecycleScope | undefined
  const subject = make({ onStart (current) { scope = current } })
  const { lifecycle } = subject
  const ready = subject.condition('ready')
  await lifecycle.start()
  scope!.set(ready)

  const stopped = observe(lifecycle.stop())
  const waited = observe(ready.wait())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(waited.status, 'pending', 'the retiring generation must not satisfy a new wait')

  await lifecycle.start()
  scope!.set(ready)
  await flush()
  assert.equal(waited.status, 'resolved')
  await shutdown(lifecycle)
})

contract('C-COND-04.a', 'a wait created before start() rejects with LifecycleSupersededError, cause = failure, when that generation fails', {}, async ({ make }) => {
  const failure = new Error('fail generation')
  const subject = make({ onStart () { throw failure } })
  const ready = subject.condition('ready')
  const waited = observe(ready.wait())
  const started = observe(subject.lifecycle.start())
  await flush()
  assert.equal(started.error, failure)
  assert.equal(waited.status, 'rejected')
  assert.equal(errorName(waited.error), 'LifecycleSupersededError', 'D28: one error type, whatever ended the generation')
  assert.equal((waited.error as Error).cause, failure)
})

for (const queued of [ false, true ]) {
  contract(`C-COND-04.b${queued ? '2' : '1'}`, `stop() rejects every pre-start wait, aborted callers included${queued ? ', and a queued start()' : ''}`, {}, async ({ make }) => {
    let ready!: LifecycleCondition
    let online!: LifecycleCondition
    const subject = make({
      onStart (scope) {
        scope.set(ready)
        scope.set(online)
      },
    })
    ready = subject.condition('ready')
    online = subject.condition('online')
    const { lifecycle } = subject

    const caller = new AbortController()
    const waits = [ ready.wait(), ready.wait({ signal: caller.signal }), online.wait() ].map(wait => observe(wait))
    const start = queued ? observe(lifecycle.start()) : undefined
    const stopped = observe(lifecycle.stop())
    // A caller abort right after the stop must not replace the stop's rejection.
    caller.abort(new Error('later caller abort'))
    const next = observe(ready.wait())
    await flush()

    assert.equal(stopped.status, 'resolved')
    for (const wait of waits) {
      assert.equal(errorName(wait.error), 'LifecycleSupersededError')
    }
    if (start) {
      assert.equal(errorName(start.error), 'LifecycleSupersededError')
    }
    assert.equal(lifecycle.state.kind, 'stopped')
    if (!queued) {
      assert.equal(lifecycle.state.generation, 0, 'no start was requested, so no generation exists')
    }
    // With a queued start the generation number is not asserted: C-STATE-03
    // gives every start attempt a generation, and whether one superseded before
    // it begins counts is not decided. The waits rejecting above is the rule.

    await lifecycle.start()
    await flush()
    assert.equal(next.status, 'resolved', 'a wait created after the stop binds to the next generation')
    await shutdown(lifecycle)
  })
}

contract('C-COND-04.c', 'a pre-aborted stop() leaves pre-start waits for the next generation intact', {}, async ({ make }) => {
  let ready!: LifecycleCondition
  const subject = make({ onStart (scope) { scope.set(ready) } })
  ready = subject.condition('ready')
  const waited = observe(ready.wait())
  const reason = new Error('stop caller aborted')
  const stopped = observe(subject.lifecycle.stop({ signal: AbortSignal.abort(reason) }))
  await flush()
  assert.equal(stopped.error, reason)
  assert.equal(waited.status, 'pending')

  await subject.lifecycle.start()
  await flush()
  assert.equal(waited.status, 'resolved')
  await shutdown(subject.lifecycle)
})

contract('C-COND-04.d', 'stop() superseding a queued replacement also rejects waits bound to that replacement', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  const subject = make({ onStart () {}, onStop: () => gate.promise })
  const ready = subject.condition('ready')
  const { lifecycle } = subject
  await lifecycle.start()

  const retiring = observe(lifecycle.stop())
  const replacement = observe(lifecycle.start())
  const waited = observe(ready.wait())
  const stopped = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(retiring.status, 'resolved')
  assert.equal(stopped.status, 'resolved')
  assert.equal(errorName(replacement.error), 'LifecycleSupersededError')
  assert.equal(errorName(waited.error), 'LifecycleSupersededError')
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
})

contract('C-COND-05.a', 'a set() from a stale scope does nothing, and a retired generation rejects its waits', {}, async ({ make }) => {
  const scopes: LifecycleScope[] = []
  const subject = make({ onStart (scope) { scopes.push(scope) } })
  const ready = subject.condition('ready')
  const { lifecycle } = subject

  const first = observe(ready.wait())
  await lifecycle.start()
  scopes[0]!.set(ready)
  await flush()
  assert.equal(first.status, 'resolved')

  await lifecycle.restart()
  const second = observe(ready.wait())
  scopes[0]!.set(ready) // stale: the first generation is retired
  await flush()
  assert.equal(second.status, 'pending', 'a stale scope must not make the replacement ready')

  await lifecycle.stop()
  await flush()
  assert.equal(errorName(second.error), 'LifecycleSupersededError')
})

contract('C-COND-01.a', 'set() with a condition declared on another lifecycle throws TypeError', {}, async ({ make }) => {
  // Codex source test expected a silent no-op; C-COND-01 decides on TypeError.
  let scope: LifecycleScope | undefined
  const subject = make({ onStart (current) { scope = current } })
  const other = make({ onStart () {} })
  const foreign = other.condition('ready')
  await subject.lifecycle.start()
  assert.throws(() => scope!.set(foreign), TypeError)
  assert.throws(() => scope!.clear(foreign), TypeError)
  await shutdown(subject.lifecycle)
})

contract('C-COND-01.b', 'the same name returns the same condition on one lifecycle', {}, async ({ make }) => {
  const subject = make({ onStart () {} })
  assert.equal(subject.condition('ready'), subject.condition('ready'))
  assert.notEqual(subject.condition('ready'), subject.condition('online'))
})

contract('C-COND-04.e', 'a caller abort rejects only that wait, with its reason', {}, async ({ make }) => {
  let ready!: LifecycleCondition
  const subject = make({ onStart (scope) { scope.set(ready) } })
  ready = subject.condition('ready')
  const caller = new AbortController()
  const aborted = observe(ready.wait({ signal: caller.signal }))
  const kept = observe(ready.wait())
  caller.abort('canceled')
  await flush()
  assert.equal(aborted.error, 'canceled')
  assert.equal(kept.status, 'pending')
  await subject.lifecycle.start()
  await flush()
  assert.equal(kept.status, 'resolved')
  await shutdown(subject.lifecycle)
})

// ---------------------------------------------------------------------------
// Ported from the Claude comparison suite (deleted in S6; see INVENTORY.md)
// ---------------------------------------------------------------------------

contract('C-COND-02.b', 'a wait made while restart() is retiring the old generation binds to the replacement', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let ready!: LifecycleCondition
  const subject = make({
    onStart (scope) { if (scope.generation === 2) { scope.set(ready) } },
    onStop: () => gate.promise,
  })
  ready = subject.condition('ready')
  await subject.lifecycle.start()
  const restarted = observe(subject.lifecycle.restart())
  await flush()
  assert.equal(subject.lifecycle.state.kind, 'stopping')
  const waited = observe(ready.wait())
  gate.resolve()
  await flush()
  assert.equal(restarted.status, 'resolved')
  assert.equal(waited.status, 'resolved')
  await shutdown(subject.lifecycle)
})

contract('C-COND-03.a', 'a condition is a level: later waits resolve at once, and clear() blocks them again', {}, async ({ make }) => {
  let saved: LifecycleScope | undefined
  const subject = make({ onStart (scope) { saved = scope } })
  const ready = subject.condition('ready')
  await subject.lifecycle.start()
  saved!.set(ready)
  const now = observe(ready.wait())
  await flush()
  assert.equal(now.status, 'resolved')

  saved!.clear(ready)
  const blocked = observe(ready.wait())
  await flush()
  assert.equal(blocked.status, 'pending')
  saved!.set(ready)
  await flush()
  assert.equal(blocked.status, 'resolved')
  await shutdown(subject.lifecycle)
})

contract('C-COND-04.f', 'waits bound to a starting generation reject when restart() supersedes it and its cleanup fails', {}, async ({ make }) => {
  const releaseError = new Error('release')
  const gate = Promise.withResolvers<void>()
  const subject = make({
    async onStart (scope) {
      scope.defer(() => { if (scope.generation === 1) { throw releaseError } })
      await gate.promise
    },
  })
  const ready = observe(subject.condition('ready').wait())
  const started = observe(subject.lifecycle.start())
  await flush()
  const restarted = observe(subject.lifecycle.restart())
  gate.resolve()
  await flush()
  assert.equal(restarted.error, releaseError)
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(ready.status, 'rejected')
})

contract('C-COND-04.g', 'a run failure rejects its waits with LifecycleSupersededError, cause = the failure (D28)', {}, async ({ make }) => {
  const crash = new Error('crash')
  let saved: LifecycleScope | undefined
  const subject = make({ onStart (scope) { saved = scope } })
  await subject.lifecycle.start()
  const waited = observe(subject.condition('ready').wait())
  saved!.fail(crash)
  await flush()
  assert.equal(errorName(waited.error), 'LifecycleSupersededError')
  assert.equal((waited.error as Error).cause, crash)
})

contract('C-COND-05.b', 'a retiring scope (in onStop) and a stale scope cannot set conditions', {}, async ({ make }) => {
  let saved: LifecycleScope | undefined
  let ready!: LifecycleCondition
  const subject = make({
    onStart (scope) { saved = scope },
    onStop () { saved!.set(ready) },
  })
  ready = subject.condition('ready')
  await subject.lifecycle.start()
  const first = observe(ready.wait())
  await subject.lifecycle.restart()
  await flush()
  assert.equal(first.status, 'rejected', 'a wait bound to a retired generation rejects')

  const stale = saved!
  await subject.lifecycle.restart()
  stale.set(ready)
  const waited = observe(ready.wait())
  await flush()
  assert.equal(waited.status, 'pending')
  await shutdown(subject.lifecycle)
})

// ---------------------------------------------------------------------------
// Ported from the Copilot comparison suite (deleted in S6; see INVENTORY.md)
// ---------------------------------------------------------------------------

contract('C-COND-04.h', 'a stop() accepted while an earlier stop() is still retiring rejects the waits created in between', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  const subject = make({ onStart () {}, onStop: () => gate.promise })
  const { lifecycle } = subject
  const ready = subject.condition('ready')
  await lifecycle.start()
  const first = observe(lifecycle.stop())
  await flush()
  const waited = observe(ready.wait())
  await flush()
  assert.equal(waited.status, 'pending', 'C-COND-02: it waits for the next generation')
  const second = observe(lifecycle.stop())
  await flush()
  assert.equal(errorName(waited.error), 'LifecycleSupersededError', 'the wait was not bound when the second stop() was accepted')
  gate.resolve()
  await flush()
  assert.equal(first.status, 'resolved')
  assert.equal(second.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
})

// ---------------------------------------------------------------------------
// Rules that had no test of their own (S2 exit criteria)
// ---------------------------------------------------------------------------

contract('C-COND-06.a', 'isSet is true only while the current live generation has the condition set', { needs: [ 'condition.isSet' ] }, async ({ make }) => {
  let saved: LifecycleScope | undefined
  const subject = make({ onStart (scope) { saved = scope } })
  const { lifecycle } = subject
  const ready = subject.condition('ready')
  assert.equal(ready.isSet, false, 'before any start')
  await lifecycle.start()
  assert.equal(ready.isSet, false)
  saved!.set(ready)
  assert.equal(ready.isSet, true)
  saved!.clear(ready)
  assert.equal(ready.isSet, false)
  saved!.set(ready)
  await lifecycle.stop()
  assert.equal(ready.isSet, false, 'a retired generation has no conditions')
  await lifecycle.start()
  assert.equal(ready.isSet, false, 'a new generation starts with every condition clear (C-COND-05)')
  await shutdown(lifecycle)
})
