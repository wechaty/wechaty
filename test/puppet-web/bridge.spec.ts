/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'

import {
    Bridge
  , Browser
  , PuppetWeb
} from '../../src/puppet-web/'

import { spy } from 'sinon'

test('retryPromise()', async t => {
  const EXPECTED_RESOLVE = 'Okey'
  const EXPECTED_REJECT  = 'NotTheTime'

  function delayedFactory(timeout) {
    const startTime = Date.now()
    return function() {
      const nowTime = Date.now()
      if (nowTime - startTime > timeout) {
        return Promise.resolve(EXPECTED_RESOLVE)
      }
      return Promise.reject(EXPECTED_REJECT)
    }
  }

  const thenSpy = spy()

  const retryPromise = require('retry-promise').default

  let delay500 = delayedFactory(500)
  await retryPromise({ max: 1, backoff: 1 }, function() {
    return delay500()
  }).catch(e => {
    thenSpy(e)
  })
  t.true(thenSpy.withArgs(EXPECTED_REJECT).calledOnce, 'should got EXPECTED_REJECT when wait not enough')

  thenSpy.reset()
  let anotherDelay50 = delayedFactory(50)
  await retryPromise({ max: 6, backoff: 10 }, function() {
    return anotherDelay50()
  })
  .then(r => {
    thenSpy(r)
  })
  t.true(thenSpy.withArgs(EXPECTED_RESOLVE).calledOnce, 'should got EXPECTED_RESOLVE when wait enough')
})

test('WechatyBro.ding()', async t => {

  try {
    const PORT = 58788

    const browser = new Browser()
    t.truthy(browser, 'should instanciated a browser')

    const mockPuppet = {browser: browser}
    const bridge = new Bridge(mockPuppet as PuppetWeb, PORT)
    t.truthy(bridge, 'should instanciated a bridge with mocked puppet')

    await browser.init()
    t.pass('should instanciated a browser')

    await browser.open()
    t.pass('should open success')

    await bridge.inject()
    t.pass('should injected WechatyBro')

    const retDing = await bridge.execute('return WechatyBro.ding()')
    t.is(retDing, 'dong', 'should got dong after execute WechatyBro.ding()')

    // @deprecated
    // const retReady = await b.execute('return WechatyBro.isReady()')
    // t.is(typeof retReady, 'boolean', 'should got a boolean return after execute WechatyBro.isReady()')

    const retCode = await bridge.proxyWechaty('isLogin')
    t.is(typeof retCode, 'boolean', 'should got a boolean after call proxyWechaty(isLogin)')

    await bridge.quit()
    t.pass('b.quit()')
    await browser.quit()
    t.pass('browser.quit()')
  } catch (err) {
    t.fail('exception: ' + err.message)
  }
})
