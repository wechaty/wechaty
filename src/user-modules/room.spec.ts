#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
import {
  test,
  sinon,
}             from 'tstest'

import type * as PUPPET from 'wechaty-puppet'
import { PuppetMock }   from 'wechaty-puppet-mock'

import { WechatyBuilder } from '../wechaty-builder.js'
import type {
  RoomImpl,
  RoomProtectedProperty,
}                         from './room.js'

test('findAll()', async t => {
  const EXPECTED_ROOM_ID      = 'test-id'
  const EXPECTED_ROOM_TOPIC   = 'test-topic'
  const EXPECTED_ROOM_ID_LIST = [EXPECTED_ROOM_ID]

  const sandbox = sinon.createSandbox()

  const puppet = new PuppetMock()
  const wechaty = WechatyBuilder.build({ puppet })

  await wechaty.start()

  sandbox.stub(puppet, 'roomSearch').resolves(EXPECTED_ROOM_ID_LIST)
  sandbox.stub(puppet, 'roomPayload').callsFake(async () => {
    await new Promise(resolve => setImmediate(resolve))
    return {
      topic: EXPECTED_ROOM_TOPIC,
    } as PUPPET.payloads.Room
  })

  const roomList = await wechaty.Room.findAll()
  t.equal(roomList.length, 1, 'should find 1 room')
  t.equal(await roomList[0]!.topic(), EXPECTED_ROOM_TOPIC, 'should get topic from payload')

  await wechaty.stop()
})

test('room.say() smoke testing', async () => {

  const sandbox = sinon.createSandbox()
  const callback = sinon.spy()

  const puppet = new PuppetMock()
  const wechaty = WechatyBuilder.build({ puppet })

  const bot = puppet.mocker.createContact()
  puppet.mocker.login(bot)

  await wechaty.start()

  const EXPECTED_ROOM_ID         = 'roomId'
  const EXPECTED_ROOM_TOPIC      = 'test-topic'
  const EXPECTED_CONTACT_1_ID    = 'contact1'
  const EXPECTED_CONTACT_1_ALIAS = 'little1'
  const EXPECTED_CONTACT_2_ID    = 'contact2'
  const EXPECTED_CONTACT_2_ALIAS = 'big2'
  const CONTACT_MAP: { [contactId: string]: string } = {}
  CONTACT_MAP[EXPECTED_CONTACT_1_ID] = EXPECTED_CONTACT_1_ALIAS
  CONTACT_MAP[EXPECTED_CONTACT_2_ID] = EXPECTED_CONTACT_2_ALIAS

  sandbox.stub(puppet, 'roomMemberPayload').callsFake(async (_, contactId) => {
    await new Promise(resolve => setImmediate(resolve))
    return {
      id: contactId,
      roomAlias: CONTACT_MAP[contactId],
    } as PUPPET.payloads.RoomMember
  })
  sandbox.stub(puppet, 'roomPayload').callsFake(async () => {
    await new Promise(resolve => setImmediate(resolve))
    return {
      topic: EXPECTED_ROOM_TOPIC,
    } as PUPPET.payloads.Room
  })
  sandbox.stub(puppet, 'contactPayload').callsFake(async (contactId) => {
    await new Promise(resolve => setImmediate(resolve))
    return {
      id: contactId,
    } as PUPPET.payloads.Contact
  })
  // sandbox.spy(puppet, 'messageSendText')
  sandbox.stub(puppet, 'messageSendText').callsFake(callback)

  const fakeIdSearcher = async (...args: any[]) => {
    await new Promise(setImmediate)
    return [args[0].id]
  }
  sandbox.stub(puppet, 'contactSearch').callsFake(fakeIdSearcher)
  sandbox.stub(puppet, 'roomSearch').callsFake(fakeIdSearcher)

  const room = await wechaty.Room.find({ id: EXPECTED_ROOM_ID })
  const contact1 = await wechaty.Contact.find({ id: EXPECTED_CONTACT_1_ID })
  const contact2 = await wechaty.Contact.find({ id: EXPECTED_CONTACT_2_ID })

  if (!room || !contact1 || !contact2) {
    throw new Error('find by id: not found')
  }
  // await contact1.sync()
  // await contact2.sync()
  // await room.sync()

  test('say with Tagged Template', async t => {
    callback.resetHistory()
    await room.say`To be ${contact1} or not to be ${contact2}`

    t.same(callback.getCall(0).args, [
      // { contactId: EXPECTED_CONTACT_1_ID, roomId: EXPECTED_ROOM_ID },
      EXPECTED_ROOM_ID,
      'To be @little1 or not to be @big2',
      [EXPECTED_CONTACT_1_ID, EXPECTED_CONTACT_2_ID],
    ], 'Tagged Template say should be matched')
  })

  test('say with regular mention contact', async t => {
    callback.resetHistory()
    await room.say('Yo', contact1)

    t.same(callback.getCall(0).args, [
      // { contactId: EXPECTED_CONTACT_1_ID, roomId: EXPECTED_ROOM_ID },
      EXPECTED_ROOM_ID,
      '@little1 Yo',
      [EXPECTED_CONTACT_1_ID],
    ], 'Single mention should work with old ways')
  })

  test('say with multiple mention contact', async t => {
    callback.resetHistory()
    await room.say('hey buddies, let\'s party', contact1, contact2)

    t.same(callback.getCall(0).args, [
      // { contactId: EXPECTED_CONTACT_1_ID, roomId: EXPECTED_ROOM_ID },
      EXPECTED_ROOM_ID,
      '@little1 @big2 hey buddies, let\'s party',
      [EXPECTED_CONTACT_1_ID, EXPECTED_CONTACT_2_ID],
    ], 'Multiple mention should work with new way')
  })

  await wechaty.stop()
})

test('ProtectedProperties', async t => {
  type NotExistInWechaty = Exclude<RoomProtectedProperty, keyof RoomImpl>
  type NotExistTest = NotExistInWechaty extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Wechaty properties for every protected property')
})
