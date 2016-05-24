const co = require('co')
const test = require('tap').test

const Browser = require('../src/puppet-web-browser')
const Bridge  = require('../src/puppet-web-bridge')
const PORT = 58788

const log = require('npmlog')
// log.level = 'silly'

test('Bridge functional testing', function(t) {
  const browser = new Browser({port: PORT})
  t.ok(browser, 'Browser instance created')

  const b = new Bridge({browser: browser})
  t.ok(b, 'Bridge instance creted')

  co(function* () {

    const EXPECTED_RETURN = 'Okey'
    function delayedFactory(timeout) {
      const startTime = Date.now()
      return function() {
        const nowTime = Date.now()
        if (nowTime - startTime > timeout) {
          return Promise.resolve(EXPECTED_RETURN)
        }
        return Promise.resolve()
      }
    }

    yield b.waitData(delayedFactory(100), 10)
    .then(r => {
      t.notOk(r, 'waitData got none when wait 10ms')
    })
    .catch(e => {
      t.fail(e)
    })

    yield b.waitData(delayedFactory(100), 100)
    .then(r => {
      t.equal(r, EXPECTED_RETURN, `waitData got "${EXPECTED_RETURN}" when wait 100ms`)
    })
    .catch(e => {
      t.fail(e)
    })

  })
  .catch(e => { // REJECTED
    t.fail(e)
  })
  .then(r => {  // FINALLY
    browser.quit()
    b.quit()
    t.end()
  })
  .catch(e => { // EXCEPTION
    t.fail(e)
  })
})

test('Bridge smoke testing', function(t) {
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
    b.quit()
    browser.quit()
    t.end()
  })
  .catch(e => {   // Exception
    t.fail('Exception:' + e)
  })
})
