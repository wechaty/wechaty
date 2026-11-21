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
 * Contract tests for the companions (README §15, C-COMP-*), ported from the
 * Claude suite's companion tests and extended to every rule.
 *
 * The companions use only the public scope, so they run against every
 * implementation: the final module's `listen` and `watchdog` are applied to
 * each adapter's scope. The watchdog takes its own clock, so these tests need
 * no `clock` capability.
 */

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { listen } from '../companions/listen.ts'
import { type Watchdog, watchdog } from '../companions/watchdog.ts'
import type { LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, ManualClock, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-COMP-01.a', 'listen() on an EventTarget delivers events while the generation runs, and its retirement removes the listener', {}, async ({ make }) => {
  const target = new EventTarget()
  let calls = 0
  const { lifecycle } = make({ onStart: scope => listen(scope, target, 'ping', () => { calls++ }) })
  await lifecycle.start()
  target.dispatchEvent(new Event('ping'))
  await lifecycle.stop()
  target.dispatchEvent(new Event('ping'))
  assert.equal(calls, 1)
})

contract('C-COMP-01.b', 'listen() on an EventEmitter keeps the target as this and every argument, and its retirement removes the listener', {}, async ({ make }) => {
  const emitter = new EventEmitter()
  let seen: { self: unknown, args: unknown[] } | undefined
  const { lifecycle } = make({
    onStart: scope => listen(scope, emitter, 'data', function (this: unknown, ...args: unknown[]) { seen = { self: this, args } }),
  })
  await lifecycle.start()
  emitter.emit('data', 1, 2)
  assert.equal(seen?.self, emitter)
  assert.deepEqual(seen?.args, [ 1, 2 ])
  await lifecycle.stop()
  assert.equal(emitter.listenerCount('data'), 0)
})

contract('C-COMP-01.c', 'listen() re-added on every start never accumulates listeners (#2905 F)', {}, async ({ make }) => {
  const emitter = new EventEmitter()
  const { lifecycle } = make({ onStart: scope => listen(scope, emitter, 'ready', () => {}) })
  for (let round = 0; round < 3; round++) {
    await lifecycle.start()
    assert.equal(emitter.listenerCount('ready'), 1, `round ${round}`)
    await lifecycle.stop()
    assert.equal(emitter.listenerCount('ready'), 0, `round ${round}`)
  }
})

contract('C-COMP-01.d', 'listen() on a sealed scope adds nothing and throws the retirement reason (C-SCOPE-02)', {}, async ({ make }) => {
  const emitter = new EventEmitter()
  const target = new EventTarget()
  let calls = 0
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => listen(saved!, emitter, 'ready', () => { calls++ }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  assert.throws(() => listen(saved!, target, 'ready', () => { calls++ }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  assert.equal(emitter.listenerCount('ready'), 0)
  target.dispatchEvent(new Event('ready'))
  assert.equal(calls, 0)
})

contract('C-COMP-01.e', 'listen() refuses, with TypeError, an emitter whose listener could never be removed', {}, async ({ make }) => {
  let refused: unknown
  const { lifecycle } = make({
    onStart (scope) {
      try {
        listen(scope, { on: () => {} }, 'ready', () => {})
      } catch (error) {
        refused = error
      }
    },
  })
  await lifecycle.start()
  assert.ok(refused instanceof TypeError)
  await shutdown(lifecycle)
})

contract('C-COMP-01.f', 'a stale listen() never removes the same handler a newer generation registered', {}, async ({ make }) => {
  const target = new EventTarget()
  const emitter = new EventEmitter()
  let hits = 0
  const handler = () => { hits++ }
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({
    onStart (scope) {
      saved = scope
      listen(scope, target, 'ping', handler)
      listen(scope, emitter, 'ping', handler)
    },
  })
  await lifecycle.start()
  const stale = saved!
  await lifecycle.restart()
  assert.throws(() => listen(stale, target, 'ping', handler))
  assert.throws(() => listen(stale, emitter, 'ping', handler))
  target.dispatchEvent(new Event('ping'))
  emitter.emit('ping')
  assert.equal(hits, 2, 'generation 2 still receives both events')
  await shutdown(lifecycle)
})

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

contract('C-COMP-02.e', 'a watchdog refuses an invalid timeoutMs with RangeError, as a lifecycle deadline does (C-TIME-01)', {}, async ({ make }) => {
  const refused: unknown[] = []
  const { lifecycle } = make({
    onStart (scope) {
      for (const bad of [ Number.NaN, -1, 0, Number.POSITIVE_INFINITY, 2 ** 31 ]) {
        try {
          watchdog(scope, { timeoutMs: bad, onTimeout: 'fail', clock: new ManualClock() })
        } catch (error) {
          refused.push(error)
        }
      }
    },
  })
  await lifecycle.start()
  assert.equal(refused.length, 5)
  assert.ok(refused.every(error => error instanceof RangeError))
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
