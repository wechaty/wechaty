// import { parseString }  from 'xml2js'
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

  const obj: XmlSchema = JSON.parse(toJson(tryXmlText))

  if (!obj.msg) {
    throw new Error('no msg found')
  }
  const padchatFriendshipPayload: PadchatFriendshipPayload = obj.msg
  // const padchatFriendshipPayload = await new Promise<PadchatFriendshipPayload>((resolve, reject) => {
  //   parseString(tryXmlText, { explicitArray: false }, (err, obj: XmlSchema) => {
  //     if (err) {  // HTML can not be parsed to JSON
  //       return reject(err)
  //     }
  //     if (!obj) {
  //       // FIXME: when will this happen?
  //       return reject(new Error('parseString() return empty obj'))
  //     }
  //     if (!obj.msg || !obj.msg.$) {
  //       return reject(new Error('parseString() return unknown obj'))
  //     }
  //     return resolve(obj.msg.$)
  //   })
  // })
  // console.log(padchatFriendshipPayload)

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
