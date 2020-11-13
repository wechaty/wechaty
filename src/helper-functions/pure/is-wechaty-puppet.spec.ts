#!/usr/bin/env ts-node
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

import { PuppetMock } from 'wechaty-puppet-mock'

import { isWechatyPuppet } from './is-wechaty-puppet'

test('isWechatyPuppet: instanceof', async t => {
  const p = new PuppetMock()
  t.true(isWechatyPuppet(p), 'should be Puppet for a real Puppet (mock)')
})

test('isWechatyPuppet: constructor.name', async t => {
  class Puppet {}
  const f = new Puppet()

  t.true(isWechatyPuppet(f), 'should be Puppet for the same name class')
})

test('isWechatyPuppet: n/a', async t => {
  const o = {}
  t.false(isWechatyPuppet(o), 'should not be Puppet for a {}')
})
