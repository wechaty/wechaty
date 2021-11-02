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

import {
  Puppet,
}                     from 'wechaty-puppet'
import { PuppetMock } from 'wechaty-puppet-mock'

import type {
  WechatyImplProtectedProperty,
}                                 from './wechaty.js'
import {
  WechatyImpl,
}                                 from './wechaty.js'

import * as impl from './mods/impls.js'

import {
  config,
  IoClient,
  log,
  Wechaty,
}                 from './mods/mod.js'

class WechatyTest extends WechatyImpl {

}

test('Export of the Framework', async t => {
  t.ok(impl.ContactImpl,     'should export Contact')
  t.ok(impl.FriendshipImpl,  'should export Friendship')
  t.ok(IoClient,    'should export IoClient')
  t.ok(impl.MessageImpl,     'should export Message')
  t.ok(Puppet,      'should export Puppet')
  t.ok(impl.RoomImpl,        'should export Room')
  t.ok(impl.WechatyImpl,     'should export Wechaty')
  t.ok(log,         'should export log')
})

test('static VERSION', async t => {
  t.ok('VERSION' in WechatyImpl, 'Wechaty should has a static VERSION property')
})

test('Config setting', async t => {
  t.ok(config, 'should export Config')
  // t.ok(config.default.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
})

test('event:start/stop', async t => {
  const wechaty = new WechatyImpl({ puppet: 'wechaty-puppet-mock' })

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
  const wechaty = new WechatyImpl()

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
  class MyWechatyTest extends WechatyImpl {}

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
  class MyWechatyTest extends WechatyImpl {}

  let result = ''

  const myGlobalPlugin = function () {
    return function (bot: Wechaty) {
      bot.on('message', () => { result += 'FROM_GLOBAL_PLUGIN:' })
    }
  }

  const myPlugin = function () {
    return function (bot: Wechaty) {
      bot.on('message', () => { result += 'FROM_MY_PLUGIN:' })
    }
  }

  MyWechatyTest.use(myGlobalPlugin())

  const bot = new MyWechatyTest({
    puppet: new PuppetMock(),
  })

  bot.use(myPlugin())

  bot.on('message', () => (result += 'FROM_BOT'))

  bot.emit('message', {} as any)

  await bot.stop()

  t.ok(result === 'FROM_GLOBAL_PLUGIN:FROM_MY_PLUGIN:FROM_BOT')

})

test('wechatifyUserModules()', async t => {
  const wechatyTest = new WechatyTest()

  t.doesNotThrow(() => wechatyTest._wechatifyUserModules(), 'should not throw for the 1st time init')
  t.doesNotThrow(() => wechatyTest._wechatifyUserModules(), 'should not throw for the 2nd time init (silence skip)')
})

// TODO: add test for event args

test('Perfect restart', async t => {
  const wechaty = new WechatyImpl({
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
  const puppet = new PuppetMock()
  const wechaty = new WechatyImpl({ puppet })

  const sandbox = sinon.createSandbox()
  const spy     = sandbox.spy()

  wechaty.on('ready', spy)
  t.ok(spy.notCalled, 'should no ready event with new wechaty instance')

  await wechaty.start()
  t.ok(spy.notCalled, 'should no ready event right start wechaty started')

  puppet.emit('ready', { data: 'test' })
  t.ok(spy.calledOnce, 'should fire ready event after puppet ready')

  await wechaty.stop()
  await wechaty.start()
  puppet.emit('ready', { data: 'test' })

  t.ok(spy.calledTwice, 'should fire ready event second time after stop/start wechaty')

  await wechaty.stop()
})

test('ready()', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyImpl({ puppet })

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
  const wechaty = new WechatyImpl({ puppet })

  const onMessage = (_: any) => {}
  t.equal(wechaty.listenerCount('message'), 0, 'should no listener after initializing')

  wechaty.on('message', onMessage)
  t.equal(wechaty.listenerCount('message'), 1, 'should +1 listener after on(message)')

  wechaty.off('message', onMessage)
  t.equal(wechaty.listenerCount('message'), 0, 'should -1 listener after off(message)')
})

test('wrapAsync() async function', async t => {
  const puppet = new PuppetMock()
  const wechaty = new WechatyImpl({ puppet })

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
  const wechaty = new WechatyImpl({ puppet })

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

test('WechatyImplProtectedProperty', async t => {
  type NotExistInMixin = Exclude<WechatyImplProtectedProperty, keyof WechatyImpl>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Wechaty properties for every protected property')
})
