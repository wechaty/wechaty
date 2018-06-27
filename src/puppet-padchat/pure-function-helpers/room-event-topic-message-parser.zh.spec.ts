#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PuppetRoomTopicEvent,
  YOU,
}                               from 'wechaty-puppet'

import {
  PadchatMessagePayload,
}                               from '../padchat-schemas'

import { roomTopicEventMessageParser }  from './room-event-topic-message-parser'

test('roomTopicEventMessageParser() ZH-bot-modify-topic', async t => {
  const PADCHAT_MESSAGE_PAYLOAD_ROOM_TOPIC: PadchatMessagePayload = {
    content     : '你修改群名为“新群名”',
    continue    : 1,
    description : '',
    from_user   : '5354656522@chatroom',
    msg_id      : '778872444829065792',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528657193,
    to_user     : 'lizhuohuan',
    uin         : 4763975,
  }

  const EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC: PuppetRoomTopicEvent = {
    changerName : YOU,
    roomId      : '5354656522@chatroom',
    topic       : '新群名',
  }

  const payload = roomTopicEventMessageParser(PADCHAT_MESSAGE_PAYLOAD_ROOM_TOPIC)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC, 'should parse room topic message payload')
})

test('roomTopicEventMessageParser() ZH-other-modify-topic', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '"李卓桓"修改群名为“新群名”',
    continue    : 1,
    description : '',
    from_user   : '5354656522@chatroom',
    msg_id      : '4311778109694299650',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528656552,
    to_user     : 'wxid_a8d806dzznm822',
    uin         : 1211516682,
  }

  const EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC: PuppetRoomTopicEvent = {
    changerName : '李卓桓',
    roomId      : '5354656522@chatroom',
    topic       : '新群名',
  }

  const event = roomTopicEventMessageParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(event, EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC, 'should parse room topic message payload')
})
