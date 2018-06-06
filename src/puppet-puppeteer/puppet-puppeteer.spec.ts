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
import test  from 'blue-tape'
import sinon from 'sinon'
const sinonTest   = require('sinon-test')(sinon, {
  useFakeTimers: {  // https://github.com/sinonjs/lolex
    shouldAdvanceTime : true,
    advanceTimeDelta  : 10,
  },
})

// import { log }    from '../../src/config'
// log.level('silly')

import { MemoryCard }      from 'memory-card'

import { Wechaty }      from '../wechaty'

import { PuppetPuppeteer }  from './puppet-puppeteer'
import { Bridge }           from './bridge'
import { Event }            from './event'

class WechatyTest extends Wechaty {
  public initPuppetAccessory(puppet: PuppetPuppeteer) {
    super.initPuppetAccessory(puppet)
  }
  public initPuppetEventBridge(puppet: PuppetPuppeteer) {
    super.initPuppetEventBridge(puppet)
  }
}

class PuppetTest extends PuppetPuppeteer {
  public contactRawPayload(id: string) {
    return super.contactRawPayload(id)
  }
  public roomRawPayload(id: string) {
    return super.roomRawPayload(id)
  }
  public messageRawPayload(id: string) {
    return super.messageRawPayload(id)
  }
}

// test('Puppet smoke testing', async t => {
//   const puppet  = new PuppetTest({ memory: new MemoryCard() })
//   const wechaty = new WechatyTest({ puppet })
//   wechaty.initPuppetAccessory(puppet)

//   t.ok(puppet.state.off(), 'should be OFF state after instanciate')
//   puppet.state.on('pending')
//   t.ok(puppet.state.on(), 'should be ON state after set')
//   t.ok(puppet.state.pending(), 'should be pending state after set')
// })

test('login/logout events', sinonTest(async function (t: test.Test) {
  const sandbox = sinon.createSandbox()
  try {
    const puppet  = new PuppetTest({ memory: new MemoryCard() })
    const wechaty = new WechatyTest({ puppet })

    wechaty.initPuppetAccessory(puppet)
    wechaty.initPuppetEventBridge(puppet)

    sandbox.stub(Event, 'onScan') // block the scan event to prevent reset logined user

    sandbox.stub(Bridge.prototype, 'getUserName').resolves('mockedUserName')
    sandbox.stub(Bridge.prototype, 'contactList')
      .onFirstCall().resolves([])
      .onSecondCall().resolves([1])
      .resolves([1, 2])

    sandbox.stub(puppet, 'contactRawPayload').resolves({
      NickName: 'mockedNickName',
      UserName: 'mockedUserName',
    })
    // sandbox.stub(puppet, 'waitStable').resolves()

    await puppet.start()
    t.pass('should be inited')
    t.is(puppet.logonoff() , false  , 'should be not logined')

    const future = new Promise(r => wechaty.once('login', r))
              .catch(e => t.fail(e))
    puppet.bridge.emit('login', 'TestPuppetPuppeteer')
    await future

    t.is(puppet.logonoff(), true, 'should be logined')

    t.ok((puppet.bridge.getUserName as any).called, 'bridge.getUserName should be called')
    t.ok((puppet.contactRawPayload as any).called,  'puppet.contactRawPayload should be called')

    t.ok((Bridge.prototype.contactList as any).called,       'contactList stub should be called')
    t.is((Bridge.prototype.contactList as any).callCount, 4, 'should call stubContacList 4 times')

    const logoutPromise = new Promise(resolve => puppet.once('logout', _ => resolve('logoutFired')))
    puppet.bridge.emit('logout')
    t.is(await logoutPromise, 'logoutFired', 'should fire logout event')
    t.is(puppet.logonoff(), false, 'should be logouted')

    await puppet.stop()
  } catch (e) {
    t.fail(e)
  } finally {
    sandbox.restore()
  }
}))
