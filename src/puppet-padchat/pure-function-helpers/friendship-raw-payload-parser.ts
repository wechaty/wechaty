import { toJson } from 'xml2json'

import {
  FriendshipPayload,
  FriendshipType,
}                       from '../../puppet/'

import {
  PadchatMessagePayload,
  PadchatFriendshipPayload,
}                                 from '../padchat-schemas'

export async function friendshipRawPayloadParser(
  rawPayload: PadchatMessagePayload,
) : Promise<FriendshipPayload> {

  let tryXmlText = rawPayload.content
  tryXmlText = tryXmlText.replace(/\+/g, ' ')

  interface XmlSchema {
    msg?: PadchatFriendshipPayload,
  }

  const jsonPayload: XmlSchema = JSON.parse(toJson(tryXmlText))

  if (!jsonPayload.msg) {
    throw new Error('no msg found')
  }
  const padchatFriendshipPayload: PadchatFriendshipPayload = jsonPayload.msg

  const friendshipPayload: FriendshipPayload = {
    id        : rawPayload.msg_id,
    contactId : padchatFriendshipPayload.fromusername,
    hello     : padchatFriendshipPayload.content,
    stranger  : padchatFriendshipPayload.encryptusername,
    ticket    : padchatFriendshipPayload.ticket,
    type      : FriendshipType.Receive,
  }

  return friendshipPayload

  // switch (rawPayload.sub_type) {
  //   case PadchatMessageType.VerifyMsg:
  //     if (!rawPayload.RecommendInfo) {
  //       throw new Error('no RecommendInfo')
  //     }
  //     const recommendInfo: WebRecomendInfo = rawPayload.RecommendInfo

  //     if (!recommendInfo) {
  //       throw new Error('no recommendInfo')
  //     }

  //     const payloadReceive: FriendshipPayloadReceive = {
  //       id        : rawPayload.MsgId,
  //       contactId : recommendInfo.UserName,
  //       hello     : recommendInfo.Content,
  //       ticket    : recommendInfo.Ticket,
  //       type      : FriendshipType.Receive,
  //     }
  //     return payloadReceive

  //   case PadchatMessageType.Sys:
  //     const payloadConfirm: FriendshipPayloadConfirm = {
  //       id        : rawPayload.MsgId,
  //       contactId : rawPayload.FromUserName,
  //       type      : FriendshipType.Confirm,
  //     }
  //     return payloadConfirm

  //   default:
  //     throw new Error('not supported friend request message raw payload')
  // }
}
