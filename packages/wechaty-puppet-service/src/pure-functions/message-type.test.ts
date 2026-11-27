/**
 * Pins the independent Puppet and Protobuf assignments used by the
 * opt-in MessagePayload encoder across all shared test runtimes.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { create, toBinary, toJson } from '@bufbuild/protobuf'
import { MessagePayloadResponseSchema } from 'wechaty-grpc'
import { types } from 'wechaty-puppet'

import { messageTypeToProto } from './message-type.ts'

const { Message } = types

test('Puppet kinds translate to the published Protobuf numbers and JSON names', () => {
  const fixtures = [
    [Message.Attachment, 1, 'ATTACHMENT'],
    [Message.Audio, 2, 'AUDIO'],
    [Message.Contact, 3, 'CONTACT'],
    [Message.ChatHistory, 8, 'CHAT_HISTORY'],
    [Message.Emoticon, 4, 'EMOTICON'],
    [Message.Image, 5, 'IMAGE'],
    [Message.Text, 6, 'TEXT'],
    [Message.Location, 9, 'LOCATION'],
    [Message.MiniProgram, 10, 'MINI_PROGRAM'],
    [Message.GroupNote, 15, 'GROUP_NOTE'],
    [Message.Transfer, 11, 'TRANSFER'],
    [Message.RedEnvelope, 12, 'RED_ENVELOPE'],
    [Message.Recalled, 13, 'RECALLED'],
    [Message.Url, 14, 'URL'],
    [Message.Video, 7, 'VIDEO'],
    [Message.Post, 16, 'POST'],
    [Message.System, 18, 'SYSTEM'],
  ] as const

  for (const [type, number, name] of fixtures) {
    const payload = create(MessagePayloadResponseSchema, { type: messageTypeToProto(type) })
    // The byte for field 5 and each enum value come from the published schema.
    assert.deepEqual(toBinary(MessagePayloadResponseSchema, payload), Uint8Array.of(0x28, number))
    assert.deepEqual(toJson(MessagePayloadResponseSchema, payload), { type: `MESSAGE_TYPE_${name}` })
  }
})

test('provider types without a known mapping encode as Protobuf UNSPECIFIED', () => {
  assert.equal(messageTypeToProto(Message.Unknown), 0)
  assert.equal(messageTypeToProto(123 as types.Message), 0)
})
