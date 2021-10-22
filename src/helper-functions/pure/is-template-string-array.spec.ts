#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
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
import { test } from 'tstest'
import { isTemplateStringArray } from './is-template-string-array.js'

test('isTemplateStringArray', async t => {
  function test (
    s: string | TemplateStringsArray,
    ...varList : unknown[]
  ) {
    void varList
    if (isTemplateStringArray(s)) {
      return true
    }
    return false
  }

  const n = 42
  const obj = {}

  t.ok(test`foo`, 'should return true for template string')
  t.ok(test`bar${n}`, 'should return true for template string with one var')
  t.ok(test`obj${obj}`, 'should return true for template string with one obj')

  t.notOk(test('xixi'), 'should return false for (string) call')
})
