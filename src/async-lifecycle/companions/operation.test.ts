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
 * Tests for the `operation` companion (README §15, C-COMP-03, D24).
 *
 * The companion uses only the public scope, so these tests use the shared
 * contract harness and run against every implementation: `operation` is
 * applied to each adapter's scope.
 */

import assert from 'node:assert/strict'

import { errorName, failedState, flush, ManualClock, observe, shutdown } from '../contract/harness.ts'
import { contract } from '../contract/suite.ts'
import type { LifecycleScope } from '../types.ts'
import { operation } from './operation.ts'

contract('C-COMP-03.a', 'an operation returns its result, and stop() waits for one in flight before releasing anything', {}, async ({ make }) => {
  const sending = Promise.withResolvers<string>()
  const trace: string[] = []
  let saved: LifecycleScope | undefined
  let seenAbort: boolean | undefined
  const { lifecycle } = make({
    onStart (scope) {
      saved = scope
      scope.defer(() => { trace.push('connection released') })
    },
  })
  await lifecycle.start()
  assert.equal(await operation(saved!, () => 'quick'), 'quick')

  const sent = observe(operation(saved!, async signal => {
    const id = await sending.promise // already on the wire: ignores the abort
    seenAbort = signal.aborted
    trace.push('sent')
    return id
  }))
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.deepEqual(trace, [], 'nothing is released while the operation runs')
  assert.equal(stopped.status, 'pending')
  sending.resolve('message-1')
  await flush()
  assert.equal(sent.value, 'message-1')
  assert.equal(seenAbort, true, 'it saw the retirement through its signal')
  assert.deepEqual(trace, [ 'sent', 'connection released' ])
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-COMP-03.b', 'an operation\'s error, a synchronous throw included, goes to its caller and never fails the run', {}, async ({ make }) => {
  const rejected = new Error('server refused the message')
  const thrown = new Error('bad argument')
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope } })
  await lifecycle.start()
  await assert.rejects(operation(saved!, () => Promise.reject(rejected)), (error: unknown) => error === rejected)
  await assert.rejects(operation(saved!, () => { throw thrown }), (error: unknown) => error === thrown)
  await flush()
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
  await shutdown(lifecycle)
})

contract('C-COMP-03.c', 'an operation on a sealed scope rejects at once with the retirement reason and never runs', {}, async ({ make }) => {
  let saved: LifecycleScope | undefined
  let calls = 0
  const { lifecycle } = make({ onStart (scope) { saved = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  const late = observe(operation(saved!, () => { calls++ }))
  await flush()
  assert.equal(errorName(late.error), 'LifecycleSupersededError')
  assert.equal(calls, 0)
})

contract('C-COMP-03.d', 'an operation that ignores its signal holds the retirement only until the stop deadline; the next stop() joins it', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const hung = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope } }, { clock, stopTimeoutMs: 100 })
  await lifecycle.start()
  const pending = observe(operation(saved!, () => hung.promise))
  const first = observe(lifecycle.stop())
  await clock.advance(100)
  assert.equal(errorName(first.error), 'LifecycleTimeoutError')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false, 'the operation is still owned')
  hung.resolve()
  const second = await shutdown(lifecycle)
  assert.equal(second.status, 'resolved')
  assert.equal(pending.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})
