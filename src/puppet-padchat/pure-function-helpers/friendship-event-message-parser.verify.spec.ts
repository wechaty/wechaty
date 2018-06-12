#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadchatMessagePayload,
}                             from '../padchat-schemas'

import { friendshipVerifyEventMessageParser } from './friendship-event-message-parser'

test('friendshipVerifyEventMessageParser() EN', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content: '李 卓 桓, .。, 。。 has enabled Friend Confirmation. <a href="weixin://findfriend/verifycontact">[Send a friend request]</a> to chat.',
    continue: 1,
    description: '',
    from_user: 'wxid_a8d806dzznm822',
    msg_id: '7907886189720444151',
    msg_source: '',
    msg_type: 5,
    status: 1,
    sub_type: 10000,
    timestamp: 1528786812,
    to_user: 'wxid_5zj4i5htp9ih22',
    uin: 1928023446,
  }

  const EXPECTED_CONTACT_ID = 'wxid_a8d806dzznm822'

  const contactId = friendshipVerifyEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactId, EXPECTED_CONTACT_ID, 'should parse verify message to contact id')
})

test('friendshipVerifyEventMessageParser() ZH', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : 'Huan LI++开启了朋友验证，你还不是他（她）朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。<a href="weixin://findfriend/verifycontact">发送朋友验证</a>',
    continue    : 1,
    description : '',
    from_user   : 'wxid_5zj4i5htp9ih22',
    msg_id      : '887915103217822928',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528787403,
    to_user     : 'wxid_a8d806dzznm822',
    uin         : 1211516682,
  }

  const EXPECTED_CONTACT_ID = 'wxid_5zj4i5htp9ih22'

  const contactId = friendshipVerifyEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactId, EXPECTED_CONTACT_ID, 'should parse verify message to contact id')
})
