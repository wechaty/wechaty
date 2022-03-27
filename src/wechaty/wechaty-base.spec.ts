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
import {
  test,
  sinon,
}              from 'tstest'

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

test('static VERSION', async t => {
  t.ok('VERSION' in WechatyBase, 'Wechaty should has a static VERSION property')
})

test('event:start/stop', async t => {
  const wechaty = new WechatyBase({ puppet: 'wechaty-puppet-mock' })

  const startSpy = sinon.spy()
  const stopSpy  = sinon.spy()

  wechaty.on('start', startSpy)
  wechaty.on('stop',  stopSpy)

  await wechaty.start()
  await wechaty.stop()

  // console.log(startSpy.callCount)
  t.ok(startSpy.calledOnce, 'should get event:start once')
  t.ok(stopSpy.calledOnce,  'should get event:stop once')
})

//
// FIXME: restore this unit test !!!
//
// test.only('event:scan', async t => {
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

//   t.ok(spy.calledOnce, 'should get event:scan')
//   asyncHook.disable()

//   console.log(m)
// })

test.skip('SKIP DEALING WITH THE LISTENER EXCEPTIONS. on(event, Function)', async t => {
  const spy     = sinon.spy()
  const wechaty = new WechatyBase()

  const EXPECTED_ERROR = new Error('testing123')
  wechaty.on('message', () => { throw EXPECTED_ERROR })
  // wechaty.on('scan',    () => 42)
  wechaty.on('error',   spy)

  const messageFuture  = new Promise(resolve => wechaty.once('message', resolve))
  wechaty.emit('message', {} as any)

  await messageFuture
  await wechaty.stop()

  t.ok(spy.calledOnce, 'should get event:error once')
  t.equal(spy.firstCall.args[0], EXPECTED_ERROR, 'should get error from message listener')

})

test.skip('SKIP DEALING WITH THE LISTENER EXCEPTIONS. test async error', async t => {

  // Do not modify the global Wechaty instance
  class MyWechatyTest extends WechatyBase {}

  const EXPECTED_ERROR = new Error('test')

  const bot = new MyWechatyTest({
    puppet: new PuppetMock(),
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
    t.ok(e.message === EXPECTED_ERROR.message)
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

  bot.use(myPlugin())

  await bot.start()

  bot.on('message', () => (result += 'FROM_BOT'))

  bot.emit('message', {} as any)

  await bot.stop()

  t.equal(result, 'FROM_MY_PLUGIN:FROM_BOT', 'should get plugin works')

})

test('wechatifyUserModules init()', async t => {
  const wechatyTest = new WechatyTest()

  t.doesNotThrow(() => wechatyTest.init(), 'should not throw for the 1st time init')
  t.doesNotThrow(() => wechatyTest.init(), 'should not throw for the 2nd time init (silence skip)')
})

// TODO: add test for event args

test('Perfect restart', async t => {
  const wechaty = new WechatyBase({
    puppet: new PuppetMock(),
  })

  try {
    for (let i = 0; i < 3; i++) {
      await wechaty.start()
      await wechaty.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('Wechaty start/restart successed.')
  } catch (e) {
    t.fail(e as any)
  }

})

test('@event ready', async t => {
  const puppet  = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const sandbox = sinon.createSandbox()
  const spy     = sandbox.spy()

  wechaty.on('ready', spy)
  t.ok(spy.notCalled, 'should no ready event with new wechaty instance')

  await wechaty.start()
  t.ok(spy.notCalled, 'should no ready event right start wechaty started')

  puppet.emit('ready', { data: 'test' })
  t.equal(spy.callCount, 1, 'should fire ready event after puppet ready')

  await wechaty.stop()
  await wechaty.start()
  t.equal(spy.callCount, 1, 'should fire ready event second time after stop/start wechaty')

  puppet.emit('ready', { data: 'test' })

  t.equal(spy.callCount, 2, 'should fire ready event third time after stop/start wechaty')

  await wechaty.stop()
})

test('ready()', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const sandbox = sinon.createSandbox()

  const spy = sandbox.spy()

  wechaty.ready()
    .then(spy)
    .catch(e => t.fail('rejection: ' + e))

  t.ok(spy.notCalled, 'should not ready with new wechaty instance')

  await wechaty.start()

  t.ok(spy.notCalled, 'should not ready after right start wechaty')

  puppet.emit('ready', { data: 'test' })
  await new Promise(resolve => setImmediate(resolve))
  t.ok(spy.calledOnce, 'should ready after puppet ready')

  await wechaty.stop()
  await wechaty.start()
  wechaty.ready()
    .then(spy)
    .catch(e => t.fail('rejection: ' + e))

  puppet.emit('ready', { data: 'test' })
  await new Promise(resolve => setImmediate(resolve))
  t.ok(spy.calledTwice, 'should ready again after stop/start wechaty')

  await wechaty.stop()
})

test('on/off event listener management', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const onMessage = (_: any) => {}
  t.equal(wechaty.listenerCount('message'), 0, 'should no listener after initializing')

  wechaty.on('message', onMessage)
  t.equal(wechaty.listenerCount('message'), 1, 'should +1 listener after on(message)')

  wechaty.off('message', onMessage)
  t.equal(wechaty.listenerCount('message'), 0, 'should -1 listener after off(message)')
})

test('wrapAsync() async function', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const spy = sinon.spy()
  wechaty.on('error', spy)

  const DATA = 'test'
  const asyncFunc = async () => DATA
  const syncFunc = wechaty.wrapAsync(asyncFunc)

  t.notOk(syncFunc(), 'should get sync function return void')
  t.ok(spy.notCalled, 'should not emit error when sync function return value')

  const asyncFunc2 = async () => { throw new Error('test') }
  const syncFunc2 = wechaty.wrapAsync(asyncFunc2)
  t.doesNotThrow(() => syncFunc2(), 'should not throw when async function throw error')
  await wechaty.sleep(0)  // wait async event loop task to be executed
  t.ok(spy.calledOnce, 'should emit error when async function throw error')
})

test('wrapAsync() promise', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyBase({ puppet })

  const spy = sinon.spy()
  wechaty.on('error', spy)

  const DATA = 'test'
  const promise = Promise.resolve(DATA)
  const wrappedPromise = wechaty.wrapAsync(promise)
  t.equal(await wrappedPromise, undefined, 'should resolve Promise<any> to void')

  const rejection = Promise.reject(new Error('test'))
  const wrappedRejection = wechaty.wrapAsync(rejection)
  t.equal(wrappedRejection, undefined, 'should be void and not to reject')

  t.equal(spy.callCount, 0, 'should have no error before sleep')
  await wechaty.sleep(0)  // wait async event loop task to be executed
  t.equal(spy.callCount, 1, 'should emit error when promise reject with error')
})

test('WechatyBaseProtectedProperty', async t => {
  type NotExistInMixin = Exclude<WechatyBaseProtectedProperty, keyof WechatyBase | `_${string}`>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Wechaty properties for every protected property')
})

test('WechatySkeleton: super.{start,stop}()', async t => {
  const sandbox = sinon.createSandbox()

  const puppet = new PuppetMock()
  const memory = new MemoryCard()

  const wechaty = new WechatyTest({
    memory,
    puppet,
  })

  const startStub = sandbox.stub(WechatySkeleton.prototype, 'start').resolves()
  const stopStub  = sandbox.stub(WechatySkeleton.prototype, 'stop').resolves()

  t.ok(startStub.notCalled, 'should not called before start')
  t.ok(stopStub.notCalled, 'should not called before stop')

  await wechaty.start()
  t.ok(startStub.calledOnce, 'should call the skeleton start(), which means all mixin start()s are chained correctly')
  t.ok(stopStub.notCalled, 'should not call stop yet')

  await wechaty.stop()
  t.ok(startStub.calledOnce, 'should only call start once')
  t.ok(stopStub.calledOnce, 'should call the skeleton stop(), which means all mixin stops()s are chained correctly')
})
