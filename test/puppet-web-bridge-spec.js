const co = require('co')
const test = require('tap').test

const Browser = require('../src/puppet-web-browser')
const Bridge  = require('../src/puppet-web-bridge')
const PORT = 58788

const log = require('npmlog')
// log.level = 'silly'

test('Bridge retry-promise testing', function(t) {
  co(function* () {
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
    yield retryPromise({max:1, backoff: 10}, function() {
      return delay50()
    })
    .then(r => {
      t.fail('retry-promise should not be resolved here')
    })
    .catch(e => {
      t.equal(e, EXPECTED_REJECT, `retry-promise got ${EXPECTED_REJECT} when wait not enough`)
    })

    var anotherDelay50 = delayedFactory(50)
    yield retryPromise({max:6, backoff: 10}, function() {
      return anotherDelay50()
    })
    .then(r => {
      t.equal(r, EXPECTED_RESOLVE, `retryPromise got "${EXPECTED_RESOLVE}" when wait enough`)
    })
    .catch(e => {
      t.fail(`should not be rejected(with ${e}) when there is enough wait`)
    })

  })
  .catch(e => { // REJECTED
    t.fail(e)
  })
  .then(r => {  // FINALLY
    t.end()
  })
  .catch(e => { // EXCEPTION
    t.fail(e)
  })
})

test('Bridge smoking test', function(t) {
  const browser = new Browser({port: PORT})
  t.ok(browser, 'Browser instance created')

  const b = new Bridge({browser: browser})
  t.ok(b, 'Bridge instance creted')

  co(function* () {
    yield browser.init()
    t.pass('inited')

    yield b.inject()
    t.pass('wechaty injected')

    const retDing = yield b.execute('return Wechaty && Wechaty.ding()')
    t.equal(retDing, 'dong', 'execute Wechaty.ding()')

    const retReady = yield b.execute('return Wechaty && Wechaty.isReady()')
    t.equal(typeof retReady, 'boolean', 'execute Wechaty.isReady()')

    const retCode = yield b.proxyWechaty('getLoginStatusCode')
    t.equal(typeof retCode, 'number', 'getLoginStatusCode')
  })
  .catch((e) => { // Rejected
    t.fail('co promise rejected:' + e)
  })
  .then(r => {    // Finally
    co(function* () {
      yield b.quit()
      t.pass('b.quit()')
      yield browser.quit()
      t.pass('browser.quit()')
      
      t.end()
    })
  })
  .catch(e => {   // Exception
    t.fail('Exception:' + e)
  })
})
