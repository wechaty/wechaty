const co    = require('co')
const util  = require('util')
const test  = require('tap').test
const retryPromise = require('retry-promise').default

const log = require('../src/npmlog-env')

const PORT = process.env.WECHATY_PORT || 58788
const HEAD = process.env.WECHATY_HEAD || false
const PROFILE = 'unit-test-session.wechaty.json'

const PuppetWeb = require('../src/puppet-web')

test('Puppet Web watchdog timer', function(t) {
  const pw = new PuppetWeb({port: PORT, head: HEAD, profile: PROFILE})
  t.ok(pw, 'should instantiate a PuppetWeb')

  co(function* () {
    yield pw.initBrowser()
    t.pass('should init the browser')
    yield pw.initBridge()
    t.pass('should init the bridge')

    yield pw.bridge.quit().catch(e => {/* fail safe */})
    yield pw.browser.quit().catch(e => {/* fail safe */})
    t.pass('should kill both browser & bridge')

    let errorCounter = 0
    pw.once('error', e => errorCounter = 1)
    pw.watchDog('feed_and_active_it', {timeout: 1})
    yield new Promise((resolve) => setTimeout(() => resolve(), 2)) // wait untill reset
    t.equal(errorCounter, 1, 'should get event[error] after watchdog timeout')

    pw.once('error', e => t.fail('waitDing() triggered watchDogReset()'))

    const EXPECTED_DING_DATA = 'dingdong'
    pw.watchDog('feed to extend the dog life')

    const origLogLevel = log.level
    // log.level = 'silent'
    t.pass('set log.level = silent to mute log when watchDog reset wechaty')
    const dong = yield waitDing(EXPECTED_DING_DATA)
    log.level = origLogLevel
    t.equal(dong, EXPECTED_DING_DATA, 'should get EXPECTED_DING_DATA from ding after watchdog reset')
  })
  .catch(e => { // Exception
    t.fail('co exception: ' + e.message)
  })
  .then(() => { // Finally
    pw.quit()
    .then(t.end)
  })

  return
  /////////////////////////////////////////////////////////////////////////////
  function waitDing(data) {
    const max = 7
    const backoff = 2000

    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}
    // timeout = 45,000 for {max: 30, backoff: 100}
    // timeout = 49,000 for {max: 7, backoff: 2000}
    const timeout = max * (backoff * max) / 2

    return retryPromise({max: max, backoff: backoff}, function(attempt) {
      log.silly('TestPuppetWeb', 'waitDing() retryPromise: attampt %s/%s time for timeout %s'
        , attempt, max, timeout)
      return pw.ding(data)
      .then(r => {
        if (!r) {
          throw new Error('got empty return')
        } else {
          return r
        }
      })
      .catch(e => {
        log.verbose('TestPuppetWeb', 'waitDing() exception: %s', e.message)
        throw e
      })
    })
    .catch(e => {
      log.error('TestPuppetWeb', 'retryPromise() waitDing() finally FAIL: %s', e.message)
      throw e
    })
  }
})
