/**
 * Tests binary and JSON serialization round-trips for core Protobuf-ES v2 messages
 * in `wechaty-grpc`, asserting message schema invariants and key RPC service descriptors
 * as part of the Phase 4.2 Protobuf modernization (#3124).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  create,
  toBinary,
  fromBinary,
  toJson,
  fromJson,
} from '@bufbuild/protobuf'

import {
  Puppet,
  StringValue,
  Timestamp,
  EventRequestSchema,
  EventResponseSchema,
  EventType,
  MessagePayloadResponseSchema,
  MessageType,
  ContactPayloadResponseSchema,
  ContactGender,
  ContactType,
  RoomPayloadResponseSchema,
  FriendshipPayloadResponseSchema,
  FriendshipType,
} from '../../src/mod.ts'

test('EventResponse binary and JSON serialization round-trip', async _t => {
  const payloadData = JSON.stringify({ messageId: 'msg-uuid-12345' })
  const event = create(EventResponseSchema, {
    type: EventType.MESSAGE,
    payload: payloadData,
  })

  // Binary round-trip
  const bytes = toBinary(EventResponseSchema, event)
  assert.ok(bytes.length > 0, 'serialized bytes should not be empty')

  const restored = fromBinary(EventResponseSchema, bytes)
  assert.equal(restored.type, EventType.MESSAGE, 'restored event type should match')
  assert.equal(restored.payload, payloadData, 'restored payload should match')

  // JSON round-trip
  const json = toJson(EventResponseSchema, event)
  const jsonRestored = fromJson(EventResponseSchema, json)
  assert.equal(jsonRestored.type, EventType.MESSAGE, 'json restored event type should match')
  assert.equal(jsonRestored.payload, payloadData, 'json restored payload should match')
})

test('EventRequest binary serialization round-trip', async _t => {
  const request = create(EventRequestSchema, {})
  const bytes = toBinary(EventRequestSchema, request)
  const restored = fromBinary(EventRequestSchema, bytes)
  assert.ok(restored, 'should deserialize to EventRequest')
})

test('MessagePayloadResponse binary serialization round-trip', async _t => {
  const response = create(MessagePayloadResponseSchema, {
    id: 'msg-test-id',
    talkerId: 'talker-test-id',
    text: 'Hello from safety net',
    type: MessageType.TEXT,
    filename: 'test.txt',
  })

  const bytes = toBinary(MessagePayloadResponseSchema, response)
  const restored = fromBinary(MessagePayloadResponseSchema, bytes)

  assert.equal(restored.id, 'msg-test-id', 'message id should round-trip')
  assert.equal(restored.talkerId, 'talker-test-id', 'talker id should round-trip')
  assert.equal(restored.text, 'Hello from safety net', 'text should round-trip')
  assert.equal(restored.type, MessageType.TEXT, 'message type should round-trip')
  assert.equal(restored.filename, 'test.txt', 'filename should round-trip')
})

test('ContactPayloadResponse binary serialization round-trip', async _t => {
  const response = create(ContactPayloadResponseSchema, {
    id: 'contact-test-id',
    name: 'Wechaty User',
    alias: 'Buddy',
    avatar: 'https://example.com/avatar.png',
    city: 'Beijing',
    province: 'Beijing',
    friend: true,
    gender: ContactGender.MALE,
    type: ContactType.PERSONAL,
    star: false,
    phones: ['13800138000', '13900139000'],
  })

  const bytes = toBinary(ContactPayloadResponseSchema, response)
  const restored = fromBinary(ContactPayloadResponseSchema, bytes)

  assert.equal(restored.id, 'contact-test-id', 'contact id should round-trip')
  assert.equal(restored.name, 'Wechaty User', 'name should round-trip')
  assert.equal(restored.alias, 'Buddy', 'alias should round-trip')
  assert.equal(restored.avatar, 'https://example.com/avatar.png', 'avatar should round-trip')
  assert.equal(restored.city, 'Beijing', 'city should round-trip')
  assert.equal(restored.province, 'Beijing', 'province should round-trip')
  assert.equal(restored.friend, true, 'friend flag should round-trip')
  assert.equal(restored.gender, ContactGender.MALE, 'gender should round-trip')
  assert.equal(restored.type, ContactType.PERSONAL, 'type should round-trip')
  assert.deepEqual(restored.phones, ['13800138000', '13900139000'], 'phones list should round-trip')
})

test('RoomPayloadResponse binary serialization round-trip', async _t => {
  const response = create(RoomPayloadResponseSchema, {
    id: 'room-test-id',
    topic: 'Wechaty Developers',
    avatar: 'https://example.com/room.png',
    adminIds: ['admin-1', 'admin-2'],
    memberIds: ['member-1', 'member-2', 'member-3'],
    ownerId: 'admin-1',
  })

  const bytes = toBinary(RoomPayloadResponseSchema, response)
  const restored = fromBinary(RoomPayloadResponseSchema, bytes)

  assert.equal(restored.id, 'room-test-id', 'room id should round-trip')
  assert.equal(restored.topic, 'Wechaty Developers', 'topic should round-trip')
  assert.equal(restored.avatar, 'https://example.com/room.png', 'avatar should round-trip')
  assert.deepEqual(restored.adminIds, ['admin-1', 'admin-2'], 'admin ids should round-trip')
  assert.deepEqual(restored.memberIds, ['member-1', 'member-2', 'member-3'], 'member ids should round-trip')
  assert.equal(restored.ownerId, 'admin-1', 'owner id should round-trip')
})

test('FriendshipPayloadResponse binary serialization round-trip', async _t => {
  const response = create(FriendshipPayloadResponseSchema, {
    id: 'friendship-test-id',
    contactId: 'contact-applicant-id',
    hello: 'Please accept my friendship request',
    type: FriendshipType.RECEIVE,
    stranger: 'stranger-token',
    ticket: 'ticket-uuid',
  })

  const bytes = toBinary(FriendshipPayloadResponseSchema, response)
  const restored = fromBinary(FriendshipPayloadResponseSchema, bytes)

  assert.equal(restored.id, 'friendship-test-id', 'friendship id should round-trip')
  assert.equal(restored.contactId, 'contact-applicant-id', 'contact id should round-trip')
  assert.equal(restored.hello, 'Please accept my friendship request', 'hello message should round-trip')
  assert.equal(restored.type, FriendshipType.RECEIVE, 'type should round-trip')
  assert.equal(restored.stranger, 'stranger-token', 'stranger token should round-trip')
  assert.equal(restored.ticket, 'ticket-uuid', 'ticket should round-trip')
})

test('StringValue and Timestamp pure ESM classes', async _t => {
  const stringVal = new StringValue('wrapped-string-payload')
  assert.equal(stringVal.getValue(), 'wrapped-string-payload', 'StringValue should preserve string value')
  stringVal.setValue('updated-value')
  assert.equal(stringVal.getValue(), 'updated-value', 'StringValue should update value')

  const ts = new Timestamp()
  const now = new Date()
  ts.fromDate(now)
  assert.ok(Math.abs(ts.toDate().getTime() - now.getTime()) < 1000, 'Timestamp should convert to and from Date')
})

test('Puppet GenService definition exposes essential RPC methods', async _t => {
  assert.ok(Puppet, 'Puppet definition must exist')
  assert.equal(Puppet.typeName, 'wechaty.Puppet', 'service type name must match wechaty.Puppet')
  assert.ok(Puppet.method.event, 'event streaming RPC definition must exist')
  assert.ok(Puppet.method.start, 'start RPC definition must exist')
  assert.ok(Puppet.method.stop, 'stop RPC definition must exist')
  assert.ok(Puppet.method.ding, 'ding RPC definition must exist')
  assert.ok(Puppet.method.contactPayload, 'contactPayload RPC definition must exist')
  assert.ok(Puppet.method.roomPayload, 'roomPayload RPC definition must exist')
  assert.ok(Puppet.method.messagePayload, 'messagePayload RPC definition must exist')
  assert.ok(Puppet.method.friendshipPayload, 'friendshipPayload RPC definition must exist')
  assert.ok(Puppet.method.messageSendText, 'messageSendText RPC definition must exist')
  assert.ok(Puppet.method.logout, 'logout RPC definition must exist')

  assert.equal(Puppet.method.event.methodKind, 'server_streaming', 'event must be server_streaming')
  assert.equal(Puppet.method.start.methodKind, 'unary', 'start must be unary')
  assert.equal(Puppet.method.download.methodKind, 'server_streaming', 'download must be server_streaming')
  assert.equal(Puppet.method.upload.methodKind, 'client_streaming', 'upload must be client_streaming')
  assert.equal(Puppet.method.version.idempotency, 1, 'version must have NO_SIDE_EFFECTS idempotency')
  assert.equal(Puppet.method.contactPayload.idempotency, 1, 'contactPayload must have NO_SIDE_EFFECTS idempotency')
  assert.equal(Puppet.methods.length, 62, 'Puppet should define 62 RPC methods')
})
