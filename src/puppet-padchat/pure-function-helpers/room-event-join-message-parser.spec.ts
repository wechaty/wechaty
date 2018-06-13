#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadchatMessagePayload,
}                                 from '../padchat-schemas'

import {
  roomJoinEventMessageParser,
}                               from './room-event-join-message-parser'

test('roomJoinEventMessageParser() not detected', async t => {
  t.equal(
    roomJoinEventMessageParser(undefined as any),
    null,
    'should return null for undefined',
  )

  t.equal(
    roomJoinEventMessageParser('null' as any),
    null,
    'should return null for null',
  )

  t.equal(
    roomJoinEventMessageParser('test' as any),
    null,
    'should return null for string',
  )

  t.equal(
    roomJoinEventMessageParser({} as any),
    null,
    'should return null for empty object',
  )

  t.equal(
    roomJoinEventMessageParser({ content: 'fsdfsfsdfasfas' } as PadchatMessagePayload ),
    null,
    'should return null for PadchatMessagePayload with unknown content',
  )

})

test('roomJoinEventMessageParser() Recall Message', async t => {
  const MESSAGE_PAYLOAD = {
    content     : 'qq512436430:\n<sysmsg type="revokemsg"><revokemsg><session>5367653125@chatroom</session><msgid>1452102025</msgid><newmsgid>2582549652250718552</newmsgid><replacemsg><![CDATA["李佳芮" has recalled a message.]]></replacemsg></revokemsg></sysmsg>',
    continue    : 1,
    description : '',
    from_user   : '5367653125@chatroom',
    msg_id      : '8079407148816751084',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528806181,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  t.equal(roomJoinEventMessageParser(MESSAGE_PAYLOAD), null, 'should return null for a normal message recall payload')
})
