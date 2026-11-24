/**
 * Tests the event streaming pipeline between `PuppetServer` and `PuppetService`
 * across all puppet event types, verifying that events emitted by a backing puppet
 * are faithfully serialized over gRPC and emitted on the client with intact payloads.
 * Part of Phase 4.1 Safety Net Test Suite (#3123).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as PUPPET from 'wechaty-puppet'
import { PuppetMock } from 'wechaty-puppet-mock'

import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'

import {
  PuppetService,
  PuppetServer,
  type PuppetServerOptions,
} from '../../src/mod.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

test('Event streaming simulation from PuppetServer to PuppetService', async t => {
  useTempHome(t)
  const port = await freePort()
  const token = `insecure_${NIL_UUID_V4}`
  const endpoint = `127.0.0.1:${port}`

  let puppet!: PuppetMock
  let puppetServer!: PuppetServer
  let puppetService!: PuppetService

  /**
   * Waits for a specific event to be emitted on `puppetService`.
   *
   * @param eventName - The puppet event name to listen for once.
   * @returns A promise that resolves with the event's payload, or rejects after a 5s timeout.
   */
  function waitForEvent<T> (eventName: PUPPET.types.PuppetEventName): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${String(eventName)}`))
      }, 5000)

      puppetService.once(eventName, (payload: any) => {
        clearTimeout(timer)
        resolve(payload)
      })
    })
  }

  try {
    puppet = new PuppetMock()
    puppetServer = new PuppetServer({
      endpoint,
      puppet,
      token,
    } as PuppetServerOptions)
    puppetService = new PuppetService({
      endpoint,
      token,
    } as PUPPET.PuppetOptions)

    await puppetServer.start()
    await puppetService.start()

    await t.test('streams "scan" event with qrcode and status', async () => {
      const expected = {
        qrcode: 'https://wechaty.js.org/qrcode/test-scan',
        status: PUPPET.types.ScanStatus.Waiting,
      }
      const future = waitForEvent<typeof expected>('scan')
      puppet.emit('scan', expected)
      const received = await future
      assert.equal(received.qrcode, expected.qrcode, 'qrcode should match')
      assert.equal(received.status, expected.status, 'status should match')
    })

    await t.test('streams "login" event with contactId', async () => {
      const expected = { contactId: 'contact-test-user-login' }
      const future = waitForEvent<typeof expected>('login')
      puppet.emit('login', expected)
      const received = await future
      assert.equal(received.contactId, expected.contactId, 'contactId should match')
    })

    await t.test('streams "logout" event with contactId and data', async () => {
      const expected = { contactId: 'contact-test-user-login', data: 'normal logout' }
      const future = waitForEvent<typeof expected>('logout')
      puppet.emit('logout', expected)
      const received = await future
      assert.equal(received.contactId, expected.contactId, 'logged-out contactId should match emitted logout contactId')
      assert.equal(received.data, expected.data, 'logout data should match')
    })

    await t.test('streams "message" event with messageId', async () => {
      const expected = { messageId: 'msg-test-uuid-456' }
      const future = waitForEvent<typeof expected>('message')
      puppet.emit('message', expected)
      const received = await future
      assert.equal(received.messageId, expected.messageId, 'messageId should match')
    })

    await t.test('streams "friendship" event with friendshipId', async () => {
      const expected = { friendshipId: 'fs-test-uuid-789' }
      const future = waitForEvent<typeof expected>('friendship')
      puppet.emit('friendship', expected)
      const received = await future
      assert.equal(received.friendshipId, expected.friendshipId, 'friendshipId should match')
    })

    await t.test('streams "room-join" event with invitee and inviter', async () => {
      const expected = {
        roomId: 'room-test-101',
        inviteeIdList: ['invitee-1', 'invitee-2'],
        inviterId: 'inviter-3',
        timestamp: 1600000000000,
      }
      const future = waitForEvent<typeof expected>('room-join')
      puppet.emit('room-join', expected)
      const received = await future
      assert.equal(received.roomId, expected.roomId, 'roomId should match')
      assert.deepEqual(received.inviteeIdList, expected.inviteeIdList, 'inviteeIdList should match')
      assert.equal(received.inviterId, expected.inviterId, 'inviterId should match')
      assert.equal(received.timestamp, expected.timestamp, 'timestamp should match')
    })

    await t.test('streams "room-leave" event with removee and remover', async () => {
      const expected = {
        roomId: 'room-test-102',
        removeeIdList: ['removee-1'],
        removerId: 'remover-2',
        timestamp: 1600000000000,
      }
      const future = waitForEvent<typeof expected>('room-leave')
      puppet.emit('room-leave', expected)
      const received = await future
      assert.equal(received.roomId, expected.roomId, 'roomId should match')
      assert.deepEqual(received.removeeIdList, expected.removeeIdList, 'removeeIdList should match')
      assert.equal(received.removerId, expected.removerId, 'removerId should match')
    })

    await t.test('streams "room-topic" event with topic changes', async () => {
      const expected = {
        roomId: 'room-test-103',
        newTopic: 'Modern Wechaty 2.0',
        oldTopic: 'Wechaty 1.x',
        changerId: 'changer-contact-id',
        timestamp: 1600000000000,
      }
      const future = waitForEvent<typeof expected>('room-topic')
      puppet.emit('room-topic', expected)
      const received = await future
      assert.equal(received.roomId, expected.roomId, 'roomId should match')
      assert.equal(received.newTopic, expected.newTopic, 'newTopic should match')
      assert.equal(received.oldTopic, expected.oldTopic, 'oldTopic should match')
    })

    await t.test('streams "room-invite" event with roomInvitationId', async () => {
      const expected = { roomInvitationId: 'invitation-test-id-888' }
      const future = waitForEvent<typeof expected>('room-invite')
      puppet.emit('room-invite', expected)
      const received = await future
      assert.equal(received.roomInvitationId, expected.roomInvitationId, 'roomInvitationId should match')
    })

    await t.test('streams "dirty" event with payloadType and payloadId', async () => {
      const expected = {
        payloadId: 'dirty-payload-999',
        payloadType: PUPPET.types.Payload.Contact,
      }
      const future = waitForEvent<typeof expected>('dirty')
      puppet.emit('dirty', expected)
      const received = await future
      assert.equal(received.payloadType, expected.payloadType, 'payloadType should match')
      assert.equal(received.payloadId, expected.payloadId, 'payloadId should match')
    })

    await t.test('streams "heartbeat" event with data', async () => {
      const expected = { data: 'heartbeat-keepalive-check' }
      const future = waitForEvent<typeof expected>('heartbeat')
      puppet.emit('heartbeat', expected)
      const received = await future
      assert.equal(received.data, expected.data, 'data should match')
    })

    await t.test('streams "error" event with error data', async () => {
      const future = waitForEvent<{ gerror: string }>('error')
      puppet.emit('error', 'simulated puppet error')
      const received = await future
      assert.ok(received.gerror && received.gerror.includes('simulated puppet error'), 'error payload should contain error message')
    })
  } finally {
    await puppetService?.stop().catch(() => {})
    await puppetServer?.stop().catch(() => {})
    await puppet?.stop().catch(() => {})
  }
})
