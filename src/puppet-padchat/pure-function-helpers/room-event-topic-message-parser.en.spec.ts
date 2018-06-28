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

test('roomTopicEventMessageParser() EN-other-modify-topic', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '"李卓桓" changed the group name to "新群名"',
    continue    : 1,
    description : '',
    from_user   : '5354656522@chatroom',
    msg_id      : '1699332376319377977',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528656400,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomTopicEvent = {
    changerName : '李卓桓',
    roomId      : '5354656522@chatroom',
    topic       : '新群名',
  }

  const event = roomTopicEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomTopicEventMessageParser() EN-bot-modify-topic', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : 'You changed the group name to "morning"',
    continue    : 1,
    description : '',
    from_user   : '5354656522@chatroom',
    msg_id      : '2814971487727313057',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528750817,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomTopicEvent = {
    changerName : YOU,
    roomId      : '5354656522@chatroom',
    topic       : 'morning',
  }

  const event = roomTopicEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})
