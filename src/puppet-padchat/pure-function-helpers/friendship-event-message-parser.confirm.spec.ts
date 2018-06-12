#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadchatMessagePayload,
}                             from '../padchat-schemas'

import { friendshipConfirmEventMessageParser } from './friendship-event-message-parser'

test('friendshipConfirmEventMessageParser() EN-confirm-by-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : `I've accepted your friend request. Now let's chat!`,
    continue    : 1,
    description : '',
    from_user   : 'wxid_a8d806dzznm822',
    msg_id      : '7195763643366256289',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 1,
    timestamp   : 1528787010,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }

  const EXPECTED_CONTACT_ID = 'wxid_a8d806dzznm822'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})

test('friendshipConfirmEventMessageParser() EN-confirm-by-bot', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : 'You have added 李卓桓 as your WeChat contact. Start chatting!',
    continue    : 1,
    description : '',
    from_user   : 'lizhuohuan',
    msg_id      : '4530350877549544428',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528786605,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_CONTACT_ID = 'lizhuohuan'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})

test('friendshipConfirmEventMessageParser() ZH-confirm-by-other', async t => {
  t.skip('tbw')
})

test('friendshipConfirmEventMessageParser() ZH-confirm-by-bot', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content: '你已添加了Huan LI++，现在可以开始聊天了。',
    continue: 1,
    description: '',
    from_user: 'wxid_5zj4i5htp9ih22',
    msg_id: '6366033312578557207',
    msg_source: '',
    msg_type: 5,
    status: 1,
    sub_type: 10000,
    timestamp: 1528787010,
    to_user: 'wxid_a8d806dzznm822',
    uin: 1211516682,
  }
  const EXPECTED_CONTACT_ID = 'wxid_5zj4i5htp9ih22'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})
