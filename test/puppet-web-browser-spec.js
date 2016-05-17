const co = require('co')
const test = require('tape')

const Browser = require('../src/puppet-web-browser')
const PORT = 58788

test('Browser class smoking tests', function(t) {
  const b = new Browser({port: PORT})
  t.ok(b, 'Browser instance created')

  co(function* () {
    yield b.init()
    t.pass('inited')

    yield b.open()
    t.pass('opened')

    yield b.inject()
    t.pass('wechaty injected')

    const retDing = yield b.execute('return Wechaty && Wechaty.ding()')
    t.equal(retDing, 'dong', 'execute Wechaty.ding()')

    const retReady = yield b.execute('return Wechaty && Wechaty.isReady()')
    t.equal(typeof retReady, 'boolean', 'execute Wechaty.isReady()')
  })
  .catch((e) => { // Rejected
    t.fail('co promise rejected:' + e)
  })
  .then(r => {    // Finally
    b.quit()
    t.end()
  })
  .catch(e => {   // Exception
    t.fail('Exception:' + e)
  })
})
