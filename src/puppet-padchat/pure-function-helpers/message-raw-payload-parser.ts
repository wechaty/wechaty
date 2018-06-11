import {
  MessagePayload,
  MessageType,
}                         from '../../puppet/'

import {
  PadchatMessagePayload,
  PadchatMessageType,
}                         from '../padchat-schemas'

import { isRoomId }   from './is-type'

export function messageRawPayloadParser(
  rawPayload: PadchatMessagePayload,
): MessagePayload {

  // console.log('messageRawPayloadParser:', rawPayload)

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
    text      : rawPayload.content,
    // toId      : rawPayload.to_user,
    type      : type,
  }

  let fromId: undefined | string = undefined
  let roomId: undefined | string = undefined
  let toId:   undefined | string = undefined

  // Msg from room
  if (isRoomId(rawPayload.from_user)) {

    roomId = rawPayload.from_user

    const parts = rawPayload.content.split(':\n')
    if (parts.length > 1) {
      /**
       * there's from id in content.
       */
      // update fromId to actual sender instead of the room
      fromId = parts[0]
      // update the text to actual text of the message
      payloadBase.text = parts[1]

    }
    if (!roomId && !fromId) {
      throw Error('empty roomId and empty fromId!')
    }
  } else {
    fromId = rawPayload.from_user
  }

  // Msg to room
  if (isRoomId(rawPayload.to_user)) {
    roomId = rawPayload.to_user

    // TODO: if the message @someone, the toId should set to the mentioned contact id(?)
    toId   = undefined
  } else {
    toId = rawPayload.to_user
  }

  let payload: MessagePayload

  // Two branch is the same code.
  // Only for making TypeScript happy
  if (fromId && toId) {
    payload = {
      ...payloadBase,
      fromId,
      toId,
      roomId,
    }
  } else if (roomId) {
    payload = {
      ...payloadBase,
      fromId,
      toId,
      roomId,
    }
  } else {
    throw new Error('neither toId nor roomId')
  }

  return payload
}
