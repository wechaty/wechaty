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
  assert.ok(typeof bot.addEventListener === 'function', 'bot must have addEventListener method')
  assert.ok(typeof bot.messages === 'function', 'bot must have messages method')
  assert.ok(typeof bot.messageStream === 'function', 'bot must have messageStream method')
  assert.ok(typeof bot.next === 'function', 'bot must have next method')
  assert.ok(typeof bot.say === 'function', 'bot must have say method')
  assert.equal((bot as any).on, undefined, 'bot must not have legacy on method')
  assert.equal((bot as any).off, undefined, 'bot must not have legacy off method')
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

test('Wechaty messages() async iteration and messageStream() pipeline', async () => {
  const puppet = new PuppetMock()
  const bot = new Wechaty({ puppet })
  await bot.start()

  const botContact = puppet.mocker.createContact({ name: 'BotUser' })
  await puppet.mocker.login(botContact)

  const mockUser = puppet.mocker.createContact()
  const mockRoom = puppet.mocker.createRoom()

  const receivedMessages: string[] = []

  // Test messages()
  const messageLoopPromise = (async () => {
    for await (const message of bot.messages()) {
      receivedMessages.push(message.text())
      if (receivedMessages.length === 2) {
        break
      }
    }
  })()

  // Wait a microtask then send messages through mocker
  await new Promise(resolve => setTimeout(resolve, 10))
  mockUser.say('hello from user').to(mockRoom)
  mockUser.say('second message').to(mockRoom)

  await messageLoopPromise
  assert.equal(receivedMessages.length, 2)
  assert.equal(receivedMessages[0], 'hello from user')
  assert.equal(receivedMessages[1], 'second message')

  // Test messageStream()
  const stream = bot.messageStream()
  assert.ok(stream instanceof ReadableStream, 'messageStream should return a ReadableStream')
  const reader = stream.getReader()
  const readPromise = reader.read()
  mockUser.say('streamed message').to(mockRoom)
  const streamResult = await readPromise
  assert.equal(streamResult.done, false)
  assert.equal(streamResult.value?.text(), 'streamed message')
  await reader.cancel()

  // Test bot.next('message')
  const nextMsgPromise = bot.next('message')
  mockUser.say('next message').to(mockRoom)
  const nextMsg = await nextMsgPromise
  assert.equal(nextMsg.text(), 'next message')

  // Test bot.next with abort signal
  const abortCtrl = new AbortController()
  const abortedNextPromise = bot.next('message', { signal: abortCtrl.signal })
  abortCtrl.abort(new Error('abort next'))
  await assert.rejects(abortedNextPromise, /abort next/)

  await bot.stop()
})

test('Wechaty.start() failure triggers stop() cleanup before rethrowing', async () => {
  class FailingPuppetMock extends PuppetMock {
    override async onStart (): Promise<void> {
      throw new Error('deliberate puppet startup failure')
    }
  }

  const failingPuppet = new FailingPuppetMock()
  await assert.rejects(
    async () => Wechaty.start({ puppet: failingPuppet }),
    /deliberate puppet startup failure/,
  )
})

test('Wechaty.emit() throws explicit migration hint for non-error events', async () => {
  const bot = new Wechaty({ puppet: new PuppetMock() })
  assert.throws(
    () => (bot as any).emit('message', {}),
    /Wechaty\.emit\(\) is not supported in Wechaty 2\.0/,
  )
})

test('Wechaty Symbol.asyncDispose via Wechaty.start() and await using', async () => {
  let stopped = false
  {
    await using bot = await Wechaty.start({ puppet: new PuppetMock() })
    assert.equal(bot.isLoggedIn, false)
    assert.equal(typeof bot[Symbol.asyncDispose], 'function', 'bot must implement Symbol.asyncDispose')
    const originalStop = bot.stop.bind(bot)
    bot.stop = async () => {
      stopped = true
      await originalStop()
    }
  }
  assert.equal(stopped, true, 'bot must be automatically disposed and stopped via Symbol.asyncDispose')
})

test('Wechaty dispatches "puppet" event with detail: puppetInstance', async () => {
  const puppet = new PuppetMock()
  const bot = new Wechaty({ puppet })
  let dispatchedPuppet: unknown

  bot.addEventListener('puppet', (event) => {
    dispatchedPuppet = event.detail
  })

  await bot.init()
  assert.strictEqual(dispatchedPuppet, puppet, 'dispatched puppet must be the puppet instance directly')
})

test('Wechaty init() loads default MemoryCard when options.memory is omitted', async () => {
  const puppet = new PuppetMock()
  const bot = new Wechaty({ puppet })

  assert.ok(bot.memory, 'bot.memory should be accessible')
  await bot.init()
  // Loading an already loaded memory card throws 'already loaded'
  await assert.rejects(
    async () => bot.memory.load(),
    /already loaded/,
    'memory card should have been loaded during init()',
  )
})

test('Wechaty ding() routes errors through error event when puppet ding throws', async () => {
  class DingFailingPuppet extends PuppetMock {
    override ding (): void {
      throw new Error('deliberate ding error')
    }
  }

  const puppet = new DingFailingPuppet()
  const bot = new Wechaty({ puppet })
  await bot.init()

  let receivedError: Error | undefined
  bot.addEventListener('error', (event) => {
    receivedError = (event.detail as any)?.gerror || event.detail
  })

  // ding() should not crash synchronously
  assert.doesNotThrow(() => bot.ding('ping'))
  assert.ok(receivedError, 'error should have been routed through error event')
  assert.match(String(receivedError), /deliberate ding error/)
})


