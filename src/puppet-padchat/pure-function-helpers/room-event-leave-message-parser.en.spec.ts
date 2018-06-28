#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PuppetRoomLeaveEvent,
  YOU,
}                               from 'wechaty-puppet'

import {
  PadchatMessagePayload,
}                                 from '../padchat-schemas'

import { roomLeaveEventMessageParser }  from './room-event-leave-message-parser'

test('roomLeaveEventMessageParser() EN-bot-delete-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : 'You removed "李卓桓" from the group chat',
    continue    : 1,
    description : '',
    from_user   : '6061139518@chatroom',
    msg_id      : '4444372134867544747',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528751382,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomLeaveEvent = {
    leaverNameList : ['李卓桓'],
    removerName    : YOU,
    roomId         : '6061139518@chatroom',
  }

  const payload = roomLeaveEventMessageParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_EVENT, 'should parse room leave message payload')

})

test('roomLeaveEventMessageParser() EN-bot-delete-others', async t => {
  t.skip('the same as bot-delete-other')
})

test('roomLeaveEventMessageParser() EN-other-delete-bot', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : 'You were removed from the group chat by "李卓桓"',
    continue    : 1,
    description : '',
    from_user   : '3453262102@chatroom',
    msg_id      : '2074127648966014259',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528653673,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomLeaveEvent = {
    leaverNameList : [YOU],
    removerName    : '李卓桓',
    roomId         : '3453262102@chatroom',
  }

  const roomLeaveEvent = roomLeaveEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(roomLeaveEvent, EXPECTED_EVENT, 'should parse event')
})

test('roomLeaveEventMessageParser() EN-other-delete-other', async t => {
  t.skip('can not detect')
})

test('roomLeaveEventMessageParser() EN-other-delete-others', async t => {
  t.skip('can not detect')
})
