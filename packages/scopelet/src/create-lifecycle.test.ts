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
 * Unit tests of the composition entry point for what the contract suite cannot
 * see: its adapters wrap the hooks, so invalid hooks never reach a kernel
 * through them (INVENTORY.md, "Rules without a test keyed to them").
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createLifecycle } from './create-lifecycle.ts'
import type { LifecycleHooks } from './types.ts'

test('createLifecycle() throws TypeError for a missing onStart or a present non-function hook (C-SHELL-03)', () => {
  const invalid: unknown[] = [
    undefined,
    null,
    {},
    { onStart: 'start' },
    { onStart () {}, onStop: 7 },
    { onStart () {}, onStateChange: 'observer' },
  ]
  for (const hooks of invalid) {
    assert.throws(() => createLifecycle(hooks as LifecycleHooks), TypeError, JSON.stringify(hooks) ?? String(hooks))
  }
})

test('createLifecycle() accepts onStart alone, and optional hooks that are functions or undefined', () => {
  assert.doesNotThrow(() => createLifecycle({ onStart () {} }))
  assert.doesNotThrow(() => createLifecycle({ onStart () {}, onStop: undefined, onStateChange: undefined }))
  assert.doesNotThrow(() => createLifecycle({ onStart () {}, onStop () {}, onStateChange () {} }))
})
