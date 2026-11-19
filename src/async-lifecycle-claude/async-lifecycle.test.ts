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
 * Tests specific to the inheritance shell: the "never override the caller API"
 * guard. Behavioural parity with `createLifecycle` is covered by the contract
 * suite in `engine.test.ts`, which runs every trace through both shells.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { AsyncLifecycle } from './async-lifecycle.ts'

test('a prototype override of a caller-API member throws at construction', () => {
  class Overrides extends AsyncLifecycle {

    constructor () { super() }
    protected override onStart () {}
    override start () { return Promise.resolve() }

  }
  assert.throws(() => new Overrides(), /must not override 'start\(\)'/)
})

test('a class-field override of a caller-API member throws at construction', () => {
  class FieldOverride extends AsyncLifecycle {

    // A field initializer runs after super() and cannot replace the
    // non-configurable own property the base installed.
    override stop = () => Promise.resolve()
    constructor () { super() }
    protected override onStart () {}

  }
  assert.throws(() => new FieldOverride(), TypeError)
})

test('caller-API members are own, non-writable properties', async () => {
  class Plain extends AsyncLifecycle {

    constructor () { super() }
    protected override onStart () {}

  }
  const plain = new Plain()
  const descriptor = Object.getOwnPropertyDescriptor(plain, 'start')
  assert.equal(descriptor?.writable, false)
  assert.equal(descriptor?.configurable, false)
  await plain.start()
  assert.equal(plain.state.kind, 'running')
  await plain.stop()
})
