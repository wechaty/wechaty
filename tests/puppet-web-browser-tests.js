const test = require('tape')
const Browser = require('../lib/puppet-web-browser')

test('Browser class smoking tests', function (t) {
  //t.plan(5)
  const b = new Browser()
  t.ok(b, 'Browser instance created')

  b.open()
  .then(() => {
    t.ok(true, 'url opened')

    b.inject()
    .then(() => {
      t.ok(true, 'wechaty injected')

      b.execute('return 1+1')
      .then(n => t.equal(n, 2, 'exec 1+1 in browser, equal 2'))

      b.execute('return Wechaty && Wechaty.ping()')
      .then(r => t.equal(r, 'pong', 'Wechaty.ping() returns pong'))

      b.execute('return Wechaty && Wechaty.isReady()')
      .then(r => t.notEqual(typeof r, 'bool', 'Wechaty.isReady() returns bool'))

      b.quit()
      t.end()
    })
  })

})
