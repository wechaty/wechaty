/**
 * Exercises the shared Puppet and Protobuf message-type contract without a
 * network transport, including the numbers sent by existing Puppet servers.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fromBinary, fromJson, toJson } from '@bufbuild/protobuf'
import { MessagePayloadResponseSchema, MessageType } from 'wechaty-grpc'
import { types } from 'wechaty-puppet'

import { messageTypeFromWire } from './message-type.ts'

const { Message } = types

test('Protobuf message kinds have the same numbers as the Puppet SDK', () => {
  assert.deepEqual(Message, {
    Unknown: MessageType.UNSPECIFIED,
    Attachment: MessageType.ATTACHMENT,
    Audio: MessageType.AUDIO,
    Contact: MessageType.CONTACT,
    ChatHistory: MessageType.CHAT_HISTORY,
    Emoticon: MessageType.EMOTICON,
    Image: MessageType.IMAGE,
    Text: MessageType.TEXT,
    Location: MessageType.LOCATION,
    MiniProgram: MessageType.MINI_PROGRAM,
    GroupNote: MessageType.GROUP_NOTE,
    Transfer: MessageType.TRANSFER,
    RedEnvelope: MessageType.RED_ENVELOPE,
    Recalled: MessageType.RECALLED,
    Url: MessageType.URL,
    Video: MessageType.VIDEO,
    Post: MessageType.POST,
    System: MessageType.SYSTEM,
  })
  assert.equal(Object.keys(Message).length, Object.keys(MessageType).length)
})

test('legacy binary message types have the correct ProtoJSON names', () => {
  // Field 5 is the enum varint. Literal bytes pin the deployed numbers.
  const fixtures = [
    [4, 'MESSAGE_TYPE_CHAT_HISTORY'],
    [5, 'MESSAGE_TYPE_EMOTICON'],
    [6, 'MESSAGE_TYPE_IMAGE'],
    [7, 'MESSAGE_TYPE_TEXT'],
    [8, 'MESSAGE_TYPE_LOCATION'],
    [9, 'MESSAGE_TYPE_MINI_PROGRAM'],
    [10, 'MESSAGE_TYPE_GROUP_NOTE'],
    [15, 'MESSAGE_TYPE_VIDEO'],
  ] as const

  for (const [number, name] of fixtures) {
    const payload = fromBinary(MessagePayloadResponseSchema, Uint8Array.of(0x28, number))
    assert.deepEqual(toJson(MessagePayloadResponseSchema, payload), { type: name })
    assert.equal(fromJson(MessagePayloadResponseSchema, { type: name }).type, number)
    assert.equal(messageTypeFromWire(payload.type), number)
  }
})

test('unset and future wire types decode as Puppet Unknown', () => {
  const omitted = fromBinary(MessagePayloadResponseSchema, new Uint8Array())
  const future = fromBinary(MessagePayloadResponseSchema, Uint8Array.of(0x28, 123))
  assert.equal(messageTypeFromWire(omitted.type), Message.Unknown)
  assert.equal(messageTypeFromWire(future.type), Message.Unknown)
})
