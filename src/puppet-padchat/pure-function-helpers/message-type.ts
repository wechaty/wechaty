import {
  MessageType,
}                         from 'wechaty-puppet'

import {
  PadchatMessageType,
}                         from '../padchat-schemas'

export function messageType(
  rawType: PadchatMessageType,
): MessageType {
  let type: MessageType

  switch (rawType) {

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
      throw new Error('unsupported type: ' + PadchatMessageType[rawType] + '(' + rawType + ')')
  }

  return type
}
