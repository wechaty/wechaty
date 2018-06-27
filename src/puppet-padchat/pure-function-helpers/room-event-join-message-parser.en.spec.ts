#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import {
  PuppetRoomJoinEvent,
  YOU,
}                               from 'wechaty-puppet'

import {
  PadchatMessagePayload,
}                                 from '../padchat-schemas'

import { roomJoinEventMessageParser }  from './room-event-join-message-parser'

test('roomJoinEventMessageParser() EN-other-invite-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '李卓桓 invited Huan to the group chat',
    continue    : 1,
    description : '',
    from_user   : '5967138682@chatroom',
    msg_id      : '11101130790981890',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528754090,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['Huan'],
    inviterName     : '李卓桓',
    roomId          : '5967138682@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-other-invite-others', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '李卓桓 invited 李佳芮, Huan to the group chat',
    continue    : 1,
    description : '',
    from_user   : '5178377660@chatroom',
    msg_id      : '3318447775079396781',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528752402,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['李佳芮', 'Huan'],
    inviterName     : '李卓桓',
    roomId          : '5178377660@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-other-invite-bot', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '李卓桓 invited you to a group chat with ',
    continue    : 1,
    description : '',
    from_user   : '3453262102@chatroom',
    msg_id      : '6633562959389269859',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528653783,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : [YOU],
    inviterName     : '李卓桓',
    roomId          : '3453262102@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-other-invite-bot-with-2-others', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '李卓桓 invited you and Huan to the group chat',
    continue    : 1,
    description : '',
    from_user   : '5178377660@chatroom',
    msg_id      : '3875534618008681721',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528751621,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : [YOU, 'Huan'],
    inviterName     : '李卓桓',
    roomId          : '5178377660@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-bot-invite-one', async t => {
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

  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['. 李 卓 桓 .呵呵'],
    inviterName     : YOU,
    roomId          : '3453262102@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

/**
 * See more in https://github.com/lijiarui/wechaty-puppet-padchat/issues/55
 */
test('roomJoinEventMessageParser() EN-bot-invite-three-bot-is-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '6350854677@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA[You invited 卓桓、Zhuohuan, 李佳芮, 太阁_传话助手 to the group chat.   ]]></plain>\n\t\t<text><![CDATA[You invited 卓桓、Zhuohuan, 李佳芮, 太阁_传话助手 to the group chat.   ]]></text>\n\t\t<link>\n\t\t\t<scene>invite</scene>\n\t\t\t<text><![CDATA[  Revoke]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[lizhuohuan]]></username>\n\t\t\t\t<username><![CDATA[qq512436430]]></username>\n\t\t\t\t<username><![CDATA[wxid_lredtm37y7rc22]]></username>\n\t\t\t</memberlist>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '6350854677@chatroom',
    msg_id      : '8360809484132917423',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528831222,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['卓桓、Zhuohuan', '李佳芮', '太阁_传话助手'],
    inviterName     : YOU,
    roomId          : '6350854677@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-bot-invite-three-bot-is-not-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '12740017638@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA[You invited 卓桓、Zhuohuan, 太阁_传话助手, 桔小秘 to the group chat.   ]]></plain>\n\t\t<text><![CDATA[You invited 卓桓、Zhuohuan, 太阁_传话助手, 桔小秘 to the group chat.   ]]></text>\n\t\t<link>\n\t\t\t<scene>invite</scene>\n\t\t\t<text><![CDATA[  Revoke]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[lizhuohuan]]></username>\n\t\t\t\t<username><![CDATA[wxid_lredtm37y7rc22]]></username>\n\t\t\t\t<username><![CDATA[wxid_seytcj5hxxsh12]]></username>\n\t\t\t</memberlist>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '12740017638@chatroom',
    msg_id      : '232220931339852872',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528831349,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['卓桓、Zhuohuan', '太阁_传话助手', '桔小秘'],
    inviterName     : YOU,
    roomId          : '12740017638@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-other-invite-bot-and-two', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content: '李佳芮 invited you to a group chat with 卓桓、Zhuohuan, 桔小秘, 桔小秘',
    continue    : 1,
    description : '',
    from_user   : '12740017638@chatroom',
    msg_id      : '5536901313750622557',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528831519,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : [YOU],
    inviterName     : '李佳芮',
    roomId          : '12740017638@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-scan-qrcode-shared-by-bot-when-bot-is-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '6350854677@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA["李佳芮" joined group chat via the QR code you shared.  ]]></plain>\n\t\t<text><![CDATA["李佳芮" joined group chat via the QR code you shared.  ]]></text>\n\t\t<link>\n\t\t\t<scene>qrcode</scene>\n\t\t\t<text><![CDATA[  Revoke]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[qq512436430]]></username>\n\t\t\t</memberlist>\n\t\t\t<qrcode><![CDATA[http://weixin.qq.com/g/Ay3k_6_NZRM-0eGu]]></qrcode>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '6350854677@chatroom',
    msg_id      : '4650182269246977858',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528831810,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['李佳芮'],
    inviterName     : YOU,
    roomId          : '6350854677@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-scan-qrcode-shared-by-bot-when-bot-not-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '9967013206@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA["李佳芮"通过扫描你分享的二维码加入群聊  ]]></plain>\n\t\t<text><![CDATA["李佳芮"通过扫描你分享的二维码加入群聊  ]]></text>\n\t\t<link>\n\t\t\t<scene>qrcode</scene>\n\t\t\t<text><![CDATA[  撤销]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[qq512436430]]></username>\n\t\t\t</memberlist>\n\t\t\t<qrcode><![CDATA[http://weixin.qq.com/g/A_bp7kz2nCsWWNW7]]></qrcode>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '9967013206@chatroom',
    msg_id      : '387789779973392581',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528831949,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['李佳芮'],
    inviterName     : YOU,
    roomId          : '9967013206@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-scan-qrcode-shared-by-other-when-bot-is-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '"卓桓、Zhuohuan" joined the group chat via the QR Code shared by "李佳芮".',
    continue    : 1,
    description : '',
    from_user   : '5616634434@chatroom',
    msg_id      : '4922578438277818474',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528831993,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['卓桓、Zhuohuan'],
    inviterName     : '李佳芮',
    roomId          : '5616634434@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-scan-qrcode-shared-by-other-when-bot-no-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '"卓桓、Zhuohuan" joined the group chat via the QR Code shared by "李佳芮".',
    continue    : 1,
    description : '',
    from_user   : '6350854677@chatroom',
    msg_id      : '6329592305165976988',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528832169,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['卓桓、Zhuohuan'],
    inviterName     : '李佳芮',
    roomId          : '6350854677@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() EN-bot-invite-many', async t => {
  t.skip('should be the same as the bot-invite-many')
})

test('roomJoinEventMessageParser() EN-room-create', async t => {
  t.skip('to be confirm')
})
