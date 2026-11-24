/**
 * Tests binary serialization and deserialization round-trips for core protobuf messages
 * in `wechaty-grpc`, asserting message schema invariants and key RPC service descriptors
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
  response.setType(puppet.MessageType.MESSAGE_TYPE_TEXT)
  response.setFilename('test.txt')

  const bytes = response.serializeBinary()
  const restored = puppet.MessagePayloadResponse.deserializeBinary(bytes)

  assert.equal(restored.getId(), 'msg-test-id', 'message id should round-trip')
  assert.equal(restored.getTalkerId(), 'talker-test-id', 'talker id should round-trip')
  assert.equal(restored.getText(), 'Hello from safety net', 'text should round-trip')
  assert.equal(restored.getType(), puppet.MessageType.MESSAGE_TYPE_TEXT, 'message type should round-trip')
  assert.equal(restored.getFilename(), 'test.txt', 'filename should round-trip')
})

test('ContactPayloadResponse binary serialization round-trip', async _t => {
  const response = new puppet.ContactPayloadResponse()
  response.setId('contact-test-id')
  response.setName('Wechaty User')
  response.setAlias('Buddy')
  response.setAvatar('https://example.com/avatar.png')
  response.setCity('Beijing')
  response.setProvince('Beijing')
  response.setFriend(true)
  response.setGender(puppet.ContactGender.CONTACT_GENDER_MALE)
  response.setType(puppet.ContactType.CONTACT_TYPE_PERSONAL)
  response.setStar(false)
  response.setPhonesList(['13800138000', '13900139000'])

  const bytes = response.serializeBinary()
  const restored = puppet.ContactPayloadResponse.deserializeBinary(bytes)

  assert.equal(restored.getId(), 'contact-test-id', 'contact id should round-trip')
  assert.equal(restored.getName(), 'Wechaty User', 'name should round-trip')
  assert.equal(restored.getAlias(), 'Buddy', 'alias should round-trip')
  assert.equal(restored.getAvatar(), 'https://example.com/avatar.png', 'avatar should round-trip')
  assert.equal(restored.getCity(), 'Beijing', 'city should round-trip')
  assert.equal(restored.getProvince(), 'Beijing', 'province should round-trip')
  assert.equal(restored.getFriend(), true, 'friend flag should round-trip')
  assert.equal(restored.getGender(), puppet.ContactGender.CONTACT_GENDER_MALE, 'gender should round-trip')
  assert.equal(restored.getType(), puppet.ContactType.CONTACT_TYPE_PERSONAL, 'type should round-trip')
  assert.deepEqual(restored.getPhonesList(), ['13800138000', '13900139000'], 'phones list should round-trip')
})

test('RoomPayloadResponse binary serialization round-trip', async _t => {
  const response = new puppet.RoomPayloadResponse()
  response.setId('room-test-id')
  response.setTopic('Wechaty Developers')
  response.setAvatar('https://example.com/room.png')
  response.setAdminIdsList(['admin-1', 'admin-2'])
  response.setMemberIdsList(['member-1', 'member-2', 'member-3'])
  response.setOwnerId('admin-1')

  const bytes = response.serializeBinary()
  const restored = puppet.RoomPayloadResponse.deserializeBinary(bytes)

  assert.equal(restored.getId(), 'room-test-id', 'room id should round-trip')
  assert.equal(restored.getTopic(), 'Wechaty Developers', 'topic should round-trip')
  assert.equal(restored.getAvatar(), 'https://example.com/room.png', 'avatar should round-trip')
  assert.deepEqual(restored.getAdminIdsList(), ['admin-1', 'admin-2'], 'admin ids should round-trip')
  assert.deepEqual(restored.getMemberIdsList(), ['member-1', 'member-2', 'member-3'], 'member ids should round-trip')
  assert.equal(restored.getOwnerId(), 'admin-1', 'owner id should round-trip')
})

test('FriendshipPayloadResponse binary serialization round-trip', async _t => {
  const response = new puppet.FriendshipPayloadResponse()
  response.setId('friendship-test-id')
  response.setContactId('contact-applicant-id')
  response.setHello('Please accept my friendship request')
  response.setType(puppet.FriendshipType.FRIENDSHIP_TYPE_RECEIVE)
  response.setStranger('stranger-token')
  response.setTicket('ticket-uuid')

  const bytes = response.serializeBinary()
  const restored = puppet.FriendshipPayloadResponse.deserializeBinary(bytes)

  assert.equal(restored.getId(), 'friendship-test-id', 'friendship id should round-trip')
  assert.equal(restored.getContactId(), 'contact-applicant-id', 'contact id should round-trip')
  assert.equal(restored.getHello(), 'Please accept my friendship request', 'hello message should round-trip')
  assert.equal(restored.getType(), puppet.FriendshipType.FRIENDSHIP_TYPE_RECEIVE, 'type should round-trip')
  assert.equal(restored.getStranger(), 'stranger-token', 'stranger token should round-trip')
  assert.equal(restored.getTicket(), 'ticket-uuid', 'ticket should round-trip')
})

test('StringValue wrapper handles nullable values', async _t => {
  const stringVal = new StringValue()
  stringVal.setValue('wrapped-string-payload')

  const bytes = stringVal.serializeBinary()
  const restored = StringValue.deserializeBinary(bytes)
  assert.equal(restored.getValue(), 'wrapped-string-payload', 'StringValue should preserve string value')
})

test('PuppetService service definition exposes essential RPC methods', async _t => {
  const service = puppet.PuppetService

  assert.ok(service, 'PuppetService definition must exist')
  assert.ok(service.event, 'event streaming RPC definition must exist')
  assert.ok(service.start, 'start RPC definition must exist')
  assert.ok(service.stop, 'stop RPC definition must exist')
  assert.ok(service.ding, 'ding RPC definition must exist')
  assert.ok(service.contactPayload, 'contactPayload RPC definition must exist')
  assert.ok(service.roomPayload, 'roomPayload RPC definition must exist')
  assert.ok(service.messagePayload, 'messagePayload RPC definition must exist')
  assert.ok(service.friendshipPayload, 'friendshipPayload RPC definition must exist')
  assert.ok(service.messageSendText, 'messageSendText RPC definition must exist')
  assert.ok(service.logout, 'logout RPC definition must exist')

  assert.equal(typeof service.event.requestSerialize, 'function', 'event.requestSerialize should be a function')
  assert.equal(typeof service.event.responseDeserialize, 'function', 'event.responseDeserialize should be a function')
  assert.equal(service.event.path, '/wechaty.Puppet/Event', 'event path should match gRPC service path')
})
