import { test } from 'ava'

import {
    Bridge
  , Browser
  , PuppetWeb
  // , log
} from '../../src/puppet-web/'

import { spy } from 'sinon'

test('Bridge retry-promise test', async t => {
  // co(function* () {
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
    })
    // .then(r => {
    //   thenSpy(r)
    //   // t.fail('should not resolved retry-promise here')
    // })
    .catch(e => {
      thenSpy(e)
      // t.is(e, EXPECTED_REJECT, `retry-promise got ${EXPECTED_REJECT} when wait not enough`)
    })
    t.true(thenSpy.withArgs(EXPECTED_REJECT).calledOnce, 'should got EXPECTED_REJECT when wait not enough')

    thenSpy.reset()
    let anotherDelay50 = delayedFactory(50)
    await retryPromise({ max: 6, backoff: 10 }, function() {
      return anotherDelay50()
    })
    .then(r => {
      thenSpy(r)
      // t.is(r, EXPECTED_RESOLVE, `retryPromise got "${EXPECTED_RESOLVE}" when wait enough`)
    })
    // .catch(e => {
    //   thenSpy(e)
    //   // t.fail(`should not be rejected(with ${e}) when there is enough wait`)
    // })
    t.true(thenSpy.withArgs(EXPECTED_RESOLVE).calledOnce, 'should got EXPECTED_RESOLVE when wait enough')
})

test('Bridge smoking test', async t => {
  const PORT = 58788

  const browser = new Browser()
  t.truthy(browser, 'should instanciated a browser')

  const mockPuppet = {browser: browser}
  const b = new Bridge(mockPuppet as PuppetWeb, PORT)
  t.truthy(b, 'should instanciated a bridge with mocked puppet')

  await browser.init()
  t.pass('should instanciated a browser')

  await browser.open()
  t.pass('should open success')

  await b.inject()
  t.pass('should injected WechatyBro')

  const retDing = await b.execute('return WechatyBro.ding()')
  t.is(retDing, 'dong', 'should got dong after execute WechatyBro.ding()')

  // @deprecated
  // const retReady = await b.execute('return WechatyBro.isReady()')
  // t.is(typeof retReady, 'boolean', 'should got a boolean return after execute WechatyBro.isReady()')

  const retCode = await b.proxyWechaty('isLogin')
  t.is(typeof retCode, 'boolean', 'should got a boolean after call proxyWechaty(isLogin)')

  await b.quit()
  t.pass('b.quit()')
  await browser.quit()
  t.pass('browser.quit()')
})
