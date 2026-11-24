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
  const endpoint = `127.0.0.1:${port}`

  const mocker = new mockModule.Mocker()
  const cleanup: Array<() => Promise<void>> = []

  try {
    const puppet = new PuppetMock({ mocker })
    cleanup.unshift(() => puppet.stop())
    const puppetServer = new PuppetServer({
      endpoint,
      puppet,
      token,
    } as PuppetServerOptions)
    cleanup.unshift(() => puppetServer.stop())
    const puppetService = new PuppetService({
      endpoint,
      token,
    } as PuppetOptions)
    cleanup.unshift(() => puppetService.stop())

    await puppetServer.start()
    await puppetService.start()

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

      // Test contactSelfName with spy verification of payload delivery
      const spySelfName = mock.method(puppet, 'contactSelfName')
      await assert.doesNotReject(
        async () => puppetService.contactSelfName('UpdatedName'),
        'contactSelfName should succeed',
      )
      assert.equal(spySelfName.mock.callCount(), 1, 'puppet.contactSelfName should be called once')
      assert.deepEqual(spySelfName.mock.calls[0]?.arguments, ['UpdatedName'], 'puppet.contactSelfName should receive updated name')

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

      // Test roomTopic get and set with spy verification
      const currentTopic = await puppetService.roomTopic(room.id)
      assert.equal(currentTopic, 'mock room topic', 'roomTopic should return mock room topic from puppet')

      const spyTopic = mock.method(puppet, 'roomTopic')
      await puppetService.roomTopic(room.id, 'Updated Topic')
      assert.equal(spyTopic.mock.callCount(), 1, 'puppet.roomTopic setter should have been called once')
      assert.deepEqual(spyTopic.mock.calls[0]?.arguments, [room.id, 'Updated Topic'], 'puppet.roomTopic should receive room id and new topic')
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
      assert.equal(spyRecall.mock.callCount(), 1, 'puppet.messageRecall should have been called once')
      assert.deepEqual(spyRecall.mock.calls[0]?.arguments, [messageId], 'puppet.messageRecall should receive message id')

      // Test messageSendLocation spy
      const spyLocation = mock.method(puppet, 'messageSendLocation', async () => 'msg-loc-id')
      const locId = await puppetService.messageSendLocation(user.id, {
        accuracy: 15,
        address: 'Test Address',
        latitude: 30.5,
        longitude: 120.5,
        name: 'Test Place',
      })
      assert.equal(locId, 'msg-loc-id', 'messageSendLocation should return message id')
      assert.equal(spyLocation.mock.callCount(), 1, 'puppet.messageSendLocation should be called once')
      assert.deepEqual(spyLocation.mock.calls[0]?.arguments, [
        user.id,
        {
          accuracy: 15,
          address: 'Test Address',
          latitude: 30.5,
          longitude: 120.5,
          name: 'Test Place',
        },
      ], 'puppet.messageSendLocation should receive clean location payload without $typeName')

      // Test messageSendMiniProgram spy
      const spyMini = mock.method(puppet, 'messageSendMiniProgram', async () => 'msg-mini-id')
      const miniId = await puppetService.messageSendMiniProgram(user.id, {
        appid: 'wx123',
        pagePath: 'pages/index',
        title: 'Mini App',
      })
      assert.equal(miniId, 'msg-mini-id', 'messageSendMiniProgram should return message id')
      assert.equal(spyMini.mock.callCount(), 1, 'puppet.messageSendMiniProgram should be called once')
      assert.deepEqual(spyMini.mock.calls[0]?.arguments, [
        user.id,
        {
          appid: 'wx123',
          pagePath: 'pages/index',
          title: 'Mini App',
        },
      ], 'puppet.messageSendMiniProgram should receive clean miniprogram payload')

      // Test messageSendUrl spy
      const spyUrl = mock.method(puppet, 'messageSendUrl', async () => 'msg-url-id')
      const urlId = await puppetService.messageSendUrl(user.id, {
        description: 'Bot framework',
        title: 'Wechaty',
        url: 'https://wechaty.js.org',
      })
      assert.equal(urlId, 'msg-url-id', 'messageSendUrl should return message id')
      assert.equal(spyUrl.mock.callCount(), 1, 'puppet.messageSendUrl should be called once')
      assert.deepEqual(spyUrl.mock.calls[0]?.arguments, [
        user.id,
        {
          description: 'Bot framework',
          title: 'Wechaty',
          url: 'https://wechaty.js.org',
        },
      ], 'puppet.messageSendUrl should receive clean urlLink payload without $typeName')
    })

    await t.test('Friendship domain: payload, accept, and add', async () => {
      const spyAdd = mock.method(puppet, 'friendshipAdd')
      const spyAccept = mock.method(puppet, 'friendshipAccept')

      await assert.doesNotReject(
        async () => puppetService.friendshipAdd(peer.id, 'Let us connect'),
        'friendshipAdd should succeed over gRPC',
      )
      assert.equal(spyAdd.mock.callCount(), 1, 'puppet.friendshipAdd should have been invoked once')
      assert.deepEqual(spyAdd.mock.calls[0]?.arguments, [peer.id, { hello: 'Let us connect' }], 'puppet.friendshipAdd arguments should match')

      await assert.doesNotReject(
        async () => puppetService.friendshipAdd(peer.id, {
          contactId: user.id,
          hello: 'From mutual friend',
          roomId: 'test-room-id',
        }),
        'friendshipAdd with options object should succeed over gRPC',
      )
      assert.equal(spyAdd.mock.callCount(), 2, 'puppet.friendshipAdd should have been invoked twice')
      assert.deepEqual(
        spyAdd.mock.calls[1]?.arguments,
        [peer.id, { contactId: user.id, hello: 'From mutual friend', roomId: 'test-room-id' }],
        'puppet.friendshipAdd object options should match without proto internal fields',
      )

      await assert.doesNotReject(
        async () => puppetService.friendshipAccept('test-friendship-id'),
        'friendshipAccept should succeed over gRPC',
      )
      assert.equal(spyAccept.mock.callCount(), 1, 'puppet.friendshipAccept should have been invoked once')
      assert.deepEqual(spyAccept.mock.calls[0]?.arguments, ['test-friendship-id'], 'puppet.friendshipAccept argument should match')

      const friendshipPayload = await puppetService.friendshipPayload('test-friendship-id')
      assert.equal(friendshipPayload.id, 'test-friendship-id', 'friendshipPayload should return friendship with matching id')
    })
  } finally {
    mock.restoreAll()
    for (const stop of cleanup) {
      await stop().catch(() => {})
    }
  }
})
