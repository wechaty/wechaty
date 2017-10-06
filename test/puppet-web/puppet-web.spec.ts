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
const sinonTest   = require('sinon-test')(sinon)

import {
  config,
  Contact,
  Profile,
}                 from '../../'

import PuppetWeb  from '../../src/puppet-web'
import Bridge     from '../../src/puppet-web/bridge'

test('login/logout events', sinonTest(async t => {
  sinon.stub(Bridge.prototype, 'init').resolves()
  sinon.stub(PuppetWeb.prototype,       'quit').resolves()

  sinon.stub(Contact, 'findAll')
        .onFirstCall().resolves([])
        .onSecondCall().resolves([1])
        .onThirdCall().resolves([1, 2])
        .resolves([1, 2, 3])

  sinon.stub(Bridge.prototype, 'getUserName').resolves('mockedUserName')
  sinon.stub(PuppetWeb.prototype,       'getContact').resolves('dummy')

  try {
    const profile = new Profile()
    const pw = new PuppetWeb({ profile })
    t.truthy(pw, 'should instantiated a PuppetWeb')

    config.puppetInstance(pw)

    await pw.init()
    t.pass('should be inited')
    t.is(pw.logined() , false  , 'should be not logined')

    // XXX find a better way to mock...

    const loginPromise = new Promise((res, rej) => pw.once('login', _ => res('loginFired')))
    pw.bridge.emit('login')
    t.is(await loginPromise, 'loginFired', 'should fired login event')
    t.is(pw.logined(), true  , 'should be logined')

    t.truthy((pw.bridge.getUserName as any).called, 'bridge.getUserName should be called')
    t.truthy((pw.getContact as any).called,         'pw.getContact should be called')

    t.truthy((Contact.findAll as any).called,      'contactFind stub should be called')
    t.is((Contact.findAll as any).callCount, 5,    'should call stubContactFind 5 times')

    const logoutPromise = new Promise((res, rej) => pw.once('logout', _ => res('logoutFired')))
    pw.bridge.emit('logout')
    t.is(await logoutPromise, 'logoutFired', 'should fire logout event')
    t.is(pw.logined(), false, 'should be logouted')

    await pw.quit()
    profile.destroy()
  } catch (e) {
    t.fail(e)
  }
}))
