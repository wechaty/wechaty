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
 * Tests for the `watchdog` companion (README §15, C-COMP-02).
 *
 * The companion uses only the public scope, so these tests use the shared
 * contract harness and run against every implementation: `watchdog` is applied
 * to each adapter's scope. The watchdog takes its own clock, so no `clock` capability is needed.
 */

import assert from 'node:assert/strict'

import { errorName, failedState, flush, ManualClock, shutdown } from '../contract/harness.ts'
import { contract } from '../contract/suite.ts'
import type { LifecycleScope } from '../types.ts'
import { type Watchdog, watchdog } from './watchdog.ts'

contract('C-COMP-02.a', 'an unfed watchdog fails the generation with LifecycleTimeoutError (phase `watchdog`); a feed restarts the countdown', {}, async ({ make }) => {
  const clock = new ManualClock()
  let dog: Watchdog | undefined
  const { lifecycle } = make({ onStart (scope) { dog = watchdog(scope, { timeoutMs: 100, onTimeout: 'fail', clock }) } })
  await lifecycle.start()
  await clock.advance(90)
  dog!.feed()
  await clock.advance(90)
  assert.equal(lifecycle.state.kind, 'running', 'fed in time')
  await clock.advance(10)
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'run')
  assert.equal(errorName(failed.error), 'LifecycleTimeoutError')
  assert.equal((failed.error as { phase?: unknown }).phase, 'watchdog')
  assert.equal((failed.error as { timeoutMs?: unknown }).timeoutMs, 100)
  assert.equal(clock.pending, 0, 'it fires once and arms nothing after')
})

contract('C-COMP-02.b', 'a watchdog with onTimeout `recover` replaces the generation', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  const clock = new ManualClock()
  const { lifecycle } = make({
    onStart (scope) {
      if (scope.generation === 1) {
        watchdog(scope, { timeoutMs: 50, onTimeout: 'recover', clock })
      }
    },
  })
  await lifecycle.start()
  await clock.advance(50)
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  assert.equal(clock.pending, 0, 'the retired generation\'s timer is gone')
  await shutdown(lifecycle)
})

contract('C-COMP-02.c', 'a watchdog\'s timer is cleared by its retirement, and a stale feed() arms nothing', {}, async ({ make }) => {
  const clock = new ManualClock()
  let dog: Watchdog | undefined
  const { lifecycle } = make({ onStart (scope) { dog = watchdog(scope, { timeoutMs: 100, onTimeout: 'fail', clock }) } })
  await lifecycle.start()
  assert.equal(clock.pending, 1)
  await lifecycle.stop()
  assert.equal(clock.pending, 0)
  dog!.feed()
  assert.equal(clock.pending, 0)
})

contract('C-COMP-02.d', 'disarm() stops the countdown until the next feed()', {}, async ({ make }) => {
  const clock = new ManualClock()
  let dog: Watchdog | undefined
  const { lifecycle } = make({ onStart (scope) { dog = watchdog(scope, { timeoutMs: 100, onTimeout: 'fail', clock }) } })
  await lifecycle.start()
  dog!.disarm()
  await clock.advance(500)
  assert.equal(lifecycle.state.kind, 'running', 'disarmed')
  dog!.feed()
  await clock.advance(100)
  assert.equal(lifecycle.state.kind, 'failed', 'armed again by the feed')
})

contract('C-COMP-02.e', 'a watchdog refuses an invalid timeoutMs with RangeError, as a lifecycle deadline does (C-TIME-01), and an onTimeout other than `fail` or `recover` with TypeError', {}, async ({ make }) => {
  const refused: unknown[] = []
  let badAction: unknown
  const { lifecycle } = make({
    onStart (scope) {
      for (const bad of [ Number.NaN, -1, 0, Number.POSITIVE_INFINITY, 2 ** 31 ]) {
        try {
          watchdog(scope, { timeoutMs: bad, onTimeout: 'fail', clock: new ManualClock() })
        } catch (error) {
          refused.push(error)
        }
      }
      try {
        // A JavaScript caller's typo: there is no default to fall back on.
        watchdog(scope, { timeoutMs: 100, onTimeout: 'recovr' as 'recover', clock: new ManualClock() })
      } catch (error) {
        badAction = error
      }
    },
  })
  await lifecycle.start()
  assert.equal(refused.length, 5)
  assert.ok(refused.every(error => error instanceof RangeError))
  assert.ok(badAction instanceof TypeError)
  await shutdown(lifecycle)
})

contract('C-COMP-02.f', 'a watchdog on a sealed scope arms nothing and throws the retirement reason (C-SCOPE-02)', {}, async ({ make }) => {
  const clock = new ManualClock()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => watchdog(saved!, { timeoutMs: 100, onTimeout: 'fail', clock }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  assert.equal(clock.pending, 0)
  await flush()
})
