import {
  PuppetRoomTopicEvent,
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
 * 3. Room Topic Event
 *
 */
const ROOM_TOPIC_OTHER_REGEX_LIST = [
  /^"(.+)" changed the group name to "(.+)"$/,
  /^"(.+)"修改群名为“(.+)”$/,
]

const ROOM_TOPIC_YOU_REGEX_LIST = [
  /^(You) changed the group name to "(.+)"$/,
  /^(你)修改群名为“(.+)”$/,
]

export function roomTopicEventMessageParser(
  rawPayload: PadchatMessagePayload,
): null | PuppetRoomTopicEvent {

  if (!isPayload(rawPayload)) {
    return null
  }

  const roomId  = rawPayload.from_user
  const content = rawPayload.content

  if (!isRoomId(roomId)) {
    return null
  }

  let matchesForOther:  null | string[] = []
  let matchesForYou:    null | string[] = []

  ROOM_TOPIC_OTHER_REGEX_LIST .some(regex => !!(matchesForOther = content.match(regex)))
  ROOM_TOPIC_YOU_REGEX_LIST   .some(regex => !!(matchesForYou   = content.match(regex)))

  const matches: (string | YOU)[] = matchesForOther || matchesForYou
  if (!matches) {
    return null
  }

  let   changerName = matches[1]
  const topic       = matches[2] as string

  if (matchesForYou && changerName === '你' || changerName === 'You') {
    changerName = YOU
  }

  const roomTopicEvent: PuppetRoomTopicEvent = {
    changerName,
    roomId,
    topic,
  }

  return roomTopicEvent
}
