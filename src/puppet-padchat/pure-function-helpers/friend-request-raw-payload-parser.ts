import { parseString }  from 'xml2js'

import {
  FriendRequestPayload,
  FriendRequestType,
}                       from '../../puppet/'

import {
  PadchatMessagePayload,
  PadchatFriendRequestPayload,
}                                 from '../padchat-schemas'

export async function friendRequestRawPayloadParser(
  rawPayload: PadchatMessagePayload,
) : Promise<FriendRequestPayload> {

  let tryXmlText = rawPayload.content
  tryXmlText = tryXmlText.replace(/\+/g, ' ')

  interface XmlSchema {
    msg?: {
      $?: PadchatFriendRequestPayload,
    }
  }

  const padchatFriendRequestPayload = await new Promise<PadchatFriendRequestPayload>((resolve, reject) => {
    parseString(tryXmlText, { explicitArray: false }, (err, obj: XmlSchema) => {
      if (err) {  // HTML can not be parsed to JSON
        return reject(err)
      }
      if (!obj) {
        // FIXME: when will this happen?
        return reject(new Error('parseString() return empty obj'))
      }
      if (!obj.msg || !obj.msg.$) {
        return reject(new Error('parseString() return unknown obj'))
      }
      return resolve(obj.msg.$)
    })
  })

  // console.log(padchatFriendRequestPayload)

  const friendRequestPayload: FriendRequestPayload = {
    id        : rawPayload.msg_id,
    contactId : padchatFriendRequestPayload.fromusername,
    hello     : padchatFriendRequestPayload.content,
    stranger  : padchatFriendRequestPayload.encryptusername,
    ticket    : padchatFriendRequestPayload.ticket,
    type      : FriendRequestType.Receive,
  }

  return friendRequestPayload

  // switch (rawPayload.sub_type) {
  //   case PadchatMessageType.VerifyMsg:
  //     if (!rawPayload.RecommendInfo) {
  //       throw new Error('no RecommendInfo')
  //     }
  //     const recommendInfo: WebRecomendInfo = rawPayload.RecommendInfo

  //     if (!recommendInfo) {
  //       throw new Error('no recommendInfo')
  //     }

  //     const payloadReceive: FriendRequestPayloadReceive = {
  //       id        : rawPayload.MsgId,
  //       contactId : recommendInfo.UserName,
  //       hello     : recommendInfo.Content,
  //       ticket    : recommendInfo.Ticket,
  //       type      : FriendRequestType.Receive,
  //     }
  //     return payloadReceive

  //   case PadchatMessageType.Sys:
  //     const payloadConfirm: FriendRequestPayloadConfirm = {
  //       id        : rawPayload.MsgId,
  //       contactId : rawPayload.FromUserName,
  //       type      : FriendRequestType.Confirm,
  //     }
  //     return payloadConfirm

  //   default:
  //     throw new Error('not supported friend request message raw payload')
  // }
}
