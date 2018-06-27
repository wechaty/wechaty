import {
  WebMessageRawPayload,
}                         from '../web-schemas'

import {
  MessageType,
}                 from 'wechaty-puppet'
import {
  isRoomId,
}                 from './is-type'

import {
  messageFilename,
}                 from './message-filename'
import {
  webMessageType,
}                 from './web-message-type'

import {
  MessagePayload,
}                         from 'wechaty-puppet'

export function messageRawPayloadParser(
  rawPayload: WebMessageRawPayload,
): MessagePayload {
  const id                           = rawPayload.MsgId
  const fromId                       = rawPayload.MMActualSender               // MMPeerUserName
  const text: string                 = rawPayload.MMActualContent              // Content has @id prefix added by wx
  const timestamp: number            = rawPayload.MMDisplayTime                // Javascript timestamp of milliseconds
  const msgFileName: undefined | string = messageFilename(rawPayload) || undefined

  let roomId : undefined | string
  let toId   : undefined | string

  // FIXME: has there any better method to know the room ID?
  if (rawPayload.MMIsChatRoom) {
    if (isRoomId(rawPayload.FromUserName)) {
      roomId = rawPayload.FromUserName // MMPeerUserName always eq FromUserName ?
    } else if (isRoomId(rawPayload.ToUserName)) {
      roomId = rawPayload.ToUserName
    } else {
      throw new Error('parse found a room message, but neither FromUserName nor ToUserName is a room(/^@@/)')
    }

    // console.log('rawPayload.FromUserName: ', rawPayload.FromUserName)
    // console.log('rawPayload.ToUserName: ', rawPayload.ToUserName)
    // console.log('rawPayload.MMPeerUserName: ', rawPayload.MMPeerUserName)
  }

  if (rawPayload.ToUserName) {
    if (!isRoomId(rawPayload.ToUserName)) { // if a message in room without any specific receiver, then it will set to be `undefined`
      toId = rawPayload.ToUserName
    }
  }

  const type: MessageType = webMessageType(rawPayload.MsgType)

  const payloadBase = {
    id,
    type,
    fromId,
    filename: msgFileName,
    text,
    timestamp,
  }

  let payload: MessagePayload

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
    throw new Error('neither roomId nor toId')
  }

  return payload
}
