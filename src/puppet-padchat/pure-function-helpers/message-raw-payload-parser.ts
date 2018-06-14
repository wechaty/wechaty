import { toJson } from 'xml2json'

import {
  MessagePayload,
  MessageType,
}                         from '../../puppet/'

import {
  PadchatMessagePayload,
  PadchatMessageType,
  PadchatContactPayload,
}                         from '../padchat-schemas'

import {
  isRoomId,
  isContactId,
}                         from './is-type'

export function messageRawPayloadParser(
  rawPayload: PadchatMessagePayload,
): MessagePayload {

  // console.log('messageRawPayloadParser:', rawPayload)

  /**
   * 0. Set Message Type
   */
  let type: MessageType

  switch (rawPayload.sub_type) {

    case PadchatMessageType.Text:
      type = MessageType.Text
      break

    case PadchatMessageType.Image:
      type = MessageType.Image
      // console.log(rawPayload)
      break

    case PadchatMessageType.Voice:
      type = MessageType.Audio
      // console.log(rawPayload)
      break

    case PadchatMessageType.Emoticon:
      type = MessageType.Emoticon
      // console.log(rawPayload)
      break

    case PadchatMessageType.App:
      type = MessageType.Attachment
      // console.log(rawPayload)
      break

    case PadchatMessageType.Video:
      type = MessageType.Video
      // console.log(rawPayload)
      break

    case PadchatMessageType.Sys:
      type = MessageType.Unknown
      break

    case PadchatMessageType.ShareCard:
      type = MessageType.Contact
      break

    case PadchatMessageType.Recalled:
    case PadchatMessageType.StatusNotify:
    case PadchatMessageType.SysNotice:
      type = MessageType.Unknown
      break

    default:
      throw new Error('unsupported type: ' + PadchatMessageType[rawPayload.sub_type] + '(' + rawPayload.sub_type + ')')
  }

  const payloadBase = {
    id        : rawPayload.msg_id,
    timestamp : rawPayload.timestamp,  // Padchat message timestamp is seconds
    type      : type,
  }

  let fromId: undefined | string = undefined
  let roomId: undefined | string = undefined
  let toId:   undefined | string = undefined

  let text:   undefined | string = undefined

  /**
   * 1. Set Room Id
   */
  if (isRoomId(rawPayload.from_user)) {
    roomId = rawPayload.from_user
  } else if (isRoomId(rawPayload.to_user)) {
    roomId = rawPayload.to_user
  } else {
    roomId = undefined
  }

  /**
   * 2. Set To Contact Id
   */
  if (isContactId(rawPayload.to_user)) {

    toId = rawPayload.to_user

  } else {
    // TODO: if the message @someone, the toId should set to the mentioned contact id(?)

    toId   = undefined

  }

  /**
   * 3. Set From Contact Id
   */
  if (isContactId(rawPayload.from_user)) {

    fromId = rawPayload.from_user

  } else {
    const parts = rawPayload.content.split(':\n')
    if (parts && parts.length > 1) {
      if (isContactId(parts[0])) {

      fromId = parts[0]

      }
    } else {

      fromId = undefined

    }
  }

  /**
   *
   * 4. Set Text
   */
  if (isRoomId(rawPayload.from_user)) {

    const parts = rawPayload.content.split(':\n')
    if (parts && parts.length > 1) {

      text = parts[1]

    } else {

      text = rawPayload.content

    }

  } else {

    text = rawPayload.content

  }

  /**
   * 5.1 Validate Room & From ID
   */
  if (!roomId && !fromId) {
    throw Error('empty roomId and empty fromId!')
  }
  /**
   * 5.1 Validate Room & To ID
   */
  if (!roomId && !toId) {
    throw Error('empty roomId and empty toId!')
  }

  /**
   * 6. Set Contact for ShareCard
   */
  if (type === MessageType.Contact) {
    interface XmlSchema {
      msg: {
        username: string,
        bigheadimgurl: string,
        nickname: string,
        province: string,
        city: string,
        sign: string,
        sex: number,
        antispamticket: string,
      },
      t: PadchatContactPayload,
    }
    const jsonPayload = JSON.parse(toJson(text)) as XmlSchema

    console.log('jsonPayload:', jsonPayload)
  }

  let payload: MessagePayload

  // Two branch is the same code.
  // Only for making TypeScript happy
  if (fromId && toId) {
    payload = {
      ...payloadBase,
      fromId,
      roomId,
      toId,
      text,
    }
  } else if (roomId) {
    payload = {
      ...payloadBase,
      fromId,
      roomId,
      toId,
      text,
    }
  } else {
    throw new Error('neither toId nor roomId')
  }

  return payload
}
