#!/usr/bin/env node
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
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('function parameter destructuring applies defaults', async t => {

  const DEFAULT_N = 1
  const DEFAULT_S = 't'

  const paramSpy = t.mock.fn()
  function paramTest ({
    n = DEFAULT_N,
    s = DEFAULT_S,
  } = {}) {
    paramSpy(n, s)
  }

  paramTest()
  assert.deepStrictEqual(paramSpy.mock.calls[0]?.arguments, [ DEFAULT_N, DEFAULT_S ], 'should be equal to default args')

  paramTest({ n: 42 })
  assert.deepStrictEqual(paramSpy.mock.calls[1]?.arguments, [ 42, DEFAULT_S ], 'should be equal to default s args')

  paramTest({ s: 'life' })
  assert.deepStrictEqual(paramSpy.mock.calls[2]?.arguments, [ DEFAULT_N, 'life' ], 'should be equal to default n args')
})
