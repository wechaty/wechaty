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
// tslint:disable:max-classes-per-file

import test  from 'blue-tape'
import sinon from 'sinon'

import { PuppetMock } from 'wechaty-puppet-mock'

import { Wechaty }    from '../wechaty'

test('findAll()', async t => {
  const EXPECTED_ROOM_ID      = 'test-id'
  const EXPECTED_ROOM_TOPIC   = 'test-topic'
  const EXPECTED_ROOM_ID_LIST = [EXPECTED_ROOM_ID]

  const sandbox = sinon.createSandbox()

  const puppet = new PuppetMock()
  const wechaty = new Wechaty({ puppet })

  await wechaty.start()

  sandbox.stub(puppet, 'roomSearch').resolves(EXPECTED_ROOM_ID_LIST)
  sandbox.stub(puppet, 'roomPayload').callsFake(async () => {
    await new Promise(r => setImmediate(r))
    return {
      topic: EXPECTED_ROOM_TOPIC,
    } as any
  })

  const roomList = await wechaty.Room.findAll()
  t.equal(roomList.length, 1, 'should find 1 room')
  t.equal(await roomList[0].topic(), EXPECTED_ROOM_TOPIC, 'should get topic from payload')

  await wechaty.stop()
})
