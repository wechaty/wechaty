#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  MessagePayload,
}                       from 'wechaty-puppet'

import {
  PadchatMessagePayload,
}                             from '../padchat-schemas'

import { messageRawPayloadParser } from './message-raw-payload-parser'

test('messageRawPayloadParser', async t => {

  t.skip('tbw')
  // t.test('text', async t => {
  //   const PADCHAT_MESSAGE_PAYLOAD_TEXT: PadchatMessagePayload = {
  //     content     : '1111',
  //     continue    : 1,
  //     description : 'c7259a70-212f-11e8-b67d-57995e2021bf : 1111',
  //     from_user   : 'qq512436430',
  //     msg_id      : '8394773793402534033',
  //     msg_source  : '<msgsource />\n',
  //     msg_type    : 5,
  //     status      : 1,
  //     sub_type    : 1,
  //     timestamp   : 1526958809,
  //     to_user     : 'wxid_zj2cahpwzgie12',
  //     uin         : 324216852,
  //   }
  //   const EXPECTED_MESSAGE_PAYLOAD_TEXT: MessagePayload = {
  //     //
  //   }
  // })

  // t.test('voice', async t => {
  //   const PADCHAT_MESSAGE_PAYLOAD_VOICE: PadchatMessagePayload = {
  //     // tslint:disable-next-line:max-line-length
  //     content     : '<msg><voicemsg endflag=\"1\" length=\"5095\" voicelength=\"2700\" clientmsgid=\"49c81578fd517c7679f143e8cf0be116wxid_zj2cahpwzgie12104_1526984920\" fromusername=\"qq512436430\" downcount=\"0\" cancelflag=\"0\" voiceformat=\"4\" forwardflag=\"0\" bufid=\"434549088970015139\" /></msg>',
  //     continue    : 1,
  //     // tslint:disable-next-line:max-line-length
  //     data        : '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',
  //     description : '李佳芮 : [语音]',
  //     from_user   : 'qq512436430',
  //     msg_id      : '8502371723610127059',
  //     msg_source  : '',
  //     msg_type    : 5,
  //     status      : 1,
  //     sub_type    : 34,
  //     timestamp   : 1526984922,
  //     to_user     : 'wxid_zj2cahpwzgie12',
  //     uin         : 324216852,
  //   }
  //   const EXPECTED_MESSAGE_PAYLOAD_VOICE: MessagePayload = {
  //     //
  //   }
  // })

})

test('sys', async t => {
  const PADCHAT_MESSAGE_PAYLOAD_SYS: PadchatMessagePayload = {
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
  const EXPECTED_MESSAGE_PAYLOAD_SYS: MessagePayload = {
    id        : '6633562959389269859',
    timestamp : 1528653783,
    fromId    : undefined,
    text      : '李卓桓 invited you to a group chat with ',
    type      : 0,
    toId      : 'wxid_5zj4i5htp9ih22',
    roomId    : '3453262102@chatroom',
  }

  const payload = messageRawPayloadParser(PADCHAT_MESSAGE_PAYLOAD_SYS)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_MESSAGE_PAYLOAD_SYS, 'should parse sys message payload')
})

test('status notify', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content:
    '<msg>\n<op id=\'2\'>\n<username>fanweixiao</username>\n</op>\n</msg>',
    continue    : 1,
    description : '',
    from_user   : 'lizhuohuan',
    msg_id      : '6102392425730186619',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 51,
    timestamp   : 1528658339,
    to_user     : 'fanweixiao',
    uin         : 4763975,
  }

  const EXPECTED_MESSAGE_PAYLOAD: MessagePayload = {
    id        : '6102392425730186619',
    timestamp : 1528658339,
    text      : '<msg>\n<op id=\'2\'>\n<username>fanweixiao</username>\n</op>\n</msg>',
    type      : 0,
    fromId    : 'lizhuohuan',
    toId      : 'fanweixiao',
    roomId    : undefined,
  }

  const payload = messageRawPayloadParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_MESSAGE_PAYLOAD, 'should parse status notify message payload')
})

test('room invitation created by bot', async t => {
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

  const EXPECTED_PAYLOAD: MessagePayload = {
    id        : '4030118997146183783',
    timestamp : 1528755135,
    text      : '<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain><![CDATA[You invited . 李 卓 桓 .呵呵 to the group chat.   ]]></plain>\n\t\t<text><![CDATA[You invited . 李 卓 桓 .呵呵 to the group chat.   ]]></text>\n\t\t<link>\n\t\t\t<scene>invite</scene>\n\t\t\t<text><![CDATA[  Revoke]]></text>\n\t\t\t<memberlist>\n\t\t\t\t<username><![CDATA[wxid_a8d806dzznm822]]></username>\n\t\t\t</memberlist>\n\t\t</link>\n\t</delchatroommember>\n</sysmsg>\n',
    type      : 0,
    fromId    : undefined,
    toId      : 'wxid_5zj4i5htp9ih22',
    roomId    : '3453262102@chatroom',
  }

  const payload = messageRawPayloadParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should parse room invitation message payload')
})

test('room ownership transfer message', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '你已成为新群主',
    continue    : 1,
    description : '',
    from_user   : '6350854677@chatroom',
    msg_id      : '3798725634572049107',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 10000,
    timestamp   : 1527689361,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }

  const EXPECTED_PAYLOAD: MessagePayload = {
    id        : '3798725634572049107',
    timestamp : 1527689361,
    text      : '你已成为新群主',
    type      : 0,
    fromId    : undefined,
    toId      : 'wxid_zj2cahpwzgie12',
    roomId    : '6350854677@chatroom',
  }

  const payload = messageRawPayloadParser(MESSAGE_PAYLOAD)
  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should parse ower transfer message')
})

test('StatusNotify to roomId', async t => {
  const MESSAGE_PAYLOAD = {
    content: '<msg>\n<op id=\'5\'>\n<username>5367653125@chatroom</username>\n</op>\n</msg>',
    continue: 1,
    description: '',
    from_user: 'wxid_5zj4i5htp9ih22',
    msg_id: '179056144527271247',
    msg_source: '',
    msg_type: 5,
    status: 1,
    sub_type: 51,
    timestamp: 1528920139,
    to_user: '5367653125@chatroom',
    uin: 1928023446,
  }
  const EXPECTED_PAYLOAD = {
    id        : '179056144527271247',
    timestamp : 1528920139,
    type      : 0,
    fromId    : 'wxid_5zj4i5htp9ih22',
    roomId    : '5367653125@chatroom',
    toId      : undefined,
    text      : '<msg>\n<op id=\'5\'>\n<username>5367653125@chatroom</username>\n</op>\n</msg>',
  }

  const payload = messageRawPayloadParser(MESSAGE_PAYLOAD)
  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should parse status notify message to room id')
})

test('share card peer to peer', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '<?xml version="1.0"?>\n<msg bigheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/27zgBIIcxGmtINOWjoXPZ7yIsvfuIzGepXbcWUFyUHSK2N8MA2x1VkTZLzk9iaQca6CtPR6ooUZWR52icTwnia51A/0" smallheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/27zgBIIcxGmtINOWjoXPZ7yIsvfuIzGepXbcWUFyUHSK2N8MA2x1VkTZLzk9iaQca6CtPR6ooUZWR52icTwnia51A/132" username="v1_cebe1d0a6ff469f5d1bc136ffd69929605f8e90cbefc2a42a81f53b3c90ee264@stranger" nickname="李佳芮" fullpy="李佳芮" shortpy="LJR" alias="" imagestatus="0" scene="17" province="北京" city="海淀" sign="" sex="2" certflag="0" certinfo="" brandIconUrl="" brandHomeUrl="" brandSubscriptConfigUrl="" brandFlags="0" regionCode="CN_Beijing_Haidian" antispamticket="v2_93b56e18c355bdbec761e459231b7e6ded4b0c4861a88f3ead9b2c89bce028fa56f345d8e7cf5479dc94a6e13b5b42ec@stranger" />\n',
    continue    : 1,
    description : '李卓桓 : [Contact Card] 李佳芮',
    from_user   : 'lizhuohuan',
    msg_id      : '5911987709823889005',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 42,
    timestamp   : 1528959169,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }
  const EXPECTED_PAYLOAD: MessagePayload = {
    id        : '5911987709823889005',
    timestamp : 1528959169,
    type      : 3,
    fromId    : 'lizhuohuan',
    roomId    : undefined,
    toId      : 'wxid_5zj4i5htp9ih22',
    text      : '<?xml version="1.0"?>\n<msg bigheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/27zgBIIcxGmtINOWjoXPZ7yIsvfuIzGepXbcWUFyUHSK2N8MA2x1VkTZLzk9iaQca6CtPR6ooUZWR52icTwnia51A/0" smallheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/27zgBIIcxGmtINOWjoXPZ7yIsvfuIzGepXbcWUFyUHSK2N8MA2x1VkTZLzk9iaQca6CtPR6ooUZWR52icTwnia51A/132" username="v1_cebe1d0a6ff469f5d1bc136ffd69929605f8e90cbefc2a42a81f53b3c90ee264@stranger" nickname="李佳芮" fullpy="李佳芮" shortpy="LJR" alias="" imagestatus="0" scene="17" province="北京" city="海淀" sign="" sex="2" certflag="0" certinfo="" brandIconUrl="" brandHomeUrl="" brandSubscriptConfigUrl="" brandFlags="0" regionCode="CN_Beijing_Haidian" antispamticket="v2_93b56e18c355bdbec761e459231b7e6ded4b0c4861a88f3ead9b2c89bce028fa56f345d8e7cf5479dc94a6e13b5b42ec@stranger" />\n',
  }

  const payload = messageRawPayloadParser(MESSAGE_PAYLOAD)
  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should parse share card message peer to peer')
})

test('share card in room', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : 'lizhuohuan:\n<?xml version="1.0"?>\n<msg bigheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/27zgBIIcxGmtINOWjoXPZ7yIsvfuIzGepXbcWUFyUHSK2N8MA2x1VkTZLzk9iaQca6CtPR6ooUZWR52icTwnia51A/0" smallheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/27zgBIIcxGmtINOWjoXPZ7yIsvfuIzGepXbcWUFyUHSK2N8MA2x1VkTZLzk9iaQca6CtPR6ooUZWR52icTwnia51A/132" username="v1_cebe1d0a6ff469f5d1bc136ffd69929605f8e90cbefc2a42a81f53b3c90ee264@stranger" nickname="李佳芮" fullpy="李佳芮" shortpy="LJR" alias="" imagestatus="0" scene="17" province="北京" city="海淀" sign="" sex="2" certflag="0" certinfo="" brandIconUrl="" brandHomeUrl="" brandSubscriptConfigUrl="" brandFlags="0" regionCode="CN_Beijing_Haidian" antispamticket="v2_93b56e18c355bdbec761e459231b7e6db1ed42e77e0315ea11fb27d92b0641b586bd45a67c9c282b7a6c17430f15c0c3@stranger" />\n',
    continue    : 1,
    description : '李卓桓 : [Contact Card] 李佳芮',
    from_user   : '3453262102@chatroom',
    msg_id      : '7332176666514216982',
    msg_source  : '<msgsource>\n\t<silence>0</silence>\n\t<membercount>3</membercount>\n</msgsource>\n',
    msg_type    : 5,
    status      : 1,
    sub_type    : 42,
    timestamp   : 1528961383,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }

  const EXPECTED_PAYLOAD: MessagePayload = {
    id        : '7332176666514216982',
    timestamp : 1528961383,
    type      : 3,
    fromId    : 'lizhuohuan',
    roomId    : '3453262102@chatroom',
    toId      : 'wxid_5zj4i5htp9ih22',
    text      : '<?xml version="1.0"?>\n<msg bigheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/27zgBIIcxGmtINOWjoXPZ7yIsvfuIzGepXbcWUFyUHSK2N8MA2x1VkTZLzk9iaQca6CtPR6ooUZWR52icTwnia51A/0" smallheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/27zgBIIcxGmtINOWjoXPZ7yIsvfuIzGepXbcWUFyUHSK2N8MA2x1VkTZLzk9iaQca6CtPR6ooUZWR52icTwnia51A/132" username="v1_cebe1d0a6ff469f5d1bc136ffd69929605f8e90cbefc2a42a81f53b3c90ee264@stranger" nickname="李佳芮" fullpy="李佳芮" shortpy="LJR" alias="" imagestatus="0" scene="17" province="北京" city="海淀" sign="" sex="2" certflag="0" certinfo="" brandIconUrl="" brandHomeUrl="" brandSubscriptConfigUrl="" brandFlags="0" regionCode="CN_Beijing_Haidian" antispamticket="v2_93b56e18c355bdbec761e459231b7e6db1ed42e77e0315ea11fb27d92b0641b586bd45a67c9c282b7a6c17430f15c0c3@stranger" />\n',
  }

  const payload = messageRawPayloadParser(MESSAGE_PAYLOAD)
  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should parse share card message peer to peer')
})

test.skip('attachment file with ext .xlsx', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '<msg><appmsg appid="" sdkver="0"><title>面试--运营助理.xlsx</title><des></des><action></action><type>6</type><showtype>0</showtype><mediatagname></mediatagname><messageaction></messageaction><content></content><url></url><lowurl></lowurl><dataurl></dataurl><lowdataurl></lowdataurl><appattach><totallen>29001</totallen><attachid>@cdn_304f0201000448304602010002040592f70202033d0af802046631feb602045b235b5f0421777869645f7a6a3263616870777a67696531323136365f313532393034333830370204010400050201000400_abee7526f03e4d598aee3f36a9f6cf87_1</attachid><emoticonmd5></emoticonmd5><fileext>xlsx</fileext><cdnattachurl>304f0201000448304602010002040592f70202033d0af802046631feb602045b235b5f0421777869645f7a6a3263616870777a67696531323136365f313532393034333830370204010400050201000400</cdnattachurl><aeskey>abee7526f03e4d598aee3f36a9f6cf87</aeskey><encryver>0</encryver></appattach><extinfo></extinfo><sourceusername></sourceusername><sourcedisplayname></sourcedisplayname><commenturl></commenturl><thumburl></thumburl><md5>73dd2e7c3ec58bbae471dc2d6374578a</md5></appmsg><fromusername>qq512436430</fromusername><scene>0</scene><appinfo><version>1</version><appname></appname></appinfo><commenturl></commenturl></msg>',
    continue    : 1,
    description : 'wechaty-alias : [文件]面试--运营助理.xlsx',
    from_user   : 'qq512436430',
    msg_id      : '7844942963127630689',
    msg_source  : '<msgsource />\n',
    msg_type    : 5,
    status      : 1,
    sub_type    : 49,
    timestamp   : 1529043807,
    to_user     : 'wxid_zj2cahpwzgie12',
    uin         : 324216852,
  }

  const EXPECTED_PAYLOAD: MessagePayload = {
    //
  } as any

  const payload = messageRawPayloadParser(MESSAGE_PAYLOAD)
  console.log(payload)

  const { toJson } = require('xml2json')
  console.log(JSON.parse(toJson(payload.text)))

  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should parse share card message peer to peer')
})
