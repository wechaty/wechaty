const co    = require('co')
const util  = require('util')
const test  = require('tape')
const retryPromise = require('retry-promise').default

const log = require('../../src/npmlog-env')

const PORT = process.env.WECHATY_PORT || 58788
const PROFILE = 'unit-test-session.wechaty.json'

const PuppetWeb = require('../../src/puppet-web')
const PuppetWebEvent = require('../../src/puppet-web/event')

test('Puppet Web Event smoking test', function(t) {
  let pw = new PuppetWeb({profile: PROFILE})
  t.ok(pw, 'should instantiated a PuppetWeb')

  co(function* () {
    yield pw.init()
    t.pass('should be inited')

    yield PuppetWebEvent.onBrowserDead.call(pw, 'event unit test')
    t.pass('should finish onBrowserDead event process')
  })
  .catch(e => t.fail(e))  // Reject
  .then(r => {            // Finally
    pw.quit()
    .then(_ => t.end())
  })
  .catch(e => t.fail(e))  // Exception
})
