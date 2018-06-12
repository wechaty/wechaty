import { toJson } from 'xml2json'

import {
  PuppetRoomJoinEvent,
  PuppetRoomLeaveEvent,
  PuppetRoomTopicEvent,
  YOU,
}                         from '../../puppet/'

import {
  PadchatMessagePayload, PadchatMessageType,
}                             from '../padchat-schemas'

import {
  isPayload,
  isRoomId,
}               from './is-type'

/**
 *
 * 1. Room Join Event
 *
 *
 * try to find 'join' event for Room
 *
 * 1.
 *  李卓桓 invited Huan to the group chat
 *  李卓桓 invited 李佳芮, Huan to the group chat
 *  李卓桓 invited you to a group chat with
 *  李卓桓 invited you and Huan to the group chat
 * 2.
 *  "李卓桓"邀请"Huan LI++"加入了群聊
 *  "李佳芮"邀请你加入了群聊，群聊参与人还有：小桔、桔小秘、小小桔、wuli舞哩客服、舒米
 *  "李卓桓"邀请你和"Huan LI++"加入了群聊
 */

const ROOM_JOIN_BOT_INVITE_OTHER_REGEX_LIST_ZH = [
  /^你邀请"(.+)"加入了群聊/,
  /^"(.+)"通过扫描你分享的二维码加入群聊/,
]
const ROOM_JOIN_BOT_INVITE_OTHER_REGEX_LIST_EN = [
  /^You invited (.+) to the group chat/,
  /^"(.+)" joined group chat via the QR code you shared/,
]

////////////////////////////////////////////////////

const ROOM_JOIN_OTHER_INVITE_BOT_REGEX_LIST_ZH = [
  /^"([^"]+?)"邀请你加入了群聊/,
  /^"([^"]+?)"邀请你和"(.+)"加入了群聊/,
]

const ROOM_JOIN_OTHER_INVITE_BOT_REGEX_LIST_EN = [
  /^(.+) invited you to a group chat/,
  /^(.+) invited you and (.+) to the group chat/,
]

////////////////////////////////////////////////////

const ROOM_JOIN_OTHER_INVITE_OTHER_REGEX_LIST_ZH = [
  /^"(.+)"邀请"(.+)"加入了群聊/,

]

const ROOM_JOIN_OTHER_INVITE_OTHER_REGEX_LIST_EN = [
  /^(.+?) invited (.+?) to (the|a) group chat/,
]

export function roomJoinEventMessageParser(
  rawPayload: PadchatMessagePayload,
): null | PuppetRoomJoinEvent {

  if (!isPayload(rawPayload)) {
    return null
  }

  const roomId = rawPayload.from_user
  if (!isRoomId(roomId)) {
    return null
  }

  let content = rawPayload.content

  /**
   * when the message is a Recalled type, bot can undo the invitation
   */
  if (rawPayload.sub_type === PadchatMessageType.Recalled) {
    interface XmlSchema {
      plain: string,
    }
    const jsonPayload = toJson(content, { object: true }) as XmlSchema
    content = jsonPayload.plain
  }

  let matchesForBotInviteOtherEn   = null as null | string[]
  let matchesForOtherInviteBotEn   = null as null | string[]
  let matchesForOtherInviteOtherEn = null as null | string[]

  let matchesForBotInviteOtherZh   = null as null | string[]
  let matchesForOtherInviteBotZh   = null as null | string[]
  let matchesForOtherInviteOtherZh = null as null | string[]

  ROOM_JOIN_BOT_INVITE_OTHER_REGEX_LIST_EN.some(
    regex => !!(matchesForBotInviteOtherEn = content.match(regex)),
  )
  ROOM_JOIN_OTHER_INVITE_BOT_REGEX_LIST_EN.some(
    regex => !!(matchesForOtherInviteBotEn = content.match(regex)),
  )
  ROOM_JOIN_OTHER_INVITE_OTHER_REGEX_LIST_EN.some(
    regex => !!(matchesForOtherInviteOtherEn = content.match(regex)),
  )

  ROOM_JOIN_BOT_INVITE_OTHER_REGEX_LIST_ZH.some(
    regex => !!(matchesForBotInviteOtherZh = content.match(regex)),
  )
  ROOM_JOIN_OTHER_INVITE_BOT_REGEX_LIST_ZH.some(
    regex => !!(matchesForOtherInviteBotZh = content.match(regex)),
  )
  ROOM_JOIN_OTHER_INVITE_OTHER_REGEX_LIST_ZH.some(
    regex => !!(matchesForOtherInviteOtherZh = content.match(regex)),
  )

  const matchesForBotInviteOther   = matchesForBotInviteOtherEn   || matchesForBotInviteOtherZh
  const matchesForOtherInviteBot   = matchesForOtherInviteBotEn   || matchesForOtherInviteBotZh
  const matchesForOtherInviteOther = matchesForOtherInviteOtherEn || matchesForOtherInviteOtherZh

  const languageEn = matchesForBotInviteOtherEn || matchesForOtherInviteBotEn || matchesForOtherInviteOtherEn
  const languageZh = matchesForBotInviteOtherZh || matchesForOtherInviteBotZh || matchesForOtherInviteOtherZh

  const matches = matchesForBotInviteOther
                || matchesForOtherInviteBot
                || matchesForOtherInviteOther

  if (!matches) {
    return null
  }

  if (matchesForBotInviteOther) {
    const other = matches[1]

    let inviteeNameList
    if (languageEn) {
      inviteeNameList = splitEnglishNameList(other)
    } else if (languageZh) {
      inviteeNameList = splitChineseNameList(other)
    } else {
      throw new Error('make typescript happy')
    }

    const inviterName: string | YOU = YOU
    const joinEvent: PuppetRoomJoinEvent = {
      inviteeNameList,
      inviterName,
      roomId,
    }
    return joinEvent

  } else if (matchesForOtherInviteBot) {
    // /^"([^"]+?)"邀请你加入了群聊/,
    // /^"([^"]+?)"邀请你和"(.+?)"加入了群聊/,
    const inviterName = matches[1]
    let inviteeNameList: (YOU | string)[] = [YOU]
    if (matches[2]) {
      let nameList
      if (languageEn) {
        nameList = splitEnglishNameList(matches[2])
      } else if (languageZh) {
        nameList = splitChineseNameList(matches[2])
      } else {
        throw new Error('neither English nor Chinese')
      }
      inviteeNameList = inviteeNameList.concat(nameList)
    }

    const joinEvent: PuppetRoomJoinEvent = {
      inviteeNameList,
      inviterName,
      roomId,
    }
    return joinEvent

  } else if (matchesForOtherInviteOther) {
    // /^"([^"]+?)"邀请"([^"]+)"加入了群聊$/,
    // /^([^"]+?) invited ([^"]+?) to (the|a) group chat/,
    const inviterName = matches[1]

    let   inviteeNameList: string[]

    const other = matches[2]

    if (languageEn) {
      inviteeNameList = splitEnglishNameList(other)
    } else if (languageZh) {
      inviteeNameList = splitChineseNameList(other)
    } else {
      throw new Error('neither English nor Chinese')
    }

    const joinEvent: PuppetRoomJoinEvent = {
      inviteeNameList,
      inviterName,
      roomId,
    }
    return joinEvent

  } else {
    throw new Error('who invite who?')
  }
}

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

export function splitChineseNameList(nameListText: string): string[] {
  // 李卓桓、李佳芮、桔小秘
  return nameListText.split('、')
}

export function splitEnglishNameList(nameListText: string): string[] {
  // Zhuohuan, 太阁_传话助手, 桔小秘
  return nameListText.split(', ')
}
