#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import {
  PuppetRoomJoinEvent,
  YOU,
}                               from '../../puppet/'

import {
  PadchatMessagePayload,
}                                 from '../padchat-schemas'

import { roomJoinEventMessageParser }  from './room-event-message-parser'

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
  console.log('payload:', event)
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

test('roomJoinEventMessageParser() ZH-other-invite-bot-with-others', async t => {
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

// test('roomJoinEventMessageParser() ZH-bot-invite-other', async t => {
//   const MESSAGE_PAYLOAD: PadchatMessagePayload = {
//     content     : '5354656522@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA[你邀请"Huan LI++"加入了群聊  ]]></plain>\n\t\t<text><![CDATA[你邀请"Huan LI++"加入了群聊  ]]></text>\n\t\t<link>\n\t\t\t<scene>invite</scene>\n\t\t\t<text><![CDATA[  撤销]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[wxid_5zj4i5htp9ih22]]></username>\n\t\t\t</memberlist>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
//     continue    : 1,
//     description : '',
//     from_user   : '5354656522@chatroom',
//     msg_id      : '6278175026243694414',
//     msg_source  : '',
//     msg_type    : 5,
//     status      : 1,
//     sub_type    : 10002,
//     timestamp   : 1528657265,
//     to_user     : 'lizhuohuan',
//     uin         : 4763975,
//   }
//   const EXPECTED_EVENT: PuppetRoomJoinEvent = {
//     inviteeNameList : ['Huan LI++'],
//     inviterName     : YOU,
//     roomId          : '5354656522@chatroom',
//   }

//   const event = roomJoinEventMessageParser(MESSAGE_PAYLOAD)
//   t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
// })

test('roomJoinEventMessageParser() ZH-bot-invite-others', async t => {
  t.skip('tbw')
})

test('roomJoinEventMessageParser() ZH-room-create', async t => {
  t.skip('can not get create sys message, because room will not sync or appear before the creater send the first message')
})
