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

test('roomLeaveEventMessageParser() ZH-bot-delete-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '你将"Huan LI++"移出了群聊',
    continue    : 1,
    description : '',
    from_user   : '5354656522@chatroom',
    msg_id      : '7593234909679768634',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528657235,
    to_user     : 'lizhuohuan',
    uin         : 4763975,
  }

  const EXPECTED_EVENT: PuppetRoomLeaveEvent = {
    leaverNameList : ['Huan LI++'],
    removerName    : YOU,
    roomId         : '5354656522@chatroom',
  }

  const payload = roomLeaveEventMessageParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_EVENT, 'should parse room leave message payload')
})

test('roomLeaveEventMessageParser() ZH-bot-delete-others', async t => {
  t.skip('the same as bot-delete-other')
})

test('roomLeaveEventMessageParser() ZH-other-delete-bot', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '你被"李卓桓"移出群聊',
    continue    : 1,
    description : '',
    from_user   : '5178377660@chatroom',
    msg_id      : '78437822999859076',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528752134,
    to_user     : 'wxid_a8d806dzznm822',
    uin         : 1211516682,
  }
  const EXPECTED_EVENT: PuppetRoomLeaveEvent = {
    leaverNameList : [YOU],
    removerName    : '李卓桓',
    roomId         : '5178377660@chatroom',
  }

  const payload = roomLeaveEventMessageParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_EVENT, 'should parse room leave message payload')
})

test('roomLeaveEventMessageParser() ZH-other-delete-other', async t => {
  t.skip('bot will not see any message, can not detected')
})

test('roomLeaveEventMessageParser() ZH-other-delete-others', async t => {
  t.skip('bot will not see any message, can not detected')
})
