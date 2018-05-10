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

import Profile      from '../profile'
import Wechaty      from '../wechaty'

import {
  Contact,
}                   from '../puppet/'

import PuppetPuppeteer  from './puppet-puppeteer'
import Bridge           from './bridge'
import Event            from './event'

test('Puppet smoke testing', async t => {
  const profile = new Profile(Math.random().toString(36).substr(2, 5))
  const wechaty = new Wechaty()

  const p = new PuppetPuppeteer({
    profile,
    wechaty,
  })

  t.ok(p.state.off(), 'should be OFF state after instanciate')
  p.state.on('pending')
  t.ok(p.state.on(), 'should be ON state after set')
  t.ok(p.state.pending(), 'should be pending state after set')
})

test('login/logout events', sinonTest(async function (t: test.Test) {
  const sandbox = sinon.createSandbox()
  sandbox.stub(Contact, 'findAll')
        .onFirstCall().resolves([])
        .onSecondCall().resolves([1])
        .resolves([1, 2])

  sandbox.stub(Event, 'onScan') // block the scan event to prevent reset logined user

  sandbox.stub(Bridge.prototype,    'getUserName').resolves('mockedUserName')
  sandbox.stub(PuppetPuppeteer.prototype, 'contactPayload').resolves({
    NickName: 'mockedNickName',
    UserName: 'mockedUserName',
  })

  try {
    const profile = new Profile()
    const wechaty = new Wechaty()

    const pw = new PuppetPuppeteer({
      profile,
      wechaty,
    })
    t.ok(pw, 'should instantiated a PuppetPuppeteer')

    // config.puppetInstance(pw)
    Contact.puppet = pw

    await pw.start()
    t.pass('should be inited')
    t.is(pw.logonoff() , false  , 'should be not logined')

    const EXPECTED_CHIPER = 'loginFired'
    const loginPromise = new Promise(r => pw.once('login', _ => r(EXPECTED_CHIPER)))
    pw.bridge.emit('login', 'TestPuppetPuppeteer')
    t.is(await loginPromise, EXPECTED_CHIPER, 'should fired login event')
    t.is(pw.logonoff(), true  , 'should be logined')

    t.ok((pw.bridge.getUserName as any).called, 'bridge.getUserName should be called')
    t.ok((pw.contactPayload as any).called,         'pw.getContact should be called')

    t.ok((Contact.findAll as any).called,       'contactFind stub should be called')
    t.is((Contact.findAll as any).callCount, 4, 'should call stubContactFind 4 times')

    const logoutPromise = new Promise((res, rej) => pw.once('logout', _ => res('logoutFired')))
    pw.bridge.emit('logout')
    t.is(await logoutPromise, 'logoutFired', 'should fire logout event')
    t.is(pw.logonoff(), false, 'should be logouted')

    await pw.stop()
    profile.destroy()
  } catch (e) {
    t.fail(e)
  } finally {
    sandbox.restore()
    t.end()
  }
}))
