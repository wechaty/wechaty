#!/usr/bin/env -S node --import=tsx/esm
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

import { test } from 'node:test'
import assert from 'node:assert/strict'

import * as PUPPET        from 'wechaty-puppet'
import { PuppetMock }     from 'wechaty-puppet-mock'
import { WechatyBuilder } from '../wechaty-builder.js'
import type {
  MessageImpl,
  MessageProtectedProperty,
}                           from './message.js'

test('recalled()', async t => {

  const EXPECTED_RECALL_MESSAGE_ID = 'message-id-1'
  const EXPECTED_RECALLED_MESSAGE_ID = 'message-id-2'
  const EXPECTED_MESSAGE_TIMESTAMP = new Date().getTime()
  const EXPECTED_ROOM_TOPIC = 'topic'
  const EXPECTED_ROOM_ID = 'room-id'
  const EXPECTED_TALKER_CONTACT_ID = 'talker-contact-id'
  const EXPECTED_LISTENER_CONTACT_ID = 'listener-contact-id'

  const puppet = new PuppetMock()
  const wechaty = WechatyBuilder.build({ puppet })

  let started = false
  t.after(async () => {
    if (started) {
      await wechaty.stop()
    }
  })

  started = true
  await wechaty.start()

  t.mock.method(puppet, 'messagePayload', async (id: string) => {
    await new Promise(resolve => setImmediate(resolve))
    if (id === EXPECTED_RECALL_MESSAGE_ID) {
      return {
        id: EXPECTED_RECALL_MESSAGE_ID,
        talkerId: EXPECTED_TALKER_CONTACT_ID,
        text: EXPECTED_RECALLED_MESSAGE_ID,
        timestamp: EXPECTED_MESSAGE_TIMESTAMP,
        type: PUPPET.types.Message.Recalled,
      } as PUPPET.payloads.Message
    } else {
      return {
        id: EXPECTED_RECALLED_MESSAGE_ID,
        listenerId: EXPECTED_LISTENER_CONTACT_ID,
        roomId: EXPECTED_ROOM_ID,
        talkerId: EXPECTED_TALKER_CONTACT_ID,
        text: '',
        timestamp: EXPECTED_MESSAGE_TIMESTAMP,
        type: PUPPET.types.Message.Text,
      } as PUPPET.payloads.Message
    }
  })
  t.mock.method(puppet, 'roomPayload', async () => {
    await new Promise(resolve => setImmediate(resolve))
    return {
      topic: EXPECTED_ROOM_TOPIC,
    } as PUPPET.payloads.Room
  })

  t.mock.method(puppet, 'roomMemberList', async () => {
    await new Promise((resolve) => setImmediate(resolve))
    return [ EXPECTED_TALKER_CONTACT_ID, EXPECTED_LISTENER_CONTACT_ID ]
  })

  t.mock.method(puppet, 'contactPayload', async (id: string) => {
    await new Promise(setImmediate)
    return {
      id,
      name: id,
    } as PUPPET.payloads.Contact
  })

  const fakeIdSearcher = async (...args: any[]) => {
    await new Promise(setImmediate)
    return [ args[0].id ]
  }

  t.mock.method(puppet, 'messageSearch', fakeIdSearcher)
  t.mock.method(puppet, 'contactSearch', fakeIdSearcher)

  await puppet.login(EXPECTED_LISTENER_CONTACT_ID)

  const message = await wechaty.Message.find({ id: EXPECTED_RECALL_MESSAGE_ID })
  if (!message) {
    throw new Error('no message for id: ' + EXPECTED_RECALL_MESSAGE_ID)
  }
  const recalledMessage = await message.toRecalled()
  assert.ok(recalledMessage, 'recalled message should exist.')
  assert.equal(recalledMessage!.id, EXPECTED_RECALLED_MESSAGE_ID, 'Recalled message should have the right id.')
  assert.equal(recalledMessage!.talker().id, EXPECTED_TALKER_CONTACT_ID, 'Recalled message should have the right from contact id.')
  assert.equal(recalledMessage!.listener()!.id, EXPECTED_LISTENER_CONTACT_ID, 'Recalled message should have the right to contact id.')
  assert.equal(recalledMessage!.room()!.id, EXPECTED_ROOM_ID, 'Recalled message should have the right room id.')

  await wechaty.stop()
  started = false
})

test('ProtectedProperties', async _t => {
  type NotExistInWechaty = Exclude<MessageProtectedProperty, keyof MessageImpl>
  type NotExistTest = NotExistInWechaty extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Wechaty properties for every protected property')
})
