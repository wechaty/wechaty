#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  FriendshipPayload,
  FriendshipType,
}                       from 'wechaty-puppet'

import {
  PadchatMessagePayload,
}                             from '../padchat-schemas'

import { padchatDecode } from './padchat-decode'

import { friendshipRawPayloadParser } from './friendship-raw-payload-parser'

test('friendshipRawPayloadParser()', async t => {
  const DATA = '%5B%7B%22content%22%3A%22%3Cmsg+fromusername%3D%5C%22lizhuohuan%5C%22+encryptusername%3D%5C%22v1_cf269def9b946093f9d131a5e733ba169351013c95e46a860cddecaf485c4b10%40stranger%5C%22+fromnickname%3D%5C%22%E6%9D%8E%E5%8D%93%E6%A1%93%5C%22+content%3D%5C%22xixixi%5C%22+fullpy%3D%5C%22lizhuohuan%5C%22+shortpy%3D%5C%22LZH%5C%22+imagestatus%3D%5C%223%5C%22+scene%3D%5C%226%5C%22+country%3D%5C%22CN%5C%22+province%3D%5C%22Beijing%5C%22+city%3D%5C%22Haidian%5C%22+sign%3D%5C%22PreAngel%E6%8A%95%E8%B5%84%E4%BA%BA%E3%80%82%E6%B0%B4%E6%9C%A8%E6%B8%85%E5%8D%8EBBS%E7%AB%99%E9%95%BF%E3%80%82%E6%8A%95%E8%B5%84%E4%BA%BA%E4%B8%AD%E6%9C%80%E4%BC%9A%E9%A3%9E%E7%9A%84AI%E7%A8%8B%E5%BA%8F%E5%91%98%E3%80%82%5C%22+percard%3D%5C%221%5C%22+sex%3D%5C%221%5C%22+alias%3D%5C%22%5C%22+weibo%3D%5C%22%5C%22+weibonickname%3D%5C%22%5C%22+albumflag%3D%5C%220%5C%22+albumstyle%3D%5C%220%5C%22+albumbgimgid%3D%5C%22913943270785024_913943270785024%5C%22+snsflag%3D%5C%22177%5C%22+snsbgimgid%3D%5C%22http%3A%2F%2Fshmmsns.qpic.cn%2Fmmsns%2FNoFChqEQomEyhyNjzExH3v78BHSVmIzHBIdOECg9jgcTpRNwThgXJicCsGicI6Kib4xLETc2PuKwhM%2F0%5C%22+snsbgobjectid%3D%5C%2212683064081608282338%5C%22+mhash%3D%5C%22d98b28f4cb1708bb584f3e66078e0a0d%5C%22+mfullhash%3D%5C%22d98b28f4cb1708bb584f3e66078e0a0d%5C%22+bigheadimgurl%3D%5C%22http%3A%2F%2Fwx.qlogo.cn%2Fmmhead%2Fver_1%2FciaaFRTCqfHIKLY0wBjv3h0LSPkCEEcJ0fo6kQkMxQLBiahJWFk7rS9G4VLU5n9OfAnXWlMaIV01oeTITYS0OHlg%2F0%5C%22+smallheadimgurl%3D%5C%22http%3A%2F%2Fwx.qlogo.cn%2Fmmhead%2Fver_1%2FciaaFRTCqfHIKLY0wBjv3h0LSPkCEEcJ0fo6kQkMxQLBiahJWFk7rS9G4VLU5n9OfAnXWlMaIV01oeTITYS0OHlg%2F96%5C%22+ticket%3D%5C%22v2_1a0d2cf325e64b6f74bed09e944529e7cc7a7580cb323475050664566dd0302d89b8e2ed95b596b459cf762d94a0ce606da39babbae0dc26b18a62e079bfc120%40stranger%5C%22+opcode%3D%5C%222%5C%22+googlecontact%3D%5C%22%5C%22+qrticket%3D%5C%22%5C%22+chatroomusername%3D%5C%22%5C%22+sourceusername%3D%5C%22%5C%22+sourcenickname%3D%5C%22%5C%22%3E%3Cbrandlist+count%3D%5C%220%5C%22+ver%3D%5C%22652101432%5C%22%3E%3C%2Fbrandlist%3E%3C%2Fmsg%3E%22%2C%22continue%22%3A1%2C%22description%22%3A%22%22%2C%22from_user%22%3A%22fmessage%22%2C%22msg_id%22%3A%222957327798149218888%22%2C%22msg_source%22%3A%22%22%2C%22msg_type%22%3A5%2C%22status%22%3A1%2C%22sub_type%22%3A37%2C%22timestamp%22%3A1528557626%2C%22to_user%22%3A%22wxid_5zj4i5htp9ih22%22%2C%22uin%22%3A1928023446%7D%5D%0A'

  const TENCENT_PAYLOAD_LIST: PadchatMessagePayload[] = padchatDecode(DATA)
  const PADCHAT_MESSAGE_PAYLOAD = TENCENT_PAYLOAD_LIST[0]
  const EXPECTED_FRIEND_REQUEST_PAYLOAD = {
    id        : '2957327798149218888',
    contactId : 'lizhuohuan',
    hello     : 'xixixi',
    stranger  : 'v1_cf269def9b946093f9d131a5e733ba169351013c95e46a860cddecaf485c4b10@stranger',
    ticket    : 'v2_1a0d2cf325e64b6f74bed09e944529e7cc7a7580cb323475050664566dd0302d89b8e2ed95b596b459cf762d94a0ce606da39babbae0dc26b18a62e079bfc120@stranger',
    type      : FriendshipType.Receive,
  }

  // console.log(PADCHAT_MESSAGE_PAYLOAD)

  const friendshipPayload: FriendshipPayload = await friendshipRawPayloadParser(PADCHAT_MESSAGE_PAYLOAD)
  // console.log(friendshipPayload)

  t.deepEqual(friendshipPayload, EXPECTED_FRIEND_REQUEST_PAYLOAD, 'should parse friendshipPayload right')
})
