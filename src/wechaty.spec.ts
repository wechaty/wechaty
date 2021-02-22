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
import test  from 'blue-tape'
import sinon from 'sinon'

import { PuppetMock } from 'wechaty-puppet-mock'

import {
  Wechaty,
}                             from './wechaty'

import {
  config,
  Contact,
  Friendship,
  IoClient,
  log,
  Message,

  Room,
}                 from './mod'

import {
  Puppet,
}                     from 'wechaty-puppet'

class WechatyTest extends Wechaty {

  public wechatifyUserModulesTest (puppet: Puppet): void {
    return this.wechatifyUserModules(puppet)
  }

}

test('Export of the Framework', async t => {
  t.ok(Contact,     'should export Contact')
  t.ok(Friendship,  'should export Friendship')
  t.ok(IoClient,    'should export IoClient')
  t.ok(Message,     'should export Message')
  t.ok(Puppet,      'should export Puppet')
  t.ok(Room,        'should export Room')
  t.ok(Wechaty,     'should export Wechaty')
  t.ok(log,         'should export log')
})

test('static VERSION', async t => {
  t.true('VERSION' in Wechaty, 'Wechaty should has a static VERSION property')
})

test('Config setting', async t => {
  t.ok(config, 'should export Config')
  // t.ok(config.default.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
})

test('event:start/stop', async t => {
  const wechaty = new Wechaty({ puppet: 'wechaty-puppet-mock' })

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
  const wechaty = Wechaty.instance()

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

test.skip('SKIP DEALING WITH THE LISTENER EXCEPTIONS. test async error', async (t) => {

  // Do not modify the global Wechaty instance
  class MyWechatyTest extends Wechaty {}

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

test('use plugin', async (t) => {

  // Do not modify the gloabl Wechaty instance
  class MyWechatyTest extends Wechaty {}

  let result = ''

  const myGlobalPlugin = function () {
    return function (bot: Wechaty) {
      bot.on('message', () => (result += 'FROM_GLOBAL_PLUGIN:'))
    }
  }

  const myPlugin = function () {
    return function (bot: Wechaty) {
      bot.on('message', () => (result += 'FROM_MY_PLUGIN:'))
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

test('initPuppetAccessory()', async t => {
  const wechatyTest = new WechatyTest()

  const puppet = new PuppetMock()
  t.doesNotThrow(() => wechatyTest.wechatifyUserModulesTest(puppet), 'should not throw for the 1st time init')
  t.throws(() => wechatyTest.wechatifyUserModulesTest(puppet),       'should throw for the 2nd time init')
})

// TODO: add test for event args

test('Wechaty restart for many times', async t => {
  const wechaty = new Wechaty({
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
    t.fail(e)
  }

})

test('@event ready', async t => {
  const puppet = new PuppetMock()
  const wechaty = new Wechaty({ puppet })

  const sandbox = sinon.createSandbox()
  const spy     = sandbox.spy()

  wechaty.on('ready', spy)
  t.true(spy.notCalled, 'should no ready event with new wechaty instance')

  await wechaty.start()
  t.true(spy.notCalled, 'should no ready event right start wechaty started')

  puppet.emit('ready', { data: 'test' })
  t.true(spy.calledOnce, 'should fire ready event after puppet ready')

  await wechaty.stop()
  await wechaty.start()
  puppet.emit('ready', { data: 'test' })

  t.true(spy.calledTwice, 'should fire ready event second time after stop/start wechaty')

  await wechaty.stop()
})

test('ready()', async t => {
  const puppet = new PuppetMock()
  const wechaty = new Wechaty({ puppet })

  const sandbox = sinon.createSandbox()

  const spy = sandbox.spy()

  wechaty.ready()
    .then(spy)
    .catch(e => t.fail('rejection: ' + e))

  t.true(spy.notCalled, 'should not ready with new wechaty instance')

  await wechaty.start()

  t.true(spy.notCalled, 'should not ready after right start wechaty')

  puppet.emit('ready', { data: 'test' })
  await new Promise(resolve => setImmediate(resolve))
  t.true(spy.calledOnce, 'should ready after puppet ready')

  await wechaty.stop()
  await wechaty.start()
  wechaty.ready()
    .then(spy)
    .catch(e => t.fail('rejection: ' + e))

  puppet.emit('ready', { data: 'test' })
  await new Promise(resolve => setImmediate(resolve))
  t.true(spy.calledTwice, 'should ready again after stop/start wechaty')

  await wechaty.stop()
})

test('on/off event listener management', async t => {
  const puppet = new PuppetMock()
  const wechaty = new Wechaty({ puppet })

  const onMessage = (_: any) => {}
  t.equal(wechaty.listenerCount('message'), 0, 'should no listener after initializing')

  wechaty.on('message', onMessage)
  t.equal(wechaty.listenerCount('message'), 1, 'should +1 listener after on(message)')

  wechaty.off('message', onMessage)
  t.equal(wechaty.listenerCount('message'), 0, 'should -1 listener after off(message)')

})
