const co    = require('co')
const util  = require('util')
const test  = require('tap').test
const retryPromise = require('retry-promise').default

const log = require('../../src/npmlog-env')

const PORT = process.env.WECHATY_PORT || 58788
const HEAD = process.env.WECHATY_HEAD || false
const PROFILE = 'unit-test-session.wechaty.json'

const PuppetWeb = require('../../src/puppet-web')
const Watchdog = require('../../src/puppet-web/watchdog.js')

test('Puppet Web watchdog timer', function(t) {
  const pw = new PuppetWeb({port: PORT, head: HEAD, profile: PROFILE})
  t.ok(pw, 'should instantiate a PuppetWeb')

  Watchdog.onFeed.call(pw, { data: 'initing directly' })
  t.pass('should ok with default food type')

  co(function* () {

    const origLogLevel = log.level
    if (log.level === 'info') {
      log.level = 'silent'
    }

    yield pw.init()
    pw.quit()
    // yield pw.bridge.quit()
    // pw.bridge = null
    // yield pw.browser.quit()
    // pw.browser = null

    let errorCounter = 0
    pw.once('error', e => errorCounter = 1)
    pw.emit('watchdog', {
      data: 'active_for_timeout_1ms'
      , timeout: 1
    })
    yield new Promise(resolve => setTimeout(resolve, 1000)) // wait untill reset
    t.equal(errorCounter, 1, 'should get event[error] after watchdog timeout')

    pw.once('error', e => t.fail('waitDing() triggered watchDogReset()'))

    const EXPECTED_DING_DATA = 'dingdong'
    pw.emit('watchdog', { data: 'feed to extend the dog life' })

    t.pass('set log.level = silent to mute log when watchDog reset wechaty temporary')
    const dong = yield waitDing(EXPECTED_DING_DATA)
    t.equal(dong, EXPECTED_DING_DATA, 'should get EXPECTED_DING_DATA from ding after watchdog reset, and restored log level')

    log.level = origLogLevel

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
    const max = 13
    const backoff = 1000

    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}
    // timeout = 45,000 for {max: 30, backoff: 100}
    // timeout = 49,000 for {max: 7, backoff: 2000}
    // timeout = 84,500 for {max: 13, backoff: 1000}
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
