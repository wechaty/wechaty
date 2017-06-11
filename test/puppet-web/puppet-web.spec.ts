/**
 *   Chatie - https://github.com/chatie
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
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
import { test } from 'ava'

import {
  Config,
  log,
}                 from '../../src/config'
import PuppetWeb  from '../../src/puppet-web'
import PuppetWebServer     from '../../src/puppet-web/server'

/**
 * the reason why use `test.serial` here is:
 *  static variable `Contact.puppet` will be changed
 *  when `PuppteWeb.init()` and `PuppteWeb.quit()`
 */
test.serial('login/logout events', async t => {
  const pw = new PuppetWeb()
  t.truthy(pw, 'should instantiated a PuppetWeb')

  Config.puppetInstance(pw)

  await pw.init()
  t.pass('should be inited')
  t.is(pw.logined() , false  , 'should be not logined')

  // XXX find a better way to mock...
  pw.bridge.getUserName = function() { return Promise.resolve('mockedUserName') }
  pw.getContact = function() { return Promise.resolve('dummy') }

  const loginPromise = new Promise((res, rej) => pw.once('login', _ => res('loginFired')))
  pw.server.emit('login')
  t.is(await loginPromise, 'loginFired', 'should fired login event')
  t.is(pw.logined(), true  , 'should be logined')

  const logoutPromise = new Promise((res, rej) => pw.once('logout', _ => res('logoutFired')))
  pw.server.emit('logout')
  t.is(await logoutPromise, 'logoutFired', 'should fire logout event')
  t.is(pw.logined(), false, 'should be logouted')

  await pw.quit()
})

test.serial('server/browser socketio ding', async t => {
  const puppet = new PuppetWeb()
  t.truthy(puppet, 'should instantiated a PuppetWeb')

  Config.puppetInstance(puppet)

  const EXPECTED_DING_DATA = 'dingdong'

  try {
    await puppet.init()
    t.pass('should be inited')

    const ret = await dingSocket(puppet.server)
    t.is(ret, EXPECTED_DING_DATA, 'should got EXPECTED_DING_DATA after resolved dingSocket()')
  } catch (e) {
    t.fail(e && e.message || e || 'unknown exception???')
  }

  try {
    await puppet.quit()
  } catch (err) {
    t.fail(err.message)
  }

  return

  /////////////////////////////////////////////////////////////////////////////

  function dingSocket(server: PuppetWebServer) {
    const maxTime   = 60000 // 60s
    const waitTime  = 3000
    let   totalTime = 0
    return new Promise((resolve, reject) => {
      log.verbose('TestPuppetWeb', 'dingSocket()')

      const timeoutTimer = setTimeout(_ => {
        reject('dingSocket() no response timeout after ' + 2 * maxTime)
      }, 2 * maxTime)
      timeoutTimer.unref()

      testDing()
      return

      function testDing(): void {
        log.silly('TestPuppetWeb', 'dingSocket() server.socketServer: %s', server.socketServer)
        if (!server.socketClient) {
          totalTime += waitTime
          if (totalTime > maxTime) {
            return reject('testDing() timeout after ' + totalTime + 'ms')
          }

          log.silly('TestPuppetWeb', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
          setTimeout(testDing, waitTime)
          return
        }
        log.silly('TestPuppetWeb', 'dingSocket() server.socketClient: %s', server.socketClient)
        server.socketClient.once('dong', data => {
          log.verbose('TestPuppetWeb', 'socket recv event dong: ' + data)

          clearTimeout(timeoutTimer)
          return resolve(data)

        })
        server.socketClient.emit('ding', EXPECTED_DING_DATA)
      }
    })
  }
})
