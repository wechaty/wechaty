#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadchatMessagePayload,
}                             from '../padchat-schemas'

import { friendshipReceiveEventMessageParser } from './friendship-event-message-parser'

test('friendshipReceiveEventMessageParser()', async t => {
  const MESSAGE_PAYLOAD: PadchatMessagePayload = {
    content     : '<msg fromusername="lizhuohuan" encryptusername="v1_cf269def9b946093f9d131a5e733ba169351013c95e46a860cddecaf485c4b10@stranger" fromnickname="李卓桓" content="xxxxx" fullpy="lizhuohuan" shortpy="LZH" imagestatus="3" scene="6" country="CN" province="Beijing" city="Haidian" sign="PreAngel投资人。水木清华BBS站长。投资人中最会飞的AI程序员。" percard="1" sex="1" alias="" weibo="" weibonickname="" albumflag="0" albumstyle="0" albumbgimgid="913943270785024_913943270785024" snsflag="177" snsbgimgid="http://shmmsns.qpic.cn/mmsns/NoFChqEQomEyhyNjzExH3v78BHSVmIzHBIdOECg9jgcTpRNwThgXJicCsGicI6Kib4xLETc2PuKwhM/0" snsbgobjectid="12683064081608282338" mhash="d98b28f4cb1708bb584f3e66078e0a0d" mfullhash="d98b28f4cb1708bb584f3e66078e0a0d" bigheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/ciaaFRTCqfHIKLY0wBjv3h0LSPkCEEcJ0fo6kQkMxQLBiahJWFk7rS9G4VLU5n9OfAnXWlMaIV01oeTITYS0OHlg/0" smallheadimgurl="http://wx.qlogo.cn/mmhead/ver_1/ciaaFRTCqfHIKLY0wBjv3h0LSPkCEEcJ0fo6kQkMxQLBiahJWFk7rS9G4VLU5n9OfAnXWlMaIV01oeTITYS0OHlg/96" ticket="v2_1a0d2cf325e64b6f74bed09e944529e737463bf02371b86dd43b437342699179687b3467c4f1f0406fc5c8dbe725c037313bb8dca856ab0de85f433b43818860@stranger" opcode="2" googlecontact="" qrticket="" chatroomusername="" sourceusername="" sourcenickname=""><brandlist count="0" ver="652101899"></brandlist></msg>',
    continue    : 1,
    description : '',
    from_user   : 'fmessage',
    msg_id      : '1323100839738523833',
    msg_source  : '',
    msg_type    : 5,
    status      : 1,
    sub_type    : 37,
    timestamp   : 1528786566,
    to_user     : 'wxid_5zj4i5htp9ih22',
    uin         : 1928023446,
  }

  const EXPECTED_CONTACT_ID = 'lizhuohuan'

  const contactName = friendshipReceiveEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to receive contact id')
})
