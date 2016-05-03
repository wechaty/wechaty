const test = require('tape')
const PuppetWeb = require('../lib/puppet-web')

const WebBrowser = PuppetWeb.WebBrowser

test('WebBrowser class tests', function (t) {
  //t.plan(5)
  const b = new WebBrowser({browser: 'chrome'})
  t.ok(b, 'WebBrowser instance created')

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

      t.end()
    })
  })

  b.quit()

})
