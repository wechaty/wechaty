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

/** Tests for the `watchdog` companion, on a manual clock. */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createLifecycle } from '../create-lifecycle.ts'
import { LifecycleTimeoutError } from '../errors.ts'
import { ManualClock } from '../testing.ts'
import type { LifecycleState } from '../types.ts'
import { type Watchdog, watchdog } from './watchdog.ts'

test('an unfed watchdog fails the generation; feeding postpones it', async () => {
  const clock = new ManualClock()
  let dog!: Watchdog
  const lifecycle = createLifecycle({ onStart: scope => { dog = watchdog(scope, { timeoutMs: 100, clock }) } })
  await lifecycle.start()
  await clock.advance(90)
  dog.feed()
  await clock.advance(90)
  assert.equal(lifecycle.state.kind, 'running')
  await clock.advance(10)
  const read = (): LifecycleState => lifecycle.state
  const state = read()
  assert.ok(state.kind === 'failed')
  assert.equal(state.phase, 'run')
  assert.ok(state.error instanceof LifecycleTimeoutError)
  assert.equal(state.error.phase, 'watchdog')
})

test("onTimeout: 'recover' replaces the generation", async () => {
  const clock = new ManualClock()
  const lifecycle = createLifecycle({
    onStart: scope => { if (scope.generation === 1) { watchdog(scope, { timeoutMs: 50, onTimeout: 'recover', clock }) } },
  })
  await lifecycle.start()
  await clock.advance(50)
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
})

test('the watchdog timer is cleared on stop and a stale feed re-arms nothing', async () => {
  const clock = new ManualClock()
  let dog!: Watchdog
  const lifecycle = createLifecycle({ onStart: scope => { dog = watchdog(scope, { timeoutMs: 100, clock }) } })
  await lifecycle.start()
  await lifecycle.stop()
  assert.equal(clock.pending, 0)
  dog.feed()
  assert.equal(clock.pending, 0)
})
