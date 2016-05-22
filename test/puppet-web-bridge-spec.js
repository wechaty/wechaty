const co = require('co')
const test = require('tap').test

const Browser = require('../src/puppet-web-browser')
const Bridge  = require('../src/puppet-web-bridge')
const PORT = 58788

test('Bridge class smoking tests', function(t) {
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
