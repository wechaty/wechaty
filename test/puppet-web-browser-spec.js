const co = require('co')
const test = require('tap').test

const Browser = require('../src/puppet-web-browser')
const PORT = 58788

test('Browser class smoking tests', function(t) {
  const b = new Browser({port: PORT})
  t.ok(b, 'Browser instance created')

  co(function* () {
    yield b.initDriver()
    t.pass('inited driver')

    yield b.open()
    t.pass('opened')

    const two = yield b.execute('return 1+1')
    t.equal(two, 2, 'execute script ok')
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
