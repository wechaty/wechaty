#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadchatMessagePayload,
}                             from '../padchat-schemas'

import { friendRequestEventMessageParser } from './friendship-event-message-parser'

test('friendRequestEventMessageParser() EN-confirm-by-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : 'You have added 李佳芮 as your WeChat contact. Start chatting!',
    continue    : 1,
    description : '',
    from_user   : 'qq512436430',
    msg_id      : '7703432140458651045',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528753712,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }

  const EXPECTED_FRIEND_REQUEST_ID = '7703432140458651045'

  const contactId = friendRequestEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactId, EXPECTED_FRIEND_REQUEST_ID, 'should parse EN message to request id')
})

test('friendRequestEventMessageParser() ZH', async t => {
  t.skip('tbw')
  // const MESSAGE_PAYLOAD: PadchatMessagePayload = {
  //   XXX: 3,
  // }

  // const EXPECTED_FRIEND_REQUEST_ID = ''

  // const contactId = friendRequestEventMessageParser(MESSAGE_PAYLOAD)
  // t.equal(contactId, EXPECTED_FRIEND_REQUEST_ID, 'should parse ZH message to request id')
})
