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
