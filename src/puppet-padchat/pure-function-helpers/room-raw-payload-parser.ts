import {
  RoomPayload,
}                   from 'wechaty-puppet'

import {
  PadchatRoomPayload,
}                         from '../padchat-schemas'

export function roomRawPayloadParser(
  rawPayload: PadchatRoomPayload,
): RoomPayload {
  const payload: RoomPayload = {
    id           : rawPayload.user_name,
    topic        : rawPayload.nick_name,
    ownerId      : rawPayload.chatroom_owner,
    memberIdList : rawPayload.member || [],
  }

  return payload
}
