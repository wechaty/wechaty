#!/usr/bin/env ts-node

/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'
import * as sinon from 'sinon'

/* tslint:disable:no-var-requires */
const retryPromise = require('retry-promise').default

import { log } from '../../src/config'
import Profile from '../../src/profile'

import {
  PuppetWeb,
  Watchdog,
}               from '../../src/puppet-web/'

const PROFILE = 'unit-test-session.wechaty.json'

process.on('unhandledRejection', (reason, p) => {
  console.log('!!!!!!! unhandledRejection in watchdog.spec.ts')
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  console.log('!!!!!!!')
})

test('timer', async t => {
  const pw = new PuppetWeb({
    profile: new Profile(PROFILE),
  })
  t.ok(pw, 'should instantiate a PuppetWeb')

  try {
    pw.addListener('error', failOnUnexpectedErrorEvent)

    await pw.init()
    Watchdog.onFeed.call(pw, { data: 'initing directly from test' })
    t.pass('should ok with default food type')
    await pw.quit()

    pw.state.target('live')
    // pw.browser.state.target('open')

    const savedLevel = log.level()
    if (log.level() === 'info') {
      log.level('silent')
      t.pass('set log.level = silent to mute log when watchDog reset wechaty temporary')
    }

    {
      pw.removeListener('error', failOnUnexpectedErrorEvent)

      t.is(pw.state.target()  , 'live', 'puppet web should at target  state `live`')
      t.is(pw.state.current() , 'dead', 'puppet web should at current state `dead`')
      t.true(pw.state.stable(), 'puppet web state should stable')

      const spy = sinon.spy()
      pw.once('error', spy)
      pw.emit('watchdog', {
        data: 'active_for_timeout_1ms',
        timeout: 1,
      })
      await new Promise(resolve => setTimeout(resolve, 10)) // wait until reset
      t.ok(spy.calledOnce, 'should get event[error] after watchdog timeout')

      pw.addListener('error', failOnUnexpectedErrorEvent)
    }

    const EXPECTED_DING_DATA = 'dingdong'
    pw.emit('watchdog', { data: 'feed to extend the dog life', timeout: 120000 })

    const dong = await waitDing(EXPECTED_DING_DATA)
    t.is(dong, EXPECTED_DING_DATA, 'should get EXPECTED_DING_DATA from ding after watchdog reset, and restored log level')

    log.level(savedLevel)
    await pw.quit()
            .catch(e => { // fail safe
              log.warn('TestPuppetWeb', 'timer last pw.quit() exception: %s', e.message)
            })

    return

  } catch (e) {
    t.fail('exception: ' + e.message + ', ' + e.stack)
  }
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

    return retryPromise({max, backoff }, async function(attempt) {
      log.silly('TestPuppetWeb', 'waitDing() retryPromise: attampt %s/%s time for timeout %s',
                                  attempt, max, timeout)

      try {
        const r = await pw.ding(data)
        if (!r) {
          throw new Error('got empty return')
        }
        return r
      } catch (e) {
        log.verbose('TestPuppetWeb', 'waitDing() exception: %s', e.message)
        throw e
      }

    })
    .catch(e => {
      log.error('TestPuppetWeb', 'retryPromise() waitDing() finally FAIL: %s', e.message)
      throw e
    })
  }

  function failOnUnexpectedErrorEvent(e: Error) {
    t.fail('should not get unexpected `error` event: ' + e.message + ', ' + e.stack)
  }
})
