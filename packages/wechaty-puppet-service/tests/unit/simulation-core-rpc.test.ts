/**
 * End-to-end unary RPC characterization tests between `PuppetService` client
 * and `PuppetServer` backing `PuppetMock`. Validates the Message, Contact, Room,
 * and Friendship domain methods as part of the Phase 4.1 Safety Net Test Suite (#3123).
 */
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import type { PuppetOptions } from 'wechaty-puppet'
import { PuppetMock, mock as mockModule } from 'wechaty-puppet-mock'

import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'

import {
  PuppetService,
  PuppetServer,
  type PuppetServerOptions,
} from '../../src/mod.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

test('Core RPC simulation between PuppetService and PuppetServer', async t => {
  useTempHome(t)
  const port = await freePort()
  const token = `insecure_${NIL_UUID_V4}`
  const endpoint = `0.0.0.0:${port}`

  const mocker = new mockModule.Mocker()
  const puppet = new PuppetMock({ mocker })

  const puppetServer = new PuppetServer({
    endpoint,
    puppet,
    token,
  } as PuppetServerOptions)
  await puppetServer.start()

  const puppetService = new PuppetService({
    endpoint,
    token,
  } as PuppetOptions)
  await puppetService.start()

  try {
    // Set up mock contacts and login user
    const user = mocker.createContact({ name: 'PrimaryUser' })
    const peer = mocker.createContact({ name: 'PeerUser' })
    mocker.login(user)

  await t.test('Contact domain: list, payload, self name, and self QR code', async () => {
    const contactIds = await puppetService.contactList()
    assert.ok(contactIds.includes(user.id), 'contactList should contain primary user id')
    assert.ok(contactIds.includes(peer.id), 'contactList should contain peer user id')

    const userPayload = await puppetService.contactPayload(user.id)
    assert.equal(userPayload.id, user.id, 'user payload id should match')
    assert.equal(userPayload.name, 'PrimaryUser', 'user payload name should match')

    const peerPayload = await puppetService.contactPayload(peer.id)
    assert.equal(peerPayload.id, peer.id, 'peer payload id should match')
    assert.equal(peerPayload.name, 'PeerUser', 'peer payload name should match')

    // Test contactSelfName
    await assert.doesNotReject(
      async () => puppetService.contactSelfName('UpdatedName'),
      'contactSelfName should succeed',
    )

    // Test contactSelfQRCode
    const qrCode = await puppetService.contactSelfQRCode()
    assert.ok(typeof qrCode === 'string', 'contactSelfQRCode should return a string')
  })

  await t.test('Room domain: create, list, payload, members, and topic', async () => {
    const room = mocker.createRoom({
      memberIdList: [user.id, peer.id],
      topic: 'Safety Net Room',
    })

    const roomIds = await puppetService.roomList()
    assert.ok(roomIds.includes(room.id), 'roomList should contain created room id')

    const roomPayload = await puppetService.roomPayload(room.id)
    assert.equal(roomPayload.id, room.id, 'room payload id should match')
    assert.equal(roomPayload.topic, 'Safety Net Room', 'room payload topic should match')

    const memberIds = await puppetService.roomMemberList(room.id)
    assert.ok(memberIds.includes(user.id), 'roomMemberList should include user id')
    assert.ok(memberIds.includes(peer.id), 'roomMemberList should include peer id')

    const memberPayload = await puppetService.roomMemberPayload(room.id, user.id)
    assert.equal(memberPayload.id, user.id, 'room member payload id should match user id')

    // Test roomTopic get and set
    const currentTopic = await puppetService.roomTopic(room.id)
    assert.equal(currentTopic, 'mock room topic', 'roomTopic should return mock room topic from puppet')

    const spyTopic = mock.method(puppet, 'roomTopic')
    await puppetService.roomTopic(room.id, 'Updated Topic')
    assert.ok(spyTopic.mock.callCount() > 0, 'puppet.roomTopic setter should have been called')
  })

  await t.test('Message domain: send text, payload, and recall', async () => {
    // Send text message from peer to user via mocker
    const msgPromise = new Promise<string>(resolve => {
      puppet.once('message', ({ messageId }) => resolve(messageId))
      peer.say('RPC message test').to(user)
    })
    const messageId = await msgPromise
    assert.ok(messageId, 'messageId should be emitted')

    // Verify messagePayload over puppetService
    const payload = await puppetService.messagePayload(messageId)
    assert.equal(payload.id, messageId, 'message payload id should match')
    assert.equal(payload.talkerId, peer.id, 'message talkerId should match peer')
    assert.equal(payload.text, 'RPC message test', 'message text should match')

    // Test messageRecall spy
    const spyRecall = mock.method(puppet, 'messageRecall', async () => true)
    const recalled = await puppetService.messageRecall(messageId)
    assert.equal(recalled, true, 'messageRecall should return true')
    assert.ok(spyRecall.mock.callCount() > 0, 'puppet.messageRecall should have been called')
  })

  await t.test('Friendship domain: payload, accept, and add', async () => {
    const spyAdd = mock.method(puppet, 'friendshipAdd')
    const spyAccept = mock.method(puppet, 'friendshipAccept')

    await assert.doesNotReject(
      async () => puppetService.friendshipAdd(peer.id, 'Let us connect'),
      'friendshipAdd should succeed over gRPC',
    )
    assert.ok(spyAdd.mock.callCount() > 0, 'puppet.friendshipAdd should have been invoked')

    await assert.doesNotReject(
      async () => puppetService.friendshipAccept('test-friendship-id'),
      'friendshipAccept should succeed over gRPC',
    )
    assert.ok(spyAccept.mock.callCount() > 0, 'puppet.friendshipAccept should have been invoked')

      const friendshipPayload = await puppetService.friendshipPayload('test-friendship-id')
      assert.equal(friendshipPayload.id, 'test-friendship-id', 'friendshipPayload should return friendship with matching id')
    })
  } finally {
    await puppetService.stop()
    await puppetServer.stop()
    await puppet.stop()
  }
})
