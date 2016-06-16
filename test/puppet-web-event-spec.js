const co    = require('co')
const util  = require('util')
const test  = require('tap').test
const retryPromise = require('retry-promise').default

const log = require('../src/npmlog-env')

const PORT = process.env.WECHATY_PORT || 58788
const HEAD = process.env.WECHATY_HEAD || false
const SESSION = 'unit-test-session.wechaty.json'

const PuppetWeb = require('../src/puppet-web')
const PuppetWebEvent = require('../src/puppet-web-event')

test('Puppet Web Event smoking test', function(t) {
  let pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
  t.ok(pw, 'should instantiated a PuppetWeb')

  co(function* () {
    yield pw.init()
    t.pass('should be inited')

    yield PuppetWebEvent.onBrowserDead.call(pw, 'test')
  })
  .catch(e => t.fail(e))  // Reject
  .then(r => {            // Finally 1
    pw.quit().then(t.end)
  })
  .catch(e => t.fail(e))  // Exception
})
