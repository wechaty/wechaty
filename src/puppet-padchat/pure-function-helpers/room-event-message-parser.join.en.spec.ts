#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import {
  PuppetRoomJoinEvent,
}                               from '../../puppet/'

import {
  PadchatMessagePayload,
}                                 from '../padchat-schemas'

import { roomJoinEventMessageParser }  from './room-event-message-parser'

test('roomJoinEventMessageParser() EN-other-invite-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content: '李卓桓 invited Huan to the group chat',
    continue: 1,
    description: '',
    from_user: '5967138682@chatroom',
    msg_id: '11101130790981890',
    msg_source: '',
    msg_type: 5,
    status: 1,
    sub_type: 10000,
    timestamp: 1528754090,
    to_user: 'wxid_5zj4i5htp9ih22',
    uin: 1928023446,
  }
})

test('roomJoinEventMessageParser() EN-other-invite-others', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content: '李卓桓 invited 李佳芮, Huan to the group chat',
    continue: 1,
    description: '',
    from_user: '5178377660@chatroom',
    msg_id: '3318447775079396781',
    msg_source: '',
    msg_type: 5,
    status: 1,
    sub_type: 10000,
    timestamp: 1528752402,
    to_user: 'wxid_5zj4i5htp9ih22',
    uin: 1928023446,
  }
})

test('roomJoinEventMessageParser() EN-other-invite-bot', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content: '李卓桓 invited you to a group chat with ',
    continue: 1,
    description: '',
    from_user: '3453262102@chatroom',
    msg_id: '6633562959389269859',
    msg_source: '',
    msg_type: 5,
    status: 1,
    sub_type: 10000,
    timestamp: 1528653783,
    to_user: 'wxid_5zj4i5htp9ih22',
    uin: 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {

  }

})

test('roomJoinEventMessageParser() EN-other-invite-bot-with-others', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content: '李卓桓 invited you and Huan to the group chat',
    continue: 1,
    description: '',
    from_user: '5178377660@chatroom',
    msg_id: '3875534618008681721',
    msg_source: '',
    msg_type: 5,
    status: 1,
    sub_type: 10000,
    timestamp: 1528751621,
    to_user: 'wxid_5zj4i5htp9ih22',
    uin: 1928023446,
  }
})

test('roomJoinEventMessageParser() EN-bot-invite-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '3453262102@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA[You invited . 李 卓 桓 .呵呵 to the group chat.   ]]></plain>\n\t\t<text><![CDATA[You invited . 李 卓 桓 .呵呵 to the group chat.   ]]></text>\n\t\t<link>\n\t\t\t<scene>invite</scene>\n\t\t\t<text><![CDATA[  Revoke]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[wxid_a8d806dzznm822]]></username>\n\t\t\t</memberlist>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '3453262102@chatroom',
    msg_id      : '4030118997146183783',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528755135,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
})

test('roomJoinEventMessageParser() EN-bot-invite-others', async t => {
  t.skip('should be the same as the bot-invite-other')
})

test('roomJoinEventMessageParser() EN-room-create', async t => {
  t.skip('to be confirm')
})
