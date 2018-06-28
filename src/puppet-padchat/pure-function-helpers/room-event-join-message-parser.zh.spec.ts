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

test('roomJoinEventMessageParser() ZH-other-invite-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '"李卓桓"邀请"Huan LI++"加入了群聊',
    continue    : 1,
    description : '',
    from_user   : '5354656522@chatroom',
    msg_id      : '1303222499352704462',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528657265,
    to_user     : 'wxid_a8d806dzznm822',
    uin         : 1211516682,
  }

  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList: ['Huan LI++'],
    inviterName: '李卓桓',
    roomId: '5354656522@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  // console.log('payload:', event)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse room join message payload')
})

test('roomJoinEventMessageParser() ZH-other-invite-others', async t => {
  t.skip('tbw')
})

test('roomJoinEventMessageParser() ZH-other-invite-bot', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '"李佳芮"邀请你加入了群聊，群聊参与人还有：小桔、桔小秘、小小桔、wuli舞哩客服、舒米',
    continue    : 1,
    description : '',
    from_user   : '8083065140@chatroom',
    msg_id      : '5158828327248760504',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1526984649,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }

  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : [YOU],
    inviterName     : '李佳芮',
    roomId          : '8083065140@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() ZH-other-invite-bot-with-other', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '"李卓桓"邀请你和"Huan LI++"加入了群聊',
    continue    : 1,
    description : '',
    from_user   : '5178377660@chatroom',
    msg_id      : '8563709618990948643',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528751621,
    to_user     : 'wxid_a8d806dzznm822',
    uin         : 1211516682,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : [YOU, 'Huan LI++'],
    inviterName     : '李卓桓',
    roomId          : '5178377660@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() ZH-bot-invite-one', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '5354656522@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA[你邀请"Huan LI++"加入了群聊  ]]></plain>\n\t\t<text><![CDATA[你邀请"Huan LI++"加入了群聊  ]]></text>\n\t\t<link>\n\t\t\t<scene>invite</scene>\n\t\t\t<text><![CDATA[  撤销]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[wxid_5zj4i5htp9ih22]]></username>\n\t\t\t</memberlist>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '5354656522@chatroom',
    msg_id      : '6278175026243694414',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528657265,
    to_user     : 'lizhuohuan',
    uin         : 4763975,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['Huan LI++'],
    inviterName     : YOU,
    roomId          : '5354656522@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

/**
 * See more in https://github.com/lijiarui/wechaty-puppet-padchat/issues/55
 */
test('roomJoinEventMessageParser() ZH-bot-invite-three-bot-is-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '6350854677@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA[你邀请"李卓桓、李佳芮、桔小秘"加入了群聊  ]]></plain>\n\t\t<text><![CDATA[你邀请"李卓桓、李佳芮、桔小秘"加入了群聊  ]]></text>\n\t\t<link>\n\t\t\t<scene>invite</scene>\n\t\t\t<text><![CDATA[  撤销]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[lizhuohuan]]></username>\n\t\t\t\t<username><![CDATA[qq512436430]]></username>\n\t\t\t\t<username><![CDATA[wxid_seytcj5hxxsh12]]></username>\n\t\t\t</memberlist>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '6350854677@chatroom',
    msg_id      : '4060992149171432834',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528828692,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
    }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['李卓桓', '李佳芮', '桔小秘'],
    inviterName     : YOU,
    roomId          : '6350854677@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() ZH-bot-invite-three-bot-is-not-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '12740017638@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA[你邀请"卓桓、Zhuohuan、太阁_传话助手、桔小秘"加入了群聊  ]]></plain>\n\t\t<text><![CDATA[你邀请"卓桓、Zhuohuan、太阁_传话助手、桔小秘"加入了群聊  ]]></text>\n\t\t<link>\n\t\t\t<scene>invite</scene>\n\t\t\t<text><![CDATA[  撤销]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[lizhuohuan]]></username>\n\t\t\t\t<username><![CDATA[wxid_lredtm37y7rc22]]></username>\n\t\t\t\t<username><![CDATA[wxid_seytcj5hxxsh12]]></username>\n\t\t\t</memberlist>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '12740017638@chatroom',
    msg_id      : '7919516882221400792',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528829561,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['卓桓', 'Zhuohuan', '太阁_传话助手', '桔小秘'],
    inviterName     : YOU,
    roomId          : '12740017638@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() ZH-other-invite-bot-and-two', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '"李佳芮-哈哈哈啊哈哈"邀请你加入了群聊，群聊参与人还有：小桔、桔小秘、太阁_传话助手、桔小秘',
    continue    : 1,
    description : '',
    from_user   : '5616634434@chatroom',
    msg_id      : '4650121355699061443',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528830037,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : [YOU],
    inviterName     : '李佳芮-哈哈哈啊哈哈',
    roomId          : '5616634434@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() ZH-scan-qrcode-shared-by-bot-when-bot-not-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '9967013206@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA["李佳芮"通过扫描你分享的二维码加入群聊  ]]></plain>\n\t\t<text><![CDATA["李佳芮"通过扫描你分享的二维码加入群聊  ]]></text>\n\t\t<link>\n\t\t\t<scene>qrcode</scene>\n\t\t\t<text><![CDATA[  撤销]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[qq512436430]]></username>\n\t\t\t</memberlist>\n\t\t\t<qrcode><![CDATA[http://weixin.qq.com/g/A3XRwu4O3KtmR1jc]]></qrcode>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '9967013206@chatroom',
    msg_id      : '4571828451143401319',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528830363,
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

test('roomJoinEventMessageParser() ZH-scan-qrcode-shared-by-bot-when-bot-is-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '5616634434@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA["李佳芮"通过扫描你分享的二维码加入群聊  ]]></plain>\n\t\t<text><![CDATA["李佳芮"通过扫描你分享的二维码加入群聊  ]]></text>\n\t\t<link>\n\t\t\t<scene>qrcode</scene>\n\t\t\t<text><![CDATA[  撤销]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[qq512436430]]></username>\n\t\t\t</memberlist>\n\t\t\t<qrcode><![CDATA[http://weixin.qq.com/g/A7MgUgqtga7G9y03]]></qrcode>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    continue    : 1,
    description : '',
    from_user   : '5616634434@chatroom',
    msg_id      : '3244658260828188781',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10002,
    timestamp   : 1528830493,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['李佳芮'],
    inviterName     : YOU,
    roomId          : '5616634434@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() ZH-scan-qrcode-shared-by-other-when-bot-no-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '" 卓桓、Zhuohuan"通过扫描"李佳芮"分享的二维码加入群聊',
    continue    : 1,
    description : '',
    from_user   : '9967013206@chatroom',
    msg_id      : '2518372397480881089',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528830692,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['卓桓', 'Zhuohuan'],
    inviterName     : '李佳芮',
    roomId          : '9967013206@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() ZH-scan-qrcode-shared-by-other-when-bot-is-owner', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '" 卓桓、Zhuohuan"通过扫描"李佳芮"分享的二维码加入群聊',
    continue    : 1,
    description : '',
    from_user   : '5616634434@chatroom',
    msg_id      : '2301570706114768273',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1528830737,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }
  const EXPECTED_EVENT: PuppetRoomJoinEvent = {
    inviteeNameList : ['卓桓', 'Zhuohuan'],
    inviterName     : '李佳芮',
    roomId          : '5616634434@chatroom',
  }

  const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomJoinEventMessageParser() ZH-bot-invite-three', async t => {
  t.skip('tbw')
})

test('roomJoinEventMessageParser() ZH-room-create', async t => {
  t.skip('can not get create sys message, because room will not sync or appear before the creater send the first message')
})
