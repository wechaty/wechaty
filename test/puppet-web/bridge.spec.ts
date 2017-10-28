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
// import * as sinon from 'sinon'

// import { log }  from '../../src/config'
// log.level('silly')

import Profile  from '../../src/profile'

import Bridge   from '../../src/puppet-web/bridge'

import { spy } from 'sinon'

test('retryPromise()', async t => {
  const EXPECTED_RESOLVE = 'Okey'
  const EXPECTED_REJECT  = 'NotTheTime'

  function delayedFactory(timeout) {
    const startTime = Date.now()
    return function() {
      const nowTime = Date.now()
      if (nowTime - startTime > timeout) {
        return Promise.resolve(EXPECTED_RESOLVE)
      }
      return Promise.reject(EXPECTED_REJECT)
    }
  }

  const thenSpy = spy()

  const retryPromise = require('retry-promise').default

  const delay500 = delayedFactory(500)
  await retryPromise({ max: 1, backoff: 1 }, function() {
    return delay500()
  }).catch(e => {
    thenSpy(e)
  })
  t.true(thenSpy.withArgs(EXPECTED_REJECT).calledOnce, 'should got EXPECTED_REJECT when wait not enough')

  thenSpy.reset()
  const anotherDelay50 = delayedFactory(50)
  await retryPromise({ max: 6, backoff: 10 }, function() {
    return anotherDelay50()
  })
  .then(r => {
    thenSpy(r)
  })
  t.true(thenSpy.withArgs(EXPECTED_RESOLVE).calledOnce, 'should got EXPECTED_RESOLVE when wait enough')
})

declare const WechatyBro

test('WechatyBro.ding()', async t => {
  const profile = new Profile(Math.random().toString(36).substr(2, 5))
  const bridge = new Bridge({
    profile,
  })
  t.ok(bridge, 'should instanciated a bridge')

  try {
    await bridge.init()
    t.pass('should init Bridge')

    const retDing = await bridge.evaluate(() => {
      return WechatyBro.ding()
    }) as any as string

    t.is(retDing, 'dong', 'should got dong after execute WechatyBro.ding()')

    const retCode = await bridge.proxyWechaty('loginState')
    t.is(typeof retCode, 'boolean', 'should got a boolean after call proxyWechaty(loginState)')

    await bridge.quit()
    t.pass('b.quit()')
  } catch (err) {
    t.fail('exception: ' + err.message)
  } finally {
    profile.destroy()
  }
})
