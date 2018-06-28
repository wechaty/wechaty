import { toJson } from 'xml2json'

import {
  FriendshipPayload,
  FriendshipPayloadConfirm,
  FriendshipPayloadReceive,
  FriendshipPayloadVerify,
  FriendshipType,
}                       from 'wechaty-puppet'

import {
  PadchatMessagePayload,
  PadchatFriendshipPayload,
}                                 from '../padchat-schemas'

import {
  friendshipConfirmEventMessageParser,
  friendshipVerifyEventMessageParser,
  friendshipReceiveEventMessageParser,
}                                         from './friendship-event-message-parser'

export function friendshipRawPayloadParser(
  rawPayload: PadchatMessagePayload,
) : FriendshipPayload {

  if (friendshipConfirmEventMessageParser(rawPayload)) {
    /**
     * 1. Confirm Event
     */
    return friendshipRawPayloadParserConfirm(rawPayload)

  } else if (friendshipVerifyEventMessageParser(rawPayload)) {
    /**
     * 2. Verify Event
     */
    return friendshipRawPayloadParserVerify(rawPayload)

  } else if (friendshipReceiveEventMessageParser(rawPayload)) {
    /**
     * 3. Receive Event
     */
    return friendshipRawPayloadParserReceive(rawPayload)

  } else {
    throw new Error('event type is neither confirm nor verify, and not receive')
  }
}

function friendshipRawPayloadParserConfirm(
  rawPayload: PadchatMessagePayload,
): FriendshipPayload {
  const payload: FriendshipPayloadConfirm = {
    id        : rawPayload.msg_id,
    contactId : rawPayload.from_user,
    type      : FriendshipType.Confirm,
  }
  return payload
}

function friendshipRawPayloadParserVerify(
  rawPayload: PadchatMessagePayload,
): FriendshipPayload {
  const payload: FriendshipPayloadVerify = {
    id        : rawPayload.msg_id,
    contactId : rawPayload.from_user,
    type      : FriendshipType.Verify,
  }
  return payload
}

function friendshipRawPayloadParserReceive(
  rawPayload: PadchatMessagePayload,
) {
  const tryXmlText = rawPayload.content

  interface XmlSchema {
    msg?: PadchatFriendshipPayload,
  }

  const jsonPayload: XmlSchema = toJson(tryXmlText, { object: true })

  if (!jsonPayload.msg) {
    throw new Error('no msg found')
  }
  const padchatFriendshipPayload: PadchatFriendshipPayload = jsonPayload.msg

  const friendshipPayload: FriendshipPayloadReceive = {
    id        : rawPayload.msg_id,
    contactId : padchatFriendshipPayload.fromusername,
    hello     : padchatFriendshipPayload.content,
    stranger  : padchatFriendshipPayload.encryptusername,
    ticket    : padchatFriendshipPayload.ticket,
    type      : FriendshipType.Receive,
  }

  return friendshipPayload
}
