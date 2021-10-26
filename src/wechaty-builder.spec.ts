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

import { test }  from 'tstest'

import { PuppetMock } from 'wechaty-puppet-mock'

import { WechatyBuilder } from './wechaty-builder.js'

test('WechatyBuilder class', async t => {
  const wechaty1 = new WechatyBuilder().build()
  const wechaty2 = new WechatyBuilder().build()
  t.not(wechaty1, wechaty2, 'should build two different Wechaty instance')

  const singleton1 = new WechatyBuilder().singleton().build()
  const singleton2 = new WechatyBuilder().singleton().build()
  t.equal(singleton1, singleton2, 'should get the same singleton instance')

  const wechaty = new WechatyBuilder().options({ puppet: 'wechaty-puppet-mock' }).build()
  await wechaty.start()
  t.ok(/wechaty-puppet-mock/.test(wechaty.puppet.name()), 'should get options.puppet')
  await wechaty.stop()
})

test('throw when set options twice', async t => {
  const builder = new WechatyBuilder()
  t.doesNotThrow(() => builder.options({}), 'should not throw for the first time')
  t.throws(() => builder.options({}), 'should throw for calling options() method the second time')
})

test('WechatyBuilder class static', async t => {
  const wechaty1 = WechatyBuilder.build()
  const wechaty2 = WechatyBuilder.build()
  t.not(wechaty1, wechaty2, 'should build two different Wechaty instance')

  const singleton1 = WechatyBuilder.singleton()
  const singleton2 = WechatyBuilder.singleton()
  t.equal(singleton1, singleton2, 'should get the same singleton instance')

  const wechaty = WechatyBuilder.build({ puppet: 'wechaty-puppet-mock' })
  await wechaty.start()
  t.ok(PuppetMock.validInstance(wechaty.puppet), 'should get options.puppet')
  await wechaty.stop()
})
