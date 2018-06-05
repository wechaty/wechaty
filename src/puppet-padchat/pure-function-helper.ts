/**
 *
 * Pure Function Helpers
 *
 * See: What's Pure Function Programming
 *  [Functional Programming Concepts: Pure Functions](https://hackernoon.com/functional-programming-concepts-pure-functions-cafa2983f757)
 *  [What Are Pure Functions And Why Use Them?](https://medium.com/@jamesjefferyuk/javascript-what-are-pure-functions-4d4d5392d49c)
 *  [Master the JavaScript Interview: What is a Pure Function?](https://medium.com/javascript-scene/master-the-javascript-interview-what-is-a-pure-function-d1c076bec976)
 *
 */

import {
  ContactPayload,
  ContactType,

  MessagePayload,
  MessageType,

  RoomPayload,

  FriendRequestPayload,
}                       from '../puppet/'

import {
  PadchatContactPayload,
  PadchatMessagePayload,
  // PadchatContactMsgType,

  // PadchatMessageStatus,
  PadchatMessageType,

  PadchatRoomPayload,
  PadchatRoomMember,
}                             from './padchat-schemas'

export class PadchatPureFunctionHelper {
  private constructor() {
    throw new Error('should not be instanciated. use static methods only.')
  }

  public static isRoomId(id?: string): boolean {
    if (!id) {
      throw new Error('no id')
    }
    return /@chatroom$/.test(id)
  }

  public static isContactId(id?: string): boolean {
    if (!id) {
      throw new Error('no id')
    }
    return !this.isRoomId(id)
  }

  public static isContactOfficialId(id?: string): boolean {
    if (!id) {
      throw new Error('no id')
    }
    return /^gh_/i.test(id)
  }

  public static isStrangerV1(strangerId?: string): boolean {
    if (!strangerId) {
      throw new Error('no id')
    }
    return /^v1_/i.test(strangerId)
  }

  public static isStrangerV2(strangerId?: string): boolean {
    if (!strangerId) {
      throw new Error('no id')
    }
    return /^v2_/i.test(strangerId)
  }

  public static contactRawPayloadParser(
    rawPayload: PadchatContactPayload,
  ): ContactPayload {
    if (!rawPayload.user_name) {
      throw Error('cannot get user_name(wxid)!')
    }

    if (this.isRoomId(rawPayload.user_name)) {
      throw Error('Room Object instead of Contact!')
    }

    let contactType = ContactType.Unknown
    if (this.isContactOfficialId(rawPayload.user_name)) {
      contactType = ContactType.Official
    } else {
      contactType = ContactType.Personal
    }

    const payload: ContactPayload = {
      id        : rawPayload.user_name,
      gender    : rawPayload.sex,
      type      : contactType,
      alias     : rawPayload.remark,
      avatar    : rawPayload.big_head,
      city      : rawPayload.city,
      name      : rawPayload.nick_name,
      province  : rawPayload.provincia,
      signature : (rawPayload.signature).replace('+', ' '),   // Stay+Foolish
    }

    return payload
  }

  public static messageRawPayloadParser(
    rawPayload: PadchatMessagePayload,
  ): MessagePayload {

    let type: MessageType

    switch (rawPayload.sub_type) {

      case PadchatMessageType.Sys:  // fall down
      case PadchatMessageType.Text:
        type = MessageType.Text
        break

      case PadchatMessageType.Image:
        type = MessageType.Image
        break

      case PadchatMessageType.Voice:
        type = MessageType.Audio
        break

      case PadchatMessageType.Emoticon:
        type = MessageType.Emoticon
        break

      case PadchatMessageType.App:
        type = MessageType.Attachment
        break

      case PadchatMessageType.Video:
        type = MessageType.Video
        break

      default:
        throw new Error('unsupported type')
    }

    const payloadBase = {
      id        : rawPayload.msg_id,
      timestamp : Date.now(),
      fromId    : rawPayload.from_user,
      text      : rawPayload.content,
      // toId      : rawPayload.to_user,
      type      : type,
    }

    let roomId: undefined | string = undefined
    let toId:   undefined | string = undefined

    // Msg from room
    if (this.isRoomId(rawPayload.from_user)) {
      // update fromId to actual sender instead of the room
      payloadBase.fromId = rawPayload.content.split(':\n')[0]
      // update the text to actual text of the message
      payloadBase.text = rawPayload.content.split(':\n')[1]

      roomId = rawPayload.from_user

      if (!roomId || !payloadBase.fromId) {
        throw Error('empty roomId or empty contactId!')
      }
    }

    // Msg to room
    if (this.isRoomId(rawPayload.to_user)) {
      roomId = rawPayload.to_user

      // TODO: if the message @someone, the toId should set to the mentioned contact id(?)
      toId   = undefined
    } else {
      toId = rawPayload.to_user
    }

    let payload: MessagePayload

    // Two branch is the same code.
    // Only for making TypeScript happy
    if (toId) {
      payload = {
        ...payloadBase,
        toId,
        roomId,
      }
    } else if (roomId) {
      payload = {
        ...payloadBase,
        toId,
        roomId,
      }
    } else {
      throw new Error('neither toId nor roomId')
    }

    return payload
  }

  public static roomRawPayloadParser(
    rawPayload        : PadchatRoomPayload,
    roomRawMemberList : PadchatRoomMember[],
  ): RoomPayload {
    const aliasDict = {} as { [id: string]: string | undefined }

    if (Array.isArray(roomRawMemberList)) {
      roomRawMemberList.forEach(
        rawMember => {
          aliasDict[rawMember.user_name] = rawMember.chatroom_nick_name
        },
      )
    }

    const memberIdList = roomRawMemberList.map(m => m.user_name)

    const payload: RoomPayload = {
      id           : rawPayload.user_name,
      topic        : rawPayload.nick_name,
      memberIdList,
      aliasDict,
    }

    return payload
  }

  public static friendRequestRawPayloadParser(
    rawPayload: any,
  ) : FriendRequestPayload {
    // to do:
    throw new Error('todo' + rawPayload)

    // switch (rawPayload.MsgType) {
    //   case WebMessageType.VERIFYMSG:
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

    //   case WebMessageType.SYS:
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
}

export default PadchatPureFunctionHelper
