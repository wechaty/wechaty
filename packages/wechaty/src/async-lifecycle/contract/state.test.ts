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
 * Contract tests for the state snapshot (README §3, C-STATE-*).
 */

import assert from 'node:assert/strict'

import { failedState, flush, observe, shutdown, stateTrace } from './harness.ts'
import { contract } from './suite.ts'

contract('C-STATE-01.a', 'each attempt gets the next generation, snapshots are frozen, and the trace is starting, running, stopping, stopped', {}, async ({ make }) => {
  const trace = stateTrace()
  const generations: number[] = []
  const { lifecycle } = make({
    onStart (scope) { generations.push(scope.generation) },
    onStateChange: trace.onStateChange,
  })
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 0 }, 'C-STATE-02')
  await lifecycle.start()
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
  assert.ok(Object.isFrozen(lifecycle.state))
  await lifecycle.stop()
  await lifecycle.start()
  assert.deepEqual(generations, [ 1, 2 ])
  assert.deepEqual(trace.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'stopped:1', 'starting:2', 'running:2' ])
  await shutdown(lifecycle)
})

contract('C-STATE-05.a', 'falsy failure values are failures, kept exactly as given', {}, async ({ make }) => {
  for (const value of [ undefined, null, false, 0, '' ]) {
    const { lifecycle } = make({ onStart () { throw value } })
    const started = observe(lifecycle.start())
    await flush()
    assert.equal(started.status, 'rejected', `throw ${String(value)} must reject`)
    assert.equal(started.error, value)
    assert.equal(failedState(lifecycle.state).error, value)
  }
})

// ---------------------------------------------------------------------------
// Rules that had no test of their own (S2 exit criteria)
// ---------------------------------------------------------------------------

contract('C-STATE-02.a', 'the initial state is a frozen { kind: \'stopped\', generation: 0 }', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 0 })
  assert.ok(Object.isFrozen(lifecycle.state))
})
