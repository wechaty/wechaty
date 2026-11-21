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
 * Regression tests for the bugs found while comparing the three
 * implementations (#2968 §5, B1 to B3). Each is a required contract test and
 * cites the clauses it protects. Each is a known failure only for the
 * implementation that has the bug.
 *
 * Lifecycle promises are observed and settled with `flush()`, never awaited,
 * so an implementation that hangs fails the test instead of hanging the run.
 */

import assert from 'node:assert/strict'

import type { LifecycleRecoverResult } from '../types.ts'
import { flush, observe } from './harness.ts'
import { contract } from './suite.ts'

contract('B1', 'stop() after a cleanly failed start commits `stopped`, and the rejection follows the failure\'s commit', {}, async ({ make }) => {
  // C-CMD-09: a clean failure plus stop() commits stopped. C-OBS-01, C-CMD-17:
  // the rejection follows the commit that records the failure. D35 withdrew this
  // bug's first half: the rejection may come at the `stopping` commit, so it no
  // longer has to wait for `failed`.
  const failure = new Error('onStart failed')
  const { lifecycle } = make({ onStart () { throw failure } })

  let stateWhenRejected: string | undefined
  const started = observe(lifecycle.start().catch((error: unknown) => {
    stateWhenRejected = lifecycle.state.kind
    throw error
  }))
  await flush()
  assert.equal(started.status, 'rejected')
  assert.equal(started.error, failure)
  assert.notEqual(stateWhenRejected, 'starting', 'the failure was committed before the rejection was observable')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('B2', 'a spawned task awaiting its own scope.recover() gets the decision at once, and the replacement runs, without deadlock', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  // C-REC-05 / D42: recover() returns its decision, so the task that requested
  // the recovery never waits on its own retirement. (Before D42 it awaited the
  // replacement, which waited for the task: the deadlock B2 recorded.)
  const running = Promise.withResolvers<void>()
  const results: LifecycleRecoverResult[] = []
  let starts = 0
  const { lifecycle } = make({
    onStart (scope) {
      starts++
      if (starts === 1) {
        scope.spawn(async () => {
          await running.promise
          results.push(await scope.recover(new Error('stale connection')))
        })
      }
    },
    onStateChange (state) {
      if (state.kind === 'running') {
        running.resolve()
      }
    },
  })

  try {
    const started = observe(lifecycle.start())
    await flush()
    assert.equal(started.status, 'resolved')
    // Copy before asserting: the `finally` below can still push a result, and a
    // failure message prints the array it was given by reference.
    assert.deepEqual([ ...results ], [ 'accepted' ], `stuck in ${lifecycle.state.kind} with the recovery pending`)
    assert.equal(starts, 2)
    assert.equal(lifecycle.state.kind, 'running')
  } finally {
    // Leave nothing pending, even for the implementation that deadlocks: a user
    // stop() supersedes the stuck recovery there.
    observe(lifecycle.stop())
    await flush()
  }
})

contract('B3', 'stop() during onStart rolls the start back without calling onStop', {}, async ({ make }) => {
  // C-RET-03 / D8: onStop only for a run that reached `running`.
  const gate = Promise.withResolvers<void>()
  let onStopCalls = 0
  const { lifecycle } = make({
    async onStart () { await gate.promise },
    onStop () { onStopCalls++ },
  })

  const started = observe(lifecycle.start())
  await flush()
  assert.equal(lifecycle.state.kind, 'starting')

  const stopped = observe(lifecycle.stop())
  gate.resolve()
  await flush()

  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(started.status, 'rejected')
  assert.equal((started.error as Error).name, 'LifecycleSupersededError')
  assert.equal(onStopCalls, 0, 'onStop must not run for a generation that never reached running')
})
