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
