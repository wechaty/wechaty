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
 * Contract tests for the per-generation scope (README §6, C-SCOPE-*).
 */

import assert from 'node:assert/strict'

import type { LifecycleScope } from '../types.ts'
import { errorName, flush, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-SCOPE-02.a', 'a retired scope ignores fail() and set(), so the state does not change', {}, async ({ make }) => {
  let captured: LifecycleScope | undefined
  const subject = make({ onStart (scope) { captured = scope } })
  const { lifecycle } = subject
  await lifecycle.start()
  await lifecycle.stop()
  const snapshot = lifecycle.state

  captured!.fail(new Error('late failure'))
  captured!.set(subject.condition('ready'))
  await flush()
  assert.equal(lifecycle.state, snapshot, 'the same frozen snapshot: nothing was committed')
})

contract('C-SCOPE-02.b', 'the scope is sealed before an abort listener runs: defer() releases at once and throws', {}, async ({ make }) => {
  const entered = Promise.withResolvers<void>()
  let calls = 0
  let thrown: unknown
  let callsWhenThrown: number | undefined
  const { lifecycle } = make({
    async onStart (scope) {
      scope.signal.addEventListener('abort', () => {
        try {
          scope.defer(() => { calls++ })
        } catch (error) {
          thrown = error
          callsWhenThrown = calls
        }
      }, { once: true })
      entered.resolve()
      await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
    },
  })
  const started = observe(lifecycle.start())
  await entered.promise
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(errorName(thrown), 'LifecycleSupersededError', 'a late registration throws the retirement reason')
  assert.equal(callsWhenThrown, 1, 'the late cleanup ran before defer() threw')
  assert.equal(calls, 1)
})

contract('C-SCOPE-08.a', 'two late registrations of the same function are two obligations, each retried until it succeeds', {}, async ({ make }) => {
  let retired: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { retired = scope } })
  await lifecycle.start()
  await lifecycle.stop()

  let calls = 0
  const release = () => {
    if (++calls <= 2) {
      throw new Error('retry release')
    }
  }
  assert.throws(() => retired!.defer(release), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  assert.throws(() => retired!.defer(release), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  await flush()
  assert.equal(lifecycle.state.kind, 'failed', 'a failed release on a retired scope is cleanup debt')
  assert.equal(lifecycle.state.kind === 'failed' && lifecycle.state.cleanupComplete, false)

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(calls, 4, 'each obligation ran once, failed once, and was retried once')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-09.a', 'a failed late release on a retired scope blocks start() until stop() retries it', {}, async ({ make }) => {
  const reason = new Error('late release')
  let remembered: LifecycleScope | undefined
  let tries = 0
  const { lifecycle } = make({ onStart (scope) { remembered = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => remembered!.defer(() => {
    if (++tries === 1) {
      throw reason
    }
  }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  await flush()

  const failed = lifecycle.state
  assert.ok(failed.kind === 'failed')
  assert.equal(failed.cleanupComplete, false)
  assert.equal(failed.cleanupError, reason)

  const refused = observe(lifecycle.start())
  await flush()
  assert.equal(errorName(refused.error), 'LifecycleUnsafeStateError')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(tries, 2)

  const restarted = observe(lifecycle.start())
  await flush()
  assert.equal(restarted.status, 'resolved')
  await shutdown(lifecycle)
})

contract('C-SCOPE-07.a', 'a spawned task that rejects while starting fails the attempt with its value, phase `start`', {}, async ({ make }) => {
  // Codex source test expected phase `run`; C-STATE-05 says `start` before running.
  let starts = 0
  const { lifecycle } = make({
    async onStart (scope) {
      starts++
      scope.spawn(async () => { throw undefined }) // falsy failures must survive as themselves
      await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(started.status, 'rejected')
  assert.equal(started.error, undefined)
  assert.equal(starts, 1, 'a failed attempt is not retried')
  assert.ok(lifecycle.state.kind === 'failed')
  assert.equal(lifecycle.state.phase, 'start')
  assert.equal(lifecycle.state.error, undefined)
  await shutdown(lifecycle)
})
