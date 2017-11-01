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
const sinonTest   = require('sinon-test')(sinon, {
  useFakeTimers: {  // https://github.com/sinonjs/lolex
    shouldAdvanceTime : true,
    advanceTimeDelta  : 10,
  },
})

// import { log }    from '../../src/config'
// log.level('silly')

import {
  config,
  Contact,
  Profile,
}                 from '../../'

import PuppetWeb  from '../../src/puppet-web/puppet-web'
import Bridge     from '../../src/puppet-web/bridge'
import Event      from '../../src/puppet-web/event'

test('login/logout events', sinonTest(async function (t: test.Test) {

  sinon.stub(Contact, 'findAll')
        .onFirstCall().resolves([])
        .onSecondCall().resolves([1])
        .resolves([1, 2])

  sinon.stub(Event, 'onScan') // block the scan event to prevent reset logined user

  sinon.stub(Bridge.prototype,    'getUserName').resolves('mockedUserName')
  sinon.stub(PuppetWeb.prototype, 'getContact') .resolves({
    NickName: 'mockedNickName',
    UserName: 'mockedUserName',
  })

  try {
    const profile = new Profile()
    const pw      = new PuppetWeb({ profile })
    t.ok(pw, 'should instantiated a PuppetWeb')

    config.puppetInstance(pw)

    await pw.init()
    t.pass('should be inited')
    t.is(pw.logonoff() , false  , 'should be not logined')

    const EXPECTED_CHIPER = 'loginFired'
    const loginPromise = new Promise(r => pw.once('login', _ => r(EXPECTED_CHIPER)))
    pw.bridge.emit('login', 'TestPuppetWeb')
    t.is(await loginPromise, EXPECTED_CHIPER, 'should fired login event')
    t.is(pw.logonoff(), true  , 'should be logined')

    t.ok((pw.bridge.getUserName as any).called, 'bridge.getUserName should be called')
    t.ok((pw.getContact as any).called,         'pw.getContact should be called')

    t.ok((Contact.findAll as any).called,       'contactFind stub should be called')
    t.is((Contact.findAll as any).callCount, 4, 'should call stubContactFind 4 times')

    const logoutPromise = new Promise((res, rej) => pw.once('logout', _ => res('logoutFired')))
    pw.bridge.emit('logout')
    t.is(await logoutPromise, 'logoutFired', 'should fire logout event')
    t.is(pw.logonoff(), false, 'should be logouted')

    await pw.quit()
    profile.destroy()
  } catch (e) {
    t.fail(e)
  } finally {
    t.end()
  }
}))
