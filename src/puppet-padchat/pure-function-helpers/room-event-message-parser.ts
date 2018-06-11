import {
  PuppetRoomJoinEvent,
  PuppetRoomLeaveEvent,
  PuppetRoomTopicEvent,
}                         from '../../puppet/'

import {
  PadchatMessagePayload,
}                             from '../padchat-schemas'

import {
  isRoomId,
}               from './is-type'

export function roomJoinEventMessageParser(rawPayload: PadchatMessagePayload): null | PuppetRoomJoinEvent {
  const roomId = rawPayload.from_user
  if (!isRoomId(roomId)) {
    return null
  }

  const roomJoinEvent: PuppetRoomJoinEvent = {
    inviteeNameList : [''],
    inviterName     : '',
    roomId,
  }
  return roomJoinEvent
}

export function roomLeaveEventMessageParser(rawPayload: PadchatMessagePayload): null | PuppetRoomLeaveEvent {
  const roomId = rawPayload.from_user
  if (!isRoomId(roomId)) {
    return null
  }

  const roomLeaveEvent: PuppetRoomLeaveEvent = {
    leaverNameList : [''],
    removerName     : '',
    roomId,
  }
  return roomLeaveEvent
}

export function roomTopicEventMessageParser(rawPayload: PadchatMessagePayload): null | PuppetRoomTopicEvent {
  const roomId = rawPayload.from_user
  if (!isRoomId(roomId)) {
    return null
  }

  const roomTopicEvent: PuppetRoomTopicEvent = {
    changerName: '',
    topic: '',
    roomId,
  }
  return roomTopicEvent
}
