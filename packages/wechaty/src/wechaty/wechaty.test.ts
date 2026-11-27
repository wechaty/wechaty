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

import { mock, PuppetMock } from 'wechaty-puppet-mock'
import {
  LifecycleSupersededError,
  LifecycleUnsafeStateError,
} from 'scopelet'

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

  await bot.init()
  assert.ok(bot.memory, 'bot.memory should be accessible after init()')
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

test('Wechaty lifecycle: legacy events follow state transitions across start, reset, and stop', async () => {
  const puppet = new PuppetMock()
  const bot = new Wechaty({ puppet })
  const events: string[] = []

  bot.addEventListener('start', () => events.push('start'))
  bot.addEventListener('stop', () => events.push('stop'))

  assert.equal(bot.state.active(), false)
  assert.equal(bot.isStopped, true)
  assert.equal(bot.isActive, false)
  assert.equal(bot.state.inactive(), true)
  assert.equal(bot.legacyState.active(), false)
  assert.equal(bot.legacyState.inactive(), true)

  const running = bot.whenRunning()
  await bot.start()
  await running
  assert.equal(bot.isRunning, true)
  assert.deepEqual(events, [ 'start' ])
  assert.equal(bot.state.active(), true)
  assert.equal(bot.state.inactive(), false)
  assert.equal(bot.state.generation, 1)

  await bot.reset()
  assert.deepEqual(events, [ 'start', 'start' ], "'start' fires on every generation that commits running")
  assert.equal(bot.state.generation, 2)
  assert.equal(bot.state.active(), true)
  assert.equal(bot.state.inactive(), false)

  const stopped = bot.whenStopped()
  await bot.stop()
  await stopped
  assert.equal(bot.isStopped, true)
  assert.deepEqual(events, [ 'start', 'start', 'stop' ])
  assert.equal(bot.state.active(), false)
  assert.equal(bot.state.inactive(), true)
})

test('Wechaty state-switch view: active, inactive, on, off, and stable()', async () => {
  const puppet = new PuppetMock()
  const bot = new Wechaty({ puppet })

  assert.equal(bot.state.active(), false)
  assert.equal(bot.state.inactive(), true)
  assert.equal(bot.state.on(), false)
  assert.equal(bot.state.off(), true)

  await bot.start()
  assert.equal(bot.state.active(), true)
  assert.equal(bot.state.inactive(), false)
  assert.equal(bot.state.on(), true)
  assert.equal(bot.state.off(), false)

  await bot.state.stable('active')

  await bot.stop()
  assert.equal(bot.state.active(), false)
  assert.equal(bot.state.inactive(), true)
  assert.equal(bot.state.on(), false)
  assert.equal(bot.state.off(), true)

  await bot.state.stable('inactive')
})

test('Wechaty ready(): delegates to puppet ready condition and rejects on early stop', async () => {
  const puppet = new PuppetMock()
  const bot = new Wechaty({ puppet })

  const readyPromise = bot.ready()
  let readyResolved = false
  readyPromise.then(() => { readyResolved = true }).catch(() => {})

  await bot.start()
  assert.equal(readyResolved, false, 'bot should not be ready immediately after start if puppet is not ready')

  puppet.emit('ready', { data: 'test' })
  await readyPromise
  assert.equal(readyResolved, true, 'bot.ready() should resolve when puppet emits ready')

  await bot.stop()

  // Stopping before puppet is ready rejects pending ready()
  const bot2 = new Wechaty({ puppet: new PuppetMock() })
  const earlyReady = bot2.ready()
  await bot2.stop()
  await assert.rejects(earlyReady, (err: unknown) => {
    assert.ok(err instanceof LifecycleSupersededError)
    return true
  })
})

test('Wechaty startup failure: emits single error event and rejects ready() waits', async () => {
  class FailPuppet extends PuppetMock {
    override async onStart (): Promise<void> {
      throw new Error('deliberate startup failure')
    }
  }

  const bot = new Wechaty({ puppet: new FailPuppet() })
  const errors: any[] = []
  bot.addEventListener('error', (event) => {
    errors.push((event.detail as any)?.gerror || event.detail)
  })

  const readyPromise = bot.ready()
  await assert.rejects(bot.start(), /deliberate startup failure/)

  assert.equal(errors.length, 1, 'should emit startup error exactly once')
  assert.match(String(errors[0]), /deliberate startup failure/)

  await assert.rejects(readyPromise, (err: unknown) => {
    assert.ok(err instanceof LifecycleSupersededError)
    return true
  })
})

test('Wechaty ready({ signal }): aborting before init removes resolver without leaking', async () => {
  const bot = new Wechaty({ puppet: new PuppetMock() })
  const ac = new AbortController()

  const readyPromise = bot.ready({ signal: ac.signal })
  ac.abort(new Error('aborted before init'))

  await assert.rejects(readyPromise, /aborted before init/)

  // Starting subsequently should succeed cleanly without leaking aborted waiter
  await bot.start()
  assert.equal(bot.state.active(), true)
  await bot.stop()
})

test('Wechaty ready(): resolves across restart() / reset()', async () => {
  const puppet = new PuppetMock()
  const bot = new Wechaty({ puppet })
  await bot.start()

  const readyPromise1 = bot.ready()
  puppet.emit('ready', { data: 'test-1' })
  await readyPromise1

  await bot.reset()
  const readyPromise2 = bot.ready()
  puppet.emit('ready', { data: 'test-2' })
  await readyPromise2
  assert.equal(bot.state.active(), true)

  await bot.stop()
})

test('Wechaty publish(): stop() waits for in-flight post publication to drain', async () => {
  let resolvePublish!: () => void
  const publishGate = new Promise<void>(resolve => {
    resolvePublish = resolve
  })

  class SlowPostPuppet extends PuppetMock {
    override async postPublish (_payload: any): Promise<any> {
      await publishGate
      return undefined
    }
  }

  const bot = new Wechaty({ puppet: new SlowPostPuppet() })
  await bot.start()

  let published = false
  const fakePost = {
    payload: {
      sayableList: [],
    },
  } as any

  const publishPromise = bot.publish(fakePost).then(() => {
    published = true
  })

  let stopResolved = false
  const stopPromise = bot.stop().then(() => {
    stopResolved = true
  })

  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(published, false, 'publish should still be in-flight')
  assert.equal(stopResolved, false, 'stop must wait for in-flight publish()')

  resolvePublish()
  await publishPromise
  assert.equal(published, true)
  await stopPromise
  assert.equal(stopResolved, true, 'stop resolves after publish drains')
})

test('Wechaty say(): stop() waits for in-flight send, and say() while stopped rejects', async () => {
  let resolveWire!: () => void
  const wirePromise = new Promise<void>(resolve => {
    resolveWire = resolve
  })

  class SlowPuppet extends PuppetMock {
    override async messageSendText (_conversationId: string, _text: string): Promise<void> {
      await wirePromise
    }
  }

  const puppet = new SlowPuppet()
  const bot = new Wechaty({ puppet })
  await bot.start()

  let saidResolved = false
  const sendPromise = bot.say('conversation-1', 'hello slow world').then(() => {
    saidResolved = true
  })

  let stopResolved = false
  const stopPromise = bot.stop().then(() => {
    stopResolved = true
  })

  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(saidResolved, false, 'say() should still be pending')
  assert.equal(stopResolved, false, 'stop() must wait for in-flight say()')

  resolveWire()
  await sendPromise
  assert.equal(saidResolved, true)
  await stopPromise
  assert.equal(stopResolved, true, 'stop() resolves after in-flight say() drains')

  // Calling say while stopped should reject
  await assert.rejects(
    () => bot.say('conversation-1', 'after stop'),
    (err: unknown) => err instanceof LifecycleUnsafeStateError,
  )
})

test('Wechaty startup failure in init(): emits single error event and rejects start()', async () => {
  const bot = new Wechaty({ puppet: 'non-existent-puppet-module' as any })
  const errors: any[] = []
  bot.addEventListener('error', event => {
    errors.push((event.detail as any)?.gerror || event.detail)
  })

  await assert.rejects(bot.start())
  await bot.whenState(s => s.kind === 'failed' || s.kind === 'stopped')
  assert.equal(errors.length, 1, 'should emit init failure error exactly once')
})

test('Wechaty startup failure in Io: emits single error event and rejects start()', async () => {
  if (typeof (globalThis as any).process?.cwd !== 'function') {
    return
  }
  const { Io } = await import('../io.ts')
  const origOnStart = (Io.prototype as any).onStart
  ;(Io.prototype as any).onStart = async () => {
    throw new Error('io connection refused')
  }

  try {
    const bot = new Wechaty({
      puppet: new PuppetMock(),
      ioToken: 'fake-token-for-test',
    })
    const errors: any[] = []
    bot.addEventListener('error', event => {
      errors.push((event.detail as any)?.gerror || event.detail)
    })

    await assert.rejects(bot.start(), /io connection refused/)
    await bot.whenState(s => s.kind === 'failed' || s.kind === 'stopped')
    assert.equal(errors.length, 1, 'should emit io startup failure exactly once')
  } finally {
    ;(Io.prototype as any).onStart = origOnStart
  }
})

test('Wechaty start() cancellation does not emit error event', async () => {
  let resolvePuppetStart!: () => void
  const puppetStartGate = new Promise<void>(resolve => {
    resolvePuppetStart = resolve
  })

  class SlowStartPuppet extends PuppetMock {
    override async onStart (): Promise<void> {
      await puppetStartGate
    }
  }

  const bot = new Wechaty({ puppet: new SlowStartPuppet() })
  const errors: any[] = []
  bot.addEventListener('error', event => {
    errors.push((event.detail as any)?.gerror || event.detail)
  })

  const startPromise = bot.start()
  await new Promise(resolve => setTimeout(resolve, 10))

  const stopPromise = bot.stop()
  resolvePuppetStart()

  await assert.rejects(startPromise, (err: unknown) => {
    assert.ok(err instanceof LifecycleSupersededError)
    return true
  })
  await stopPromise

  assert.equal(errors.length, 0, 'normal cancellation must not emit error events')
})

test('Wechaty concurrent start() calls on failure emit error exactly once', async () => {
  class FailPuppet extends PuppetMock {
    override async onStart (): Promise<void> {
      throw new Error('concurrent deliberate failure')
    }
  }

  const bot = new Wechaty({ puppet: new FailPuppet() })
  const errors: any[] = []
  bot.addEventListener('error', event => {
    errors.push((event.detail as any)?.gerror || event.detail)
  })

  await Promise.allSettled([ bot.start(), bot.start() ])
  assert.equal(errors.length, 1, 'concurrent start() failures must emit error exactly once')
})

test('Wechaty.create() resolves named puppet before returning the bot', async () => {
  const injected = new PuppetMock()
  const botFromInstance = await Wechaty.create({ puppet: injected })
  assert.strictEqual(botFromInstance.puppet, injected)

  if (typeof (globalThis as any).process?.cwd !== 'function') {
    return
  }
  const bot = await Wechaty.create({ puppet: 'wechaty-puppet-mock' })
  assert.ok(bot.puppet instanceof PuppetMock, 'Wechaty.create() should bind resolved Puppet before returning')
  await bot.start()
  assert.equal(bot.isRunning, true)
  await bot.stop()
})

test('Wechaty starts Puppet and Io concurrently with capture armed before synchronous scan', async () => {
  if (typeof (globalThis as any).process?.cwd !== 'function') {
    return
  }
  const puppetGate = Promise.withResolvers<void>()
  const puppetStarting = Promise.withResolvers<void>()
  const ioConnecting = Promise.withResolvers<void>()
  let scanReceivedOnBot = false

  class ConcurrentScanPuppet extends PuppetMock {
    override async onStart (): Promise<void> {
      // Synchronous first scan emitted while Io is still connecting
      this.emit('scan', { qrcode: 'https://wechaty.js.org/qr/sync', status: 2 })
      puppetStarting.resolve()
      await puppetGate.promise
    }
  }

  const { Io } = await import('../io.ts')
  const ioGate = Promise.withResolvers<void>()
  let ioConnectStarted = false
  const origConnect = (Io.prototype as any).connect
  const origOnStop = (Io.prototype as any).onStop

  // Use a local ws stub by mocking Io.prototype.connect
  ;(Io.prototype as any).connect = async function (this: any) {
    ioConnectStarted = true
    ioConnecting.resolve()
    await ioGate.promise
    return { ping: () => {}, close: () => {}, terminate: () => {}, readyState: 1 }
  }
  // Prevent keepalive / flush from touching fake ws
  ;(Io.prototype as any).onStop = async function () {}

  const bot = new Wechaty({
    puppet: new ConcurrentScanPuppet(),
    ioToken: 'test-io-token',
  })
  try {
    bot.addEventListener('scan', () => {
      scanReceivedOnBot = true
    })

    const starting = bot.start()
    await Promise.all([ ioConnecting.promise, puppetStarting.promise ])
    assert.equal(ioConnectStarted, true, 'Io connect should start concurrently with Puppet onStart')
    assert.equal(scanReceivedOnBot, true, 'synchronous scan should be forwarded to bot immediately')
    assert.ok(
      (bot.io as any).eventBuffer.some((e: any) => e.name === 'scan'),
      'Io capture must already be armed before Puppet starts so synchronous scan is buffered',
    )

    ioGate.resolve()
    puppetGate.resolve()
    await starting
    assert.equal(bot.isRunning, true)
  } finally {
    ioGate.resolve()
    puppetGate.resolve()
    await bot.stop().catch(() => {})
    ;(Io.prototype as any).connect = origConnect
    ;(Io.prototype as any).onStop = origOnStop
  }
})

test('Wechaty bot lifecycle contract: start, scan, ready, send, stop, and restart', async () => {
  const mocker = new mock.Mocker()
  const puppet = new PuppetMock({ mocker })
  await using bot = new Wechaty({ puppet })

  const events: string[] = []
  bot.addEventListener('start', () => events.push('start'))
  bot.addEventListener('scan', () => events.push('scan'))
  bot.addEventListener('ready', () => events.push('ready'))
  bot.addEventListener('stop', () => events.push('stop'))

  const ready1 = bot.ready()
  await bot.start()
  puppet.emit('scan', { qrcode: 'qr-1', status: 2 })
  puppet.emit('ready')
  await ready1

  const user = mocker.createContact({ name: 'Alice' })
  mocker.login(user)
  const msgId = await bot.say(user.id, 'hello v2')
  assert.ok(typeof msgId === 'string' || msgId === undefined)

  await bot.restart()
  assert.equal(bot.isRunning, true)
  const ready2 = bot.ready()
  puppet.emit('ready')
  await ready2

  await bot.stop()
  assert.equal(bot.isStopped, true)
  assert.ok(events.includes('start'))
  assert.ok(events.includes('scan'))
  assert.ok(events.includes('ready'))
  assert.ok(events.includes('stop'))
})

test('Wechaty bot-bound Contact classes and pools are isolated', async () => {
  const bot1 = new Wechaty({ puppet: new PuppetMock() })
  const bot2 = new Wechaty({ puppet: new PuppetMock() })
  assert.notStrictEqual(bot1.Contact, bot2.Contact)
  assert.notStrictEqual(bot1.Room, bot2.Room)
  assert.notStrictEqual(bot1.Message, bot2.Message)

  const c1 = (bot1.Contact as any).load('id-1')
  const c2 = (bot2.Contact as any).load('id-1')
  assert.notStrictEqual(c1, c2)
  assert.equal(c1.wechaty, bot1)
  assert.equal(c2.wechaty, bot2)
  assert.ok(c1 instanceof bot1.Contact)
  assert.ok(c1 instanceof bot2.Contact, 'canonical Contact preserves instanceof across bots')

  const delay = bot1.Delay.create(1)
  assert.equal(delay.wechaty, bot1)
  await delay.wait()

  // Bound Message.toLocation() and Message.toPost() route through bot1
  const puppet1 = bot1.puppet as PuppetMock
  const self = puppet1.mocker.createContact({ name: 'self' })
  await bot1.start()
  try {
    await puppet1.mocker.login(self)
    puppet1.messagePayload = async id => ({
      id,
      talkerId: self.id,
      timestamp: Date.now(),
      type: id === 'loc-msg' ? bot1.Message.Type.Location : bot1.Message.Type.Post,
    } as any)
    puppet1.messageLocation = async () => ({ accuracy: 1, address: 'addr', latitude: 0, longitude: 0, name: 'loc' })
    puppet1.postPayload = async id => ({ id, counter: {}, sayableList: [], type: 1 } as any)

    const locMsg = (bot1.Message as any).load('loc-msg')
    await locMsg.ready()
    const loc = await locMsg.toLocation()
    assert.equal(loc.wechaty, bot1)

    const postMsg = (bot1.Message as any).load('post-msg')
    await postMsg.ready()
    const post = await postMsg.toPost()
    assert.equal(post.wechaty, bot1)
  } finally {
    await bot1.stop()
  }

  // Stopped bot entity domain methods reject immediately with LifecycleUnsafeStateError
  await assert.rejects(() => c1.say('hi'), /LifecycleUnsafeStateError|not running/i)
  await assert.rejects(() => c1.sync(), /LifecycleUnsafeStateError|not running/i)
  const room = (bot1.Room as any).load('room-1')
  await assert.rejects(() => room.say('hi'), /LifecycleUnsafeStateError|not running/i)
  await assert.rejects(() => room.sync(), /LifecycleUnsafeStateError|not running/i)
})

test('Wechaty readiness invalidates on Puppet reset and independent puppet.restart()', async () => {
  const puppet = new PuppetMock()
  await using bot = new Wechaty({ puppet })

  await bot.start()
  puppet.emit('ready')
  await bot.ready()

  // Puppet reset event clears bot readiness
  puppet.emit('reset', { data: 'reset' })
  let readyAfterReset = false
  const waitAfterReset = bot.ready().then(() => { readyAfterReset = true })
  await Promise.resolve()
  assert.equal(readyAfterReset, false, 'bot.ready() must wait after puppet reset')
  puppet.emit('ready')
  await waitAfterReset
  assert.equal(readyAfterReset, true)

  // Independent puppet.restart() clears bot readiness until new generation emits ready
  class GatedPuppet extends PuppetMock {
    gate = Promise.withResolvers<void>()
    entered = Promise.withResolvers<void>()
    override async onStart (): Promise<void> {
      this.entered.resolve()
      await this.gate.promise
    }
  }
  const gp = new GatedPuppet()
  await using bot2 = new Wechaty({ puppet: gp })
  const startP = bot2.start()
  await gp.entered.promise
  gp.emit('ready')
  gp.gate.resolve()
  await startP
  await bot2.ready()

  gp.gate = Promise.withResolvers<void>()
  gp.entered = Promise.withResolvers<void>()
  const restartP = gp.restart()
  await gp.entered.promise
  let readyAfterRestart = false
  const waitAfterRestart = bot2.ready().then(() => { readyAfterRestart = true })
  await Promise.resolve()
  assert.equal(readyAfterRestart, false, 'bot.ready() must not resolve while puppet is restarting')
  gp.emit('ready')
  gp.gate.resolve()
  await restartP
  await waitAfterRestart
  assert.equal(readyAfterRestart, true)
})

test('IoManager.prepare() disarms capture when scope retires before Io starts', async () => {
  if (typeof (globalThis as any).process?.cwd !== 'function') {
    return
  }
  const { IoManager } = await import('../components/io-manager.ts')
  const { createLifecycle } = await import('scopelet')

  const bot = new Wechaty({ puppet: new PuppetMock(), ioToken: 'test-token' })
  const ioManager = new IoManager(bot, { ioToken: 'test-token' })
  let capturedIo: any

  const lc = createLifecycle({
    onStart: async scope => {
      capturedIo = await ioManager.prepare(scope)
      throw new Error('abort before io.start')
    },
  })

  await assert.rejects(lc.start(), /abort before io\.start/)
  assert.ok(capturedIo)
  // After scope retires without starting Io, dispatchEvent('scan') should no longer buffer into capturedIo
  const beforeLen = capturedIo.eventBuffer.length
  const { WechatyEvent } = await import('wechaty-puppet')
  bot.dispatchEvent(new WechatyEvent('scan', { detail: { qrcode: 'after-abort', status: 2 } }))
  assert.equal(capturedIo.eventBuffer.length, beforeLen, 'disarmed Io must not buffer events after cancelled startup')
})

test('Wechaty init() rethrows non-"already loaded" memory load errors', async () => {
  const { MemoryCard } = await import('memory-card')
  const memory = new MemoryCard()
  memory.load = async () => {
    throw new Error('disk failure')
  }
  const bot = new Wechaty({ puppet: new PuppetMock(), memory })
  await assert.rejects(bot.init(), /disk failure/)
})




