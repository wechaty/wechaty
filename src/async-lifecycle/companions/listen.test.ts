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
 * Tests for the `listen` companion (README §15, C-COMP-01).
 *
 * The companion uses only the public scope, so these tests use the shared
 * contract harness and run against every implementation: `listen` is applied
 * to each adapter's scope.
 */

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { errorName, shutdown } from '../contract/harness.ts'
import { contract } from '../contract/suite.ts'
import type { LifecycleScope } from '../types.ts'
import { listen } from './listen.ts'

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
