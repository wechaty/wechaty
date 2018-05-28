#!/usr/bin/env ts-node
/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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

import { Profile }      from '../profile'
import { Wechaty }      from '../wechaty'

import { PuppetPuppeteer }  from './puppet-puppeteer'
import { Bridge }           from './bridge'
import { Event }            from './event'

test('Puppet smoke testing', async t => {
  const profile = new Profile(Math.random().toString(36).substr(2, 5))
  const wechaty = new Wechaty()

  const puppet = new PuppetPuppeteer({
    profile,
    wechaty,
  })
  ;
  (wechaty as any).initPuppetAccessory(puppet)

  t.ok(puppet.state.off(), 'should be OFF state after instanciate')
  puppet.state.on('pending')
  t.ok(puppet.state.on(), 'should be ON state after set')
  t.ok(puppet.state.pending(), 'should be pending state after set')
})

test('login/logout events', sinonTest(async function (t: test.Test) {
  const sandbox = sinon.createSandbox()
  try {
    const profile = new Profile()
    const wechaty = new Wechaty()

    const puppet = new PuppetPuppeteer({
      profile,
      wechaty,
    })
    ;
    (wechaty as any).initPuppetAccessory(puppet)

    t.ok(puppet, 'should instantiated a PuppetPuppeteer')

    sandbox.stub(wechaty.Contact, 'findAll')
      .onFirstCall().resolves([])
      .onSecondCall().resolves([1])
      .resolves([1, 2])

    sandbox.stub(Event, 'onScan') // block the scan event to prevent reset logined user

    sandbox.stub(Bridge.prototype, 'getUserName').resolves('mockedUserName')
    sandbox.stub(puppet, 'contactRawPayload').resolves({
      NickName: 'mockedNickName',
      UserName: 'mockedUserName',
    })

    await puppet.start()
    t.pass('should be inited')
    t.is(puppet.logonoff() , false  , 'should be not logined')

    const EXPECTED_CHIPER = 'loginFired'
    const loginPromise = new Promise(r => puppet.once('login', _ => r(EXPECTED_CHIPER)))
    puppet.bridge.emit('login', 'TestPuppetPuppeteer')
    t.is(await loginPromise, EXPECTED_CHIPER, 'should fired login event')
    t.is(puppet.logonoff(), true, 'should be logined')

    t.ok((puppet.bridge.getUserName as any).called, 'bridge.getUserName should be called')
    t.ok((puppet.contactRawPayload as any).called,  'puppet.contactRawPayload should be called')

    t.ok((wechaty.Contact.findAll as any).called,       'contactFind stub should be called')
    t.is((wechaty.Contact.findAll as any).callCount, 4, 'should call stubContactFind 4 times')

    const logoutPromise = new Promise(resolve => puppet.once('logout', _ => resolve('logoutFired')))
    puppet.bridge.emit('logout')
    t.is(await logoutPromise, 'logoutFired', 'should fire logout event')
    t.is(puppet.logonoff(), false, 'should be logouted')

    await puppet.stop()
    await profile.destroy()
  } catch (e) {
    t.fail(e)
  } finally {
    sandbox.restore()
    // t.end()
  }
}))
