import { test } from 'ava'

import {
  PuppetWeb
  , log
} from '../../'

// const co = require('co')
// const test = require('tape')

const Browser = PuppetWeb.Browser
const Bridge  = PuppetWeb.Bridge
const PORT = 58788

// const log = require('../../src/npmlog-env')

test('Bridge retry-promise testing', async t => {
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

    const retryPromise = require('retry-promise').default

    var delay50 = delayedFactory(50)
    await retryPromise({max:1, backoff: 10}, function() {
      return delay50()
    })
    .then(r => {
      t.fail('should not resolved retry-promise here')
    })
    .catch(e => {
      t.is(e, EXPECTED_REJECT, `retry-promise got ${EXPECTED_REJECT} when wait not enough`)
    })

    var anotherDelay50 = delayedFactory(50)
    await retryPromise({max:6, backoff: 10}, function() {
      return anotherDelay50()
    })
    .then(r => {
      t.is(r, EXPECTED_RESOLVE, `retryPromise got "${EXPECTED_RESOLVE}" when wait enough`)
    })
    .catch(e => {
      t.fail(`should not be rejected(with ${e}) when there is enough wait`)
    })

  // })
  // .catch(e => { // REJECTED
  //   t.fail(e)
  // })
  // .then(r => {  // FINALLY
  //   t.end()
  // })
  // .catch(e => { // EXCEPTION
  //   t.fail(e)
  // })
})

test('Bridge smoking test', async t => {
  const browser = new Browser({port: PORT})
  t.truthy(browser, 'should instanciated a browser')

  const mockPuppet = {browser: browser}
  const b = new Bridge({puppet: mockPuppet, port: PORT})
  t.truthy(b, 'should instanciated a bridge with mocked puppet')

  // co(function* () {
    await browser.init()
    t.pass('should instanciated a browser')

    await browser.open()
    t.pass('should open success')

    await b.inject()
    t.pass('should injected wechaty')

    const retDing = await b.execute('return Wechaty.ding()')
    t.is(retDing, 'dong', 'should got dong after execute Wechaty.ding()')

    // @deprecated
    // const retReady = await b.execute('return Wechaty.isReady()')
    // t.is(typeof retReady, 'boolean', 'should got a boolean return after execute Wechaty.isReady()')

    const retCode = await b.proxyWechaty('isLogin')
    t.is(typeof retCode, 'boolean', 'should got a boolean after call proxyWechaty(isLogin)')

    await b.quit()
    t.pass('b.quit()')
    await browser.quit()
    t.pass('browser.quit()')

  // })
  // .catch(e => {                               // Rejected
  //   t.fail('co promise rejected:' + e)
  // })
  // .then(r => {                                // Finally
  //   return co(function* () {
  //     await b.quit()
  //     t.pass('b.quit()')
  //     await browser.quit()
  //     t.pass('browser.quit()')

  //     t.end()
  //   })
  // })
  // .catch(e => {                               // Exception
  //   t.fail('Test Exception:' + e)
  //   t.end()
  // })
})
