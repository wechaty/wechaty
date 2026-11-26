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
/**
 * Unit tests for Wechaty constructor, singleton, type guard, and doc-typing.
 *
 * Why this module exists:
 * Verifies that `new Wechaty()`, `Wechaty.singleton()`, and `Wechaty.valid()` behave correctly
 * at runtime and preserve pure doc-typing without leaking internal mixin members.
 *
 * Architectural boundaries:
 * Part of `wechaty` unit test suite.
 *
 * Key relationships:
 * - `wechaty-impl.ts`: Primary subject under test.
 * - `wechaty-builder.ts`: Verified for shared singleton and type-guard delegation.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { PuppetMock } from 'wechaty-puppet-mock'

import { Wechaty } from './wechaty-impl.ts'
import { WechatyBuilder } from '../wechaty-builder.ts'

test('new Wechaty() constructor creates distinct instances', async () => {
  const wechaty1 = new Wechaty()
  const wechaty2 = new Wechaty()

  assert.ok(wechaty1, 'wechaty1 should be instantiated')
  assert.ok(wechaty2, 'wechaty2 should be instantiated')
  assert.notStrictEqual(wechaty1, wechaty2, 'should instantiate two distinct Wechaty instances')
  assert.ok(wechaty1.id, 'wechaty1 should have an id')
  assert.ok(wechaty2.id, 'wechaty2 should have an id')
  assert.notStrictEqual(wechaty1.id, wechaty2.id, 'distinct instances should have distinct ids')
})

test('Wechaty.valid() type guard', async () => {
  const wechaty = new Wechaty()

  assert.ok(Wechaty.valid(wechaty), 'Wechaty.valid should return true for Wechaty instance')
  assert.equal(Wechaty.valid(null), false, 'Wechaty.valid should return false for null')
  assert.equal(Wechaty.valid(undefined), false, 'Wechaty.valid should return false for undefined')
  assert.equal(Wechaty.valid({}), false, 'Wechaty.valid should return false for plain object')
})

test('Wechaty.singleton() returns identical shared instance', async () => {
  const singleton1 = Wechaty.singleton()
  const singleton2 = Wechaty.singleton()

  assert.ok(singleton1, 'singleton1 should be defined')
  assert.strictEqual(singleton1, singleton2, 'Wechaty.singleton() calls must return the same instance')
})

test('WechatyBuilder.singleton() and Wechaty.singleton() share the exact same instance', async () => {
  const builderSingleton = WechatyBuilder.singleton()
  const constructorSingleton = Wechaty.singleton()

  assert.strictEqual(
    builderSingleton,
    constructorSingleton,
    'WechatyBuilder.singleton() and Wechaty.singleton() must share the same singleton instance',
  )
})

test('new Wechaty(options) accepts Puppet and runs start/stop cycle', async t => {
  const puppet = new PuppetMock()
  const wechaty = new Wechaty({ puppet })

  let started = false
  t.after(async () => {
    if (started) {
      await wechaty.stop()
    }
  })

  started = true
  await wechaty.start()
  assert.ok(PuppetMock.validInstance(wechaty.puppet), 'should set options.puppet to mock')
  await wechaty.stop()
  started = false
})

test('Wechaty type doc-typing check', async () => {
  // Verifies that Wechaty can be used as a type annotation
  const bot: Wechaty = new Wechaty()

  assert.ok(typeof bot.start === 'function', 'bot must have start method')
  assert.ok(typeof bot.stop === 'function', 'bot must have stop method')
  assert.ok(typeof bot.on === 'function', 'bot must have on method')
  assert.ok(typeof bot.say === 'function', 'bot must have say method')
  assert.ok(bot.id, 'bot should have id')

  // @ts-expect-error _stopCallbackList is protected and omitted from Wechaty doc-typing
  void bot._stopCallbackList
  // @ts-expect-error __options is protected and omitted from Wechaty doc-typing
  void bot.__options
})

test('Wechaty.valid() and WechatyBuilder.valid() consistency', async () => {
  const bot = new Wechaty()
  assert.equal(Wechaty.valid(bot), true, 'Wechaty.valid should accept Wechaty instance')
  assert.equal(WechatyBuilder.valid(bot), true, 'WechatyBuilder.valid should delegate and accept Wechaty instance')
  assert.equal(WechatyBuilder.valid(null), false, 'WechatyBuilder.valid should reject null')
  assert.equal(WechatyBuilder.valid({}), false, 'WechatyBuilder.valid should reject plain object')
})

test('Wechaty.singleton(options) returns existing singleton when options are passed subsequently', async () => {
  const singletonA = Wechaty.singleton({ name: 'initial' })
  const singletonB = Wechaty.singleton({ name: 'subsequent' })
  assert.strictEqual(singletonA, singletonB, 'subsequent singleton calls should return the same instance')
})

test('instanceof Wechaty preserves pure doc-typing in narrowing', async () => {
  const bot: unknown = new Wechaty()
  if (bot instanceof Wechaty) {
    assert.ok(bot.id, 'bot should have id')
    assert.ok(typeof bot.start === 'function', 'bot should have start')

    // @ts-expect-error _stopCallbackList is protected and omitted from Wechaty prototype doc-typing
    void bot._stopCallbackList
    // @ts-expect-error __options is protected and omitted from Wechaty prototype doc-typing
    void bot.__options
  }
})
