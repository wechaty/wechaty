import {
  PuppetRoomJoinEvent,
  PuppetRoomLeaveEvent,
  PuppetRoomTopicEvent,
  YOU,
}                         from '../../puppet/'

import {
  PadchatMessagePayload,
}                             from '../padchat-schemas'

import {
  isRoomId,
}               from './is-type'

import { log }          from '../../config'

const REGEX_CONFIG = {
  roomJoinInvite: [
    /^"(.+?)"邀请"(.+)"加入了群聊$/,
    /^"(.+?)"邀请(.+?)加入了群聊，群聊参与人还有：/,
    /^(.+?) invited (.+?) to the group chat$/,
    /^(.+?) invited (.+?) to a group chat with $/,
    /^"(.+?)"邀请你和"(.+?)"加入了群聊$/,
  ],
  roomJoinInviteYou: [
    /^"(.+?)"邀请你和"(.+?)"加入了群聊$/,
  ],

  roomLeaveBotKickOther: [
    /^(You) removed "(.+)" from the group chat$/,
    /^(你)将"(.+)"移出了群聊$/,
  ],

  roomLeaveOtherKickMe: [
    /^(You) were removed from the group chat by "(.+)"$/,
    /^(你)被"(.+)"移出群聊$/,
  ],

  roomTopic: [
    /^"(.+?)" changed the group name to "(.+)"$/,
    /^"(.+?)"修改群名为“(.+)”$/,
    /^(You) changed the group name to "(.+)"$/,
    /^(你)修改群名为“(.+)”$/,
  ],
}

/**
 * try to find 'join' event for Room
 *
 * 1.
 *  李卓桓 invited Huan to the group chat
 *  李卓桓 invited 李佳芮, Huan to the group chat
 *  李卓桓 invited you to a group chat with
 *  李卓桓 invited you and Huan to the group chat
 * 2.
 *  "李卓桓"邀请"Huan LI++"加入了群聊
 *  李卓桓 invited 李佳芮, 李卓桓2 to the group chat
 *  "李佳芮"邀请你加入了群聊，群聊参与人还有：小桔、桔小秘、小小桔、wuli舞哩客服、舒米
 *  "李卓桓"邀请你和"Huan LI++"加入了群聊
 */
function parseRoomJoin(
  content: string,
): [string[], string] {
  log.verbose('PuppetPadchatFirer', 'parseRoomJoin(%s)', content)

  const reListInvite = REGEX_CONFIG.roomJoinInvite
  // TODO:
  // const reListQrcode = REGEX_CONFIG.roomJoinQrcode

  let foundInvite: string[]|null = []
  reListInvite.some(re => !!(foundInvite = content.match(re)))
  // TODO:
  // let foundQrcode: string[]|null = []
  // reListQrcode.some(re => !!(foundQrcode = content.match(re)))
  // if ((!foundInvite || !foundInvite.length) && (!foundQrcode || !foundQrcode.length)) {
  if ((!foundInvite || !foundInvite.length)) {
    throw new Error('parseRoomJoin() not found matched re of ' + content)
  }

  // const [inviterName, inviteeStr] = foundInvite ? [ foundInvite[1], foundInvite[2] ] : [ foundQrcode[2], foundQrcode[1] ]
  const [inviterName, inviteeStr] = [ foundInvite[1], foundInvite[2] ]

  /**
   * 李卓桓 invited you and Huan to the group chat
   */
  let inviteeNameList: string[] = []
  if (/^you and/.test(inviteeStr)) {
    inviteeNameList = inviteeStr.split(/ and /)
  } else {
    inviteeNameList = inviteeStr.split(/, /)
  }

  /**
   * "李卓桓"邀请你和"Huan LI++"加入了群聊
   */
  if (REGEX_CONFIG.roomJoinInviteYou[0].test(content)) {
    const invitee = inviteeNameList[0]
    inviteeNameList = ['你', invitee]
  }

  return [inviteeNameList, inviterName] // put invitee at first place
}

export function roomJoinEventMessageParser(rawPayload: PadchatMessagePayload): null | PuppetRoomJoinEvent {
  const roomId = rawPayload.from_user
  const content = rawPayload.content
  const [inviteeRawNameList, inviterName] = parseRoomJoin(content)
  const inviteeNameList: (string | YOU)[] = inviteeRawNameList
  if (!isRoomId(roomId)) {
    return null
  }

  if (inviteeNameList[0] === '你' || inviteeNameList[0] === 'you') {
    inviteeNameList[0] = YOU
  }
  const roomJoinEvent: PuppetRoomJoinEvent = {
    inviteeNameList : inviteeNameList,
    inviterName     : inviterName,
    roomId,
  }
  return roomJoinEvent
}

/**
 * try to find 'leave' event for Room
 *
 * 1.
 *  You removed "李卓桓" from the group chat
 *  You were removed from the group chat by "李卓桓"
 * 2.
 *  你将"Huan LI++"移出了群聊
 *  你被"李卓桓"移出群聊
 */
function parseRoomLeave(
  content: string,
): [string, string] {
  let matchIKickOther: null | string[] = []
  REGEX_CONFIG.roomLeaveBotKickOther.some(
    regex => !!(
      matchIKickOther = content.match(regex)
    ),
  )

  let matchOtherKickMe: null | string[] = []
  REGEX_CONFIG.roomLeaveOtherKickMe.some(
    re => !!(
      matchOtherKickMe = content.match(re)
    ),
  )

  let leaverName  : undefined | string
  let removerName : undefined | string

  if (matchIKickOther && matchIKickOther.length) {
    leaverName  = matchIKickOther[2]
    removerName = matchIKickOther[1]
  } else if (matchOtherKickMe && matchOtherKickMe.length) {
    leaverName  = matchOtherKickMe[1]
    removerName = matchOtherKickMe[2]
  } else {
    throw new Error('no match')
  }

  return [leaverName, removerName]
}

export function roomLeaveEventMessageParser(rawPayload: PadchatMessagePayload): null | PuppetRoomLeaveEvent {
  const roomId = rawPayload.from_user
  const content = rawPayload.content
  const [leaverRawName, removerRawName] = parseRoomLeave(content)
  let leaverName: string | YOU = leaverRawName
  let removerName: string | YOU = removerRawName
  if (!isRoomId(roomId)) {
    return null
  }

  if (leaverRawName === '你' || leaverRawName === 'You') {
    leaverName = YOU
  }

  if (removerRawName === '你' || removerRawName === 'You') {
    removerName = YOU
  }

  const roomLeaveEvent: PuppetRoomLeaveEvent = {
    leaverNameList  : [leaverName],
    removerName     : removerName,
    roomId,
  }
  return roomLeaveEvent
}

function parseRoomTopic(
  content: string,
): [string, string] {
  const reList = REGEX_CONFIG.roomTopic

  let found: string[]|null = []
  reList.some(re => !!(found = content.match(re)))
  if (!found || !found.length) {
    throw new Error('checkRoomTopic() not found')
  }
  const [, changer, topic] = found
  return [topic, changer]
}

export function roomTopicEventMessageParser(rawPayload: PadchatMessagePayload): null | PuppetRoomTopicEvent {
  const roomId = rawPayload.from_user
  const content = rawPayload.content
  const [topic, rawChangerName] = parseRoomTopic(content)
  let changerName: string | YOU = rawChangerName

  if (!isRoomId(roomId)) {
    return null
  }

  if (rawChangerName === '你' || rawChangerName === 'You') {
    changerName = YOU
  }

  const roomTopicEvent: PuppetRoomTopicEvent = {
    changerName: changerName,
    topic: topic,
    roomId,
  }
  return roomTopicEvent
}
