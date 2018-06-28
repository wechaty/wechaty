import {
  PuppetRoomLeaveEvent,
  YOU,
}                         from 'wechaty-puppet'

import {
  PadchatMessagePayload,
}                         from '../padchat-schemas'

import {
  isPayload,
  isRoomId,
}               from './is-type'

/**
 *
 * 2. Room Leave Event
 *
 *
 * try to find 'leave' event for Room
 *
 * 1.
 *  You removed "李卓桓" from the group chat
 *  You were removed from the group chat by "李卓桓"
 * 2.
 *  你将"Huan LI++"移出了群聊
 *  你被"李卓桓"移出群聊
 */

const ROOM_LEAVE_OTHER_REGEX_LIST = [
  /^(You) removed "(.+)" from the group chat/,
  /^(你)将"(.+)"移出了群聊/,
]

const ROOM_LEAVE_BOT_REGEX_LIST = [
  /^(You) were removed from the group chat by "([^"]+)"/,
  /^(你)被"([^"]+?)"移出群聊/,
]

export function roomLeaveEventMessageParser(
  rawPayload: PadchatMessagePayload,
): null | PuppetRoomLeaveEvent {

  if (!isPayload(rawPayload)) {
    return null
  }

  const roomId  = rawPayload.from_user
  const content = rawPayload.content

  if (!isRoomId(roomId)) {
    return null
  }

  let matchesForOther: null | string[] = []
  ROOM_LEAVE_OTHER_REGEX_LIST.some(
    regex => !!(
      matchesForOther = content.match(regex)
    ),
  )

  let matchesForBot: null | string[] = []
  ROOM_LEAVE_BOT_REGEX_LIST.some(
    re => !!(
      matchesForBot = content.match(re)
    ),
  )

  const matches = matchesForOther || matchesForBot
  if (!matches) {
    return null
  }

  let leaverName  : undefined | string | YOU
  let removerName : undefined | string | YOU

  if (matchesForOther) {
    removerName = YOU
    leaverName  = matchesForOther[2]
  } else if (matchesForBot) {
    removerName = matchesForBot[2]
    leaverName  = YOU
  } else {
    throw new Error('for typescript type checking, will never go here')
  }

  const roomLeaveEvent: PuppetRoomLeaveEvent = {
    leaverNameList  : [leaverName],
    removerName     : removerName,
    roomId,
  }
  return roomLeaveEvent
}
