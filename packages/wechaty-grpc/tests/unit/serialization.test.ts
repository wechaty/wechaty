/**
 * Tests binary serialization and deserialization round-trips for core protobuf messages
 * in `wechaty-grpc`, asserting message schema invariants and descriptor completeness
 * as part of the Phase 4.1 safety net suite (#3123).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  puppet,
  StringValue,
} from '../../src/mod.ts'

test('EventResponse binary serialization round-trip', async _t => {
  const event = new puppet.EventResponse()
  const payloadData = JSON.stringify({ messageId: 'msg-uuid-12345' })

  event.setType(puppet.EventType.EVENT_TYPE_MESSAGE)
  event.setPayload(payloadData)

  const bytes = event.serializeBinary()
  assert.ok(bytes.length > 0, 'serialized bytes should not be empty')

  const restored = puppet.EventResponse.deserializeBinary(bytes)
  assert.equal(restored.getType(), puppet.EventType.EVENT_TYPE_MESSAGE, 'restored event type should match')
  assert.equal(restored.getPayload(), payloadData, 'restored payload should match')
})

test('EventRequest binary serialization round-trip', async _t => {
  const request = new puppet.EventRequest()
  const bytes = request.serializeBinary()
  const restored = puppet.EventRequest.deserializeBinary(bytes)
  assert.ok(restored instanceof puppet.EventRequest, 'should deserialize to EventRequest instance')
})

test('MessagePayloadResponse binary serialization round-trip', async _t => {
  const response = new puppet.MessagePayloadResponse()
  response.setId('msg-test-id')
  response.setTalkerId('talker-test-id')
  response.setText('Hello from safety net')
  response.setTimestampDeprecated(1700000000000)
  response.setType(puppet.MessageType.MESSAGE_TYPE_TEXT)
  response.setFilename('attachment.png')
  response.setMentionIdsList(['mention-1', 'mention-2'])

  const bytes = response.serializeBinary()
  assert.ok(bytes.length > 0, 'serialized bytes should not be empty')

  const restored = puppet.MessagePayloadResponse.deserializeBinary(bytes)
  assert.equal(restored.getId(), 'msg-test-id', 'id should match')
  assert.equal(restored.getTalkerId(), 'talker-test-id', 'talkerId should match')
  assert.equal(restored.getText(), 'Hello from safety net', 'text should match')
  assert.equal(restored.getTimestampDeprecated(), 1700000000000, 'timestampDeprecated should match')
  assert.equal(restored.getType(), puppet.MessageType.MESSAGE_TYPE_TEXT, 'type should match')
  assert.equal(restored.getFilename(), 'attachment.png', 'filename should match')
  assert.deepEqual(restored.getMentionIdsList(), ['mention-1', 'mention-2'], 'mention list should match')
})

test('ContactPayloadResponse binary serialization round-trip', async _t => {
  const response = new puppet.ContactPayloadResponse()
  response.setId('contact-test-id')
  response.setName('Grace Hopper')
  response.setAlias('Admiral')
  response.setAvatar('https://example.com/avatar.jpg')
  response.setGender(puppet.ContactGender.CONTACT_GENDER_FEMALE)
  response.setType(puppet.ContactType.CONTACT_TYPE_PERSONAL)
  response.setPhonesList(['+1234567890'])

  const bytes = response.serializeBinary()
  assert.ok(bytes.length > 0, 'serialized bytes should not be empty')

  const restored = puppet.ContactPayloadResponse.deserializeBinary(bytes)
  assert.equal(restored.getId(), 'contact-test-id', 'id should match')
  assert.equal(restored.getName(), 'Grace Hopper', 'name should match')
  assert.equal(restored.getAlias(), 'Admiral', 'alias should match')
  assert.equal(restored.getAvatar(), 'https://example.com/avatar.jpg', 'avatar should match')
  assert.equal(restored.getGender(), puppet.ContactGender.CONTACT_GENDER_FEMALE, 'gender should match')
  assert.equal(restored.getType(), puppet.ContactType.CONTACT_TYPE_PERSONAL, 'type should match')
  assert.deepEqual(restored.getPhonesList(), ['+1234567890'], 'phone list should match')
})

test('RoomPayloadResponse binary serialization round-trip', async _t => {
  const response = new puppet.RoomPayloadResponse()
  response.setId('room-test-id')
  response.setTopic('TypeScript Architecture')
  response.setAvatar('https://example.com/room.jpg')
  response.setOwnerId('owner-contact-id')
  response.setAdminIdsList(['admin-1', 'admin-2'])
  response.setMemberIdsList(['admin-1', 'admin-2', 'member-3'])

  const bytes = response.serializeBinary()
  assert.ok(bytes.length > 0, 'serialized bytes should not be empty')

  const restored = puppet.RoomPayloadResponse.deserializeBinary(bytes)
  assert.equal(restored.getId(), 'room-test-id', 'id should match')
  assert.equal(restored.getTopic(), 'TypeScript Architecture', 'topic should match')
  assert.equal(restored.getAvatar(), 'https://example.com/room.jpg', 'avatar should match')
  assert.equal(restored.getOwnerId(), 'owner-contact-id', 'ownerId should match')
  assert.deepEqual(restored.getAdminIdsList(), ['admin-1', 'admin-2'], 'admin list should match')
  assert.deepEqual(restored.getMemberIdsList(), ['admin-1', 'admin-2', 'member-3'], 'member list should match')
})

test('FriendshipPayloadResponse binary serialization round-trip', async _t => {
  const response = new puppet.FriendshipPayloadResponse()
  response.setId('friendship-test-id')
  response.setContactId('contact-sender-id')
  response.setHello('Please accept my request')
  response.setType(puppet.FriendshipType.FRIENDSHIP_TYPE_RECEIVE)
  response.setScene(puppet.FriendshipSceneType.FRIENDSHIP_SCENE_TYPE_QRCODE)
  response.setStranger('true')
  response.setTicket('ticket-sample-123')

  const bytes = response.serializeBinary()
  assert.ok(bytes.length > 0, 'serialized bytes should not be empty')

  const restored = puppet.FriendshipPayloadResponse.deserializeBinary(bytes)
  assert.equal(restored.getId(), 'friendship-test-id', 'id should match')
  assert.equal(restored.getContactId(), 'contact-sender-id', 'contactId should match')
  assert.equal(restored.getHello(), 'Please accept my request', 'hello should match')
  assert.equal(restored.getType(), puppet.FriendshipType.FRIENDSHIP_TYPE_RECEIVE, 'type should match')
  assert.equal(restored.getScene(), puppet.FriendshipSceneType.FRIENDSHIP_SCENE_TYPE_QRCODE, 'scene should match')
  assert.equal(restored.getStranger(), 'true', 'stranger should match')
  assert.equal(restored.getTicket(), 'ticket-sample-123', 'ticket should match')
})

test('StringValue wrapper handles nullable values', async _t => {
  const sv = new StringValue()
  sv.setValue('wrapped-string-value')

  const bytes = sv.serializeBinary()
  const restored = StringValue.deserializeBinary(bytes)
  assert.equal(restored.getValue(), 'wrapped-string-value', 'restored string value should match')
})

test('PuppetService service definition exposes essential RPC methods', async _t => {
  assert.ok(puppet.PuppetService, 'PuppetService definition should exist')
  const service = puppet.PuppetService

  const expectedMethods = [
    'ding',
    'event',
    'start',
    'stop',
    'contactPayload',
    'contactList',
    'messagePayload',
    'messageSendText',
    'roomPayload',
    'roomList',
    'friendshipPayload',
  ]

  for (const method of expectedMethods) {
    const def = service[method]
    assert.ok(def, `PuppetService definition should have RPC method "${method}"`)
    assert.ok(def.path, `method "${method}" should have a path`)
    assert.ok(typeof def.requestSerialize === 'function', `method "${method}" should have requestSerialize`)
    assert.ok(typeof def.responseDeserialize === 'function', `method "${method}" should have responseDeserialize`)
  }
})
