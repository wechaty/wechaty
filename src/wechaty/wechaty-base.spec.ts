#!/usr/bin/env -S node --import=tsx/esm
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
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { MemoryCard } from 'memory-card'
import { PuppetMock } from 'wechaty-puppet-mock'

/**
 * Huan(202111): must import `./wechaty-impl.js`
 *  before import `./wechaty-base.js`
 *
 * Or will throw error:
 *
 *    ReferenceError: Cannot access 'WechatyBase' before initialization
 *    at file:///home/huan/git/wechaty/wechaty/src/wechaty/wechaty-impl.ts:25:47
 *
 * TODO: find out why
 */
import './wechaty-impl.js'

import type {
  WechatyBaseProtectedProperty,
}                                 from './wechaty-base.js'
import {
  WechatyBase,
}                                 from './wechaty-base.js'

import type {
  WechatyInterface,
}                           from '../wechaty/wechaty-impl.js'
import { WechatySkeleton }  from './wechaty-skeleton.js'

class WechatyTest extends WechatyBase {
}

test('static VERSION', async _t => {
  assert.ok('VERSION' in WechatyBase, 'Wechaty should has a static VERSION property')
})

test('event:start/stop', async t => {
  const wechaty = new WechatyBase({ puppet: new PuppetMock() })

  const startSpy = t.mock.fn()
  const stopSpy  = t.mock.fn()
  let started = false
  t.after(async () => {
    if (started) {
      await wechaty.stop()
    }
  })

  wechaty.on('start', startSpy)
  wechaty.on('stop',  stopSpy)

  started = true
  await wechaty.start()
  await wechaty.stop()
  started = false

  assert.equal(startSpy.mock.callCount(), 1, 'should get event:start once')
  assert.equal(stopSpy.mock.callCount(), 1,  'should get event:stop once')
})

//
// FIXME: restore this unit test !!!
//
// test.only('event:scan', async _t => {
//   const m = {} as any

//   const asyncHook = asyncHooks.createHook({
//     init(asyncId: number, type: string, triggerAsyncId: number, resource: Object) {
//       m[asyncId] = type
//     },
//     before(asyncId) {
//       // delete m[asyncId]
//     },
//     after(asyncId) {
//       // delete m[asyncId]
//     },
//     destroy(asyncId) {
//       delete m[asyncId]
//     },
//   })
//   asyncHook.enable()

//   const wechaty = Wechaty.instance()

//   const spy = sinon.spy()

//   wechaty.on('scan', spy)

//   const scanFuture  = new Promise(resolve => wechaty.once('scan', resolve))
//   // wechaty.once('scan', () => console.log('FAINT'))

//   await wechaty.start()
//   await scanFuture
//   // await new Promise(r => setTimeout(r, 1000))
//   await wechaty.stop()

//   assert.ok(spy.calledOnce, 'should get event:scan')
//   asyncHook.disable()

//   console.log(m)
// })

test.skip('SKIP DEALING WITH THE LISTENER EXCEPTIONS. on(event, Function)', async t => {
  const spy     = t.mock.fn()
  const wechaty = new WechatyBase()

  const EXPECTED_ERROR = new Error('testing123')
  wechaty.on('message', () => { throw EXPECTED_ERROR })
  // wechaty.on('scan',    () => 42)
  wechaty.on('error',   spy)

  const messageFuture  = new Promise(resolve => wechaty.once('message', resolve))
  wechaty.emit('message', {} as any)

  await messageFuture
  await wechaty.stop()

  assert.equal(spy.mock.callCount(), 1, 'should get event:error once')
  assert.equal(spy.mock.calls[0]?.arguments[0], EXPECTED_ERROR, 'should get error from message listener')

})

test.skip('SKIP DEALING WITH THE LISTENER EXCEPTIONS. test async error', async t => {

  // Do not modify the global Wechaty instance
  class MyWechatyTest extends WechatyBase {}

  const EXPECTED_ERROR = new Error('test')

  const bot = new MyWechatyTest({
    puppet: new PuppetMock(),
  })
  let started = false
  t.after(async () => {
    if (started) {
      await bot.stop()
    }
  })

  const asyncErrorFunction = function () {
    return new Promise<void>((resolve, reject) => {
      setTimeout(function () {
        reject(EXPECTED_ERROR)
      }, 100)
      // tslint ask resolve must be called,
      // so write a falsy value, so that it never called
      if (+new Date() < 0) {
        resolve()
      }
    })
  }

  bot.on('message', async () => {
    await asyncErrorFunction()
  })
  bot.on('error', (e) => {
    assert.ok(e.message === EXPECTED_ERROR.message)
  })

  bot.emit('message', {} as any)

  await bot.stop()
})

test('use plugin', async t => {

  // Do not modify the gloabl Wechaty instance
  class MyWechatyTest extends WechatyBase {}

  let result = ''

  // const myGlobalPlugin = function () {
  //   return function (bot: WechatyInterface) {
  //     bot.on('message', () => { result += 'FROM_GLOBAL_PLUGIN:' })
  //   }
  // }

  const myPlugin = function () {
    return function (bot: WechatyInterface) {
      bot.on('message', () => { result += 'FROM_MY_PLUGIN:' })
    }
  }

  // MyWechatyTest.use(myGlobalPlugin())

  const bot = new MyWechatyTest({
    puppet: new PuppetMock(),
  })
  let started = false
  t.after(async () => {
    if (started) {
      await bot.stop()
    }
  })

  bot.use(myPlugin())

  started = true
  await bot.start()

  bot.on('message', () => (result += 'FROM_BOT'))

  bot.emit('message', {} as any)

  await bot.stop()
  started = false

  assert.equal(result, 'FROM_MY_PLUGIN:FROM_BOT', 'should get plugin works')

})

test('wechatifyUserModules init()', async _t => {
  const wechatyTest = new WechatyTest()

  assert.doesNotThrow(() => wechatyTest.init(), 'should not throw for the 1st time init')
  assert.doesNotThrow(() => wechatyTest.init(), 'should not throw for the 2nd time init (silence skip)')
})

test('lifecycle order and restart', async t => {
  const trace: string[] = []
  class LifecycleWechaty extends WechatyBase {
    override async init () {
      trace.push('init')
      await super.init()
    }

    override async onStart () {
      trace.push('onStart')
      await super.onStart()
    }

    override async onStop () {
      trace.push('onStop')
      await super.onStop()
    }
  }

  const puppet = new PuppetMock()
  const startPuppet = t.mock.method(puppet, 'start', async () => { trace.push('puppet.start') })
  const stopPuppet = t.mock.method(puppet, 'stop', async () => { trace.push('puppet.stop') })
  const bot = new LifecycleWechaty({ puppet })
  bot.on('start', () => trace.push('start'))
  bot.on('stop', () => trace.push('stop'))

  try {
    await bot.start()
    await bot.stop()
    await bot.start()
    await bot.stop()
  } finally {
    await bot.stop()
  }

  assert.deepEqual(trace, [
    'init', 'init', 'puppet.start', 'onStart', 'start', 'onStop', 'stop', 'puppet.stop',
    'init', 'init', 'puppet.start', 'onStart', 'start', 'onStop', 'stop', 'puppet.stop',
  ], 'should preserve lifecycle ordering across restarts')
  assert.equal(startPuppet.mock.callCount(), 2, 'should start the puppet once per lifecycle')
  assert.equal(stopPuppet.mock.callCount(), 2, 'should stop the puppet once per lifecycle')
})

test('puppet and user modules initialize once', async () => {
  const puppet = new PuppetMock()
  const bot = new WechatyBase({ puppet })

  let puppetEvents = 0
  assert.throws(() => bot.puppet, { message: 'NOPUPPET' }, 'puppet getter should be guarded before init')
  assert.throws(() => bot.Contact, /can not be used before wechaty\.start\(\)/, 'user module getter should be guarded before init')
  bot.on('puppet', candidate => {
    puppetEvents++
    assert.equal(candidate, puppet, 'should emit the resolved puppet')
    assert.throws(() => bot.puppet, { message: 'NOPUPPET' }, 'should not assign the puppet during the event')
  })

  try {
    await bot.init()
    const Contact = bot.Contact
    const puppetMessageListeners = puppet.listenerCount('message')
    await bot.init()

    assert.equal(bot.Contact, Contact, 'should retain the bot-bound user module')
    assert.equal(bot.puppet, puppet, 'should assign the puppet after its event')
    assert.equal(puppetEvents, 1, 'should emit the puppet event only once')
    assert.equal(puppet.listenerCount('message'), puppetMessageListeners, 'should not register duplicate puppet listeners')
  } finally {
    await bot.stop()
  }
})

test('bot-bound Contact classes and pools are isolated', async () => {
  const puppet1 = new PuppetMock()
  const puppet2 = new PuppetMock()
  const bot1 = new WechatyBase({ puppet: puppet1 })
  const bot2 = new WechatyBase({ puppet: puppet2 })

  try {
    const user1 = puppet1.mocker.createContact({ id: 'user-id' })
    const user2 = puppet2.mocker.createContact({ id: 'user-id' })
    puppet1.mocker.createContact({ id: 'shared-id' })
    puppet2.mocker.createContact({ id: 'shared-id' })
    await Promise.all([ bot1.start(), bot2.start() ])
    await Promise.all([ puppet1.mocker.login(user1), puppet2.mocker.login(user2) ])

    const Contact1 = bot1.Contact
    const Contact2 = bot2.Contact
    const contact1 = await Contact1.find({ id: 'shared-id' })
    const contact2 = await Contact2.find({ id: 'shared-id' })

    assert.notEqual(Contact1, Contact2, 'should bind a distinct Contact class to each bot')
    assert.equal(Contact1.wechaty, bot1, 'should bind the first Contact class to its bot')
    assert.equal(Contact2.wechaty, bot2, 'should bind the second Contact class to its bot')
    assert.notEqual(contact1, contact2, 'should keep pooled Contact instances separate')
    assert.equal(Contact1.pool.size, 1, 'should keep the first bot pool independent')
    assert.equal(Contact2.pool.size, 1, 'should keep the second bot pool independent')
  } finally {
    await Promise.all([ bot1.stop(), bot2.stop() ])
  }
})

test('startup puppet failure depends on error listener (#2855)', async t => {
  const handledPuppet = new PuppetMock()
  const handledBot = new WechatyBase({ puppet: handledPuppet })
  const expectedError = new Error('puppet start failed')
  t.mock.method(handledPuppet, 'start', async () => { throw expectedError })

  const errors: Error[] = []
  handledBot.on('error', error => errors.push(error))
  try {
    await handledBot.start()
    assert.equal(errors.length, 1, 'should emit the startup failure to an error listener')
    assert.equal(errors[0]?.message, expectedError.message, 'should preserve the startup failure message')
  } finally {
    await handledBot.stop()
  }

  const baseUrl = pathToFileURL(resolve('src/wechaty/wechaty-base.ts')).href
  const implUrl = pathToFileURL(resolve('src/wechaty/wechaty-impl.ts')).href
  const script = [
    `await import(${JSON.stringify(implUrl)})`,
    `const { WechatyBase } = await import(${JSON.stringify(baseUrl)})`,
    `const { PuppetMock } = await import('wechaty-puppet-mock')`,
    `const puppet = new PuppetMock()`,
    `puppet.start = async () => { throw new Error('puppet start failed') }`,
    `const bot = new WechatyBase({ puppet })`,
    `try { await bot.start(); process.exitCode = 1 } catch { process.exit(0) }`,
  ].join(';')
  const result = spawnSync(process.execPath, [ '--import=tsx/esm', '--input-type=module', '-e', script ], {
    encoding: 'utf8',
    timeout: 10_000,
  })
  assert.equal(result.status, 0, 'should reject startup without an error listener in an isolated process')
})

test('puppet startup timeout is tolerated', async t => {
  const puppet = new PuppetMock()
  const puppetStarted = new Promise<void>(resolveStarted => {
    t.mock.method(puppet, 'start', () => {
      resolveStarted()
      return new Promise<void>(() => {})
    })
  })
  const bot = new WechatyBase({ puppet })
  bot.on('error', error => assert.fail('timeout should not emit error: ' + error))

  try {
    const start = bot.start()
    await Promise.race([
      puppetStarted,
      start.then(() => { throw new Error('startup completed before puppet.start') }),
    ])
    assert.equal(await start, undefined, 'should continue startup after the puppet start timeout')
  } finally {
    await bot.stop()
  }
})

// TODO: add test for event args

test('Perfect restart', async t => {
  const wechaty = new WechatyBase({
    puppet: new PuppetMock(),
  })
  let started = false
  t.after(async () => {
    if (started) {
      await wechaty.stop()
    }
  })

  try {
    for (let i = 0; i < 3; i++) {
      started = true
      await wechaty.start()
      await wechaty.stop()
      started = false
    }
  } catch (e) {
    assert.fail(e as any)
  }

})

test('@event ready', async t => {
  const puppet  = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const spy = t.mock.fn()
  let started = false
  t.after(async () => {
    if (started) {
      await wechaty.stop()
    }
  })

  wechaty.on('ready', spy)
  assert.equal(spy.mock.callCount(), 0, 'should no ready event with new wechaty instance')

  started = true
  await wechaty.start()
  assert.equal(spy.mock.callCount(), 0, 'should no ready event right start wechaty started')

  puppet.emit('ready', { data: 'test' })
  assert.equal(spy.mock.callCount(), 1, 'should fire ready event after puppet ready')

  await wechaty.stop()
  started = false
  started = true
  await wechaty.start()
  assert.equal(spy.mock.callCount(), 1, 'should fire ready event second time after stop/start wechaty')

  puppet.emit('ready', { data: 'test' })

  assert.equal(spy.mock.callCount(), 2, 'should fire ready event third time after stop/start wechaty')

  await wechaty.stop()
  started = false
})

test('ready()', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })
  const spy = t.mock.fn()
  let started = false
  t.after(async () => {
    if (started) {
      await wechaty.stop()
    }
  })

  wechaty.ready()
    .then(spy)
    .catch(e => assert.fail('rejection: ' + e))

  assert.equal(spy.mock.callCount(), 0, 'should not ready with new wechaty instance')

  started = true
  await wechaty.start()

  assert.equal(spy.mock.callCount(), 0, 'should not ready after right start wechaty')

  puppet.emit('ready', { data: 'test' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(spy.mock.callCount(), 1, 'should ready after puppet ready')

  await wechaty.stop()
  started = false
  started = true
  await wechaty.start()
  wechaty.ready()
    .then(spy)
    .catch(e => assert.fail('rejection: ' + e))

  puppet.emit('ready', { data: 'test' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(spy.mock.callCount(), 2, 'should ready again after stop/start wechaty')

  await wechaty.stop()
  started = false
})

test('on/off event listener management', async _t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const onMessage = (_: any) => {}
  assert.equal(wechaty.listenerCount('message'), 0, 'should no listener after initializing')

  wechaty.on('message', onMessage)
  assert.equal(wechaty.listenerCount('message'), 1, 'should +1 listener after on(message)')

  wechaty.off('message', onMessage)
  assert.equal(wechaty.listenerCount('message'), 0, 'should -1 listener after off(message)')
})

test('wrapAsync() async function', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const spy = t.mock.fn()
  wechaty.on('error', spy)

  const DATA = 'test'
  const asyncFunc = async () => DATA
  const syncFunc = wechaty.wrapAsync(asyncFunc)

  assert.equal(syncFunc(), undefined, 'should get sync function return void')
  assert.equal(spy.mock.callCount(), 0, 'should not emit error when sync function return value')

  const asyncFunc2 = async () => { throw new Error('test') }
  const syncFunc2 = wechaty.wrapAsync(asyncFunc2)
  assert.doesNotThrow(() => syncFunc2(), 'should not throw when async function throw error')
  await wechaty.sleep(0)  // wait async event loop task to be executed
  assert.equal(spy.mock.callCount(), 1, 'should emit error when async function throw error')
})

test('wrapAsync() promise', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const spy = t.mock.fn()
  wechaty.on('error', spy)

  const DATA = 'test'
  const promise = Promise.resolve(DATA)
  const wrappedPromise = wechaty.wrapAsync(promise)
  assert.equal(await wrappedPromise, undefined, 'should resolve Promise<any> to void')

  const rejection = Promise.reject(new Error('test'))
  const wrappedRejection = wechaty.wrapAsync(rejection)
  assert.equal(wrappedRejection, undefined, 'should be void and not to reject')

  assert.equal(spy.mock.callCount(), 0, 'should have no error before sleep')
  await wechaty.sleep(0)  // wait async event loop task to be executed
  assert.equal(spy.mock.callCount(), 1, 'should emit error when promise reject with error')
})

test('WechatyBaseProtectedProperty', async _t => {
  type NotExistInMixin = Exclude<WechatyBaseProtectedProperty, keyof WechatyBase | `_${string}`>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Wechaty properties for every protected property')
})

test('WechatySkeleton: super.{start,stop}()', async t => {

  const puppet = new PuppetMock()
  const memory = new MemoryCard()

  const wechaty = new WechatyTest({
    memory,
    puppet,
  })
  let started = false
  t.after(async () => {
    if (started) {
      await wechaty.stop()
    }
  })

  const startStub = t.mock.method(WechatySkeleton.prototype, 'start', async () => {})
  const stopStub  = t.mock.method(WechatySkeleton.prototype, 'stop', async () => {})

  assert.equal(startStub.mock.callCount(), 0, 'should not called before start')
  assert.equal(stopStub.mock.callCount(), 0, 'should not called before stop')

  started = true
  await wechaty.start()
  assert.equal(startStub.mock.callCount(), 1, 'should call the skeleton start(), which means all mixin start()s are chained correctly')
  assert.equal(stopStub.mock.callCount(), 0, 'should not call stop yet')

  await wechaty.stop()
  started = false
  assert.equal(startStub.mock.callCount(), 1, 'should only call start once')
  assert.equal(stopStub.mock.callCount(), 1, 'should call the skeleton stop(), which means all mixin stops()s are chained correctly')
})
