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
  const wechaty1 = WechatyBuilder.build()
  const wechaty2 = WechatyBuilder.build()
  t.not(wechaty1, wechaty2, 'should build two different Wechaty instance')

  const singleton1 = WechatyBuilder.singleton()
  const singleton2 = WechatyBuilder.singleton()
  t.equal(singleton1, singleton2, 'should get the same singleton instance')

  const wechaty = WechatyBuilder.build({ puppet: 'wechaty-puppet-mock' })
  await wechaty.start()
  t.ok(PuppetMock.validInstance(wechaty.puppet), 'should set options.puppet to mock')
  await wechaty.stop()
})

test('throw when set options twice', async t => {
  class WechatyBuilderTest extends WechatyBuilder {

    constructor () { super() }

    static override new () { return new this() }

    override options (...args: any[]) {
      super.options(...args)
      return this
    }

  }

  const builder = WechatyBuilderTest.new()
  t.doesNotThrow(() => builder.options({}), 'should not throw for the first time')
  t.doesNotThrow(() => builder.options({}), 'should not throw as long as the `options` is an empty object')

  const options = { name: 'bot' }
  t.doesNotThrow(() => builder.options(options), 'should not throw for setting non-empty `options` for the first time')
  t.throws(() => builder.options(options), 'should throw for setting non-empty `options` again')
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
  t.ok(PuppetMock.validInstance(wechaty.puppet), 'should set options.puppet to mock')
  await wechaty.stop()
})
