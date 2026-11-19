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

/** Tests for the `listen` companion with both target shapes. */

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'

import { createLifecycle } from '../create-lifecycle.ts'
import type { LifecycleScope } from '../types.ts'
import { listen } from './listen.ts'

test('an EventTarget listener is removed when the generation retires', async () => {
  const target = new EventTarget()
  let calls = 0
  const lifecycle = createLifecycle({ onStart: scope => listen(scope, target, 'ping', () => { calls++ }) })
  await lifecycle.start()
  target.dispatchEvent(new Event('ping'))
  await lifecycle.stop()
  target.dispatchEvent(new Event('ping'))
  assert.equal(calls, 1)
})

test('listen() on a sealed scope adds nothing and throws', async () => {
  const emitter = new EventEmitter()
  let saved!: LifecycleScope
  const lifecycle = createLifecycle({ onStart: scope => { saved = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => listen(saved, emitter, 'ready', () => {}))
  assert.equal(emitter.listenerCount('ready'), 0)
})

test('listen() refuses an emitter whose listener could never be removed', async () => {
  let refused: unknown
  const lifecycle = createLifecycle({
    onStart: scope => {
      try { listen(scope, { on: () => {} }, 'ready', () => {}) } catch (e) { refused = e }
    },
  })
  await lifecycle.start()
  assert.ok(refused instanceof TypeError)
})

test('a stale listen() never removes the same handler registered by a newer run', async () => {
  const target = new EventTarget()
  const emitter = new EventEmitter()
  let hits = 0
  const handler = () => { hits++ }
  let saved!: LifecycleScope
  const lifecycle = createLifecycle({
    onStart: scope => {
      saved = scope
      listen(scope, target, 'ping', handler)
      listen(scope, emitter, 'ping', handler)
    },
  })
  await lifecycle.start()
  const stale = saved
  await lifecycle.restart()
  assert.throws(() => listen(stale, target, 'ping', handler))
  assert.throws(() => listen(stale, emitter, 'ping', handler))
  target.dispatchEvent(new Event('ping'))
  emitter.emit('ping')
  assert.equal(hits, 2, 'generation 2 still receives both events')
})

test('the forwarded listener keeps the target as this and gets every argument', async () => {
  const emitter = new EventEmitter()
  let seen: { self: unknown, args: unknown[] } | undefined
  const lifecycle = createLifecycle({
    onStart: scope => listen(scope, emitter, 'data', function (this: unknown, ...args: unknown[]) { seen = { self: this, args } }),
  })
  await lifecycle.start()
  emitter.emit('data', 1, 2)
  assert.equal(seen?.self, emitter)
  assert.deepEqual(seen?.args, [ 1, 2 ])
})
