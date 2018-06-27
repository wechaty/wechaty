import { toJson } from 'xml2json'

import {
  PuppetRoomJoinEvent,
  YOU,
}                         from 'wechaty-puppet'

import {
  PadchatMessagePayload,
  PadchatMessageType,
}                         from '../padchat-schemas'

import {
  isPayload,
  isRoomId,
}               from './is-type'

import {
  splitChineseNameList,
  splitEnglishNameList,
}                         from './split-name'

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
  /^" ?(.+)"通过扫描你分享的二维码加入群聊/,
]

const ROOM_JOIN_BOT_INVITE_OTHER_REGEX_LIST_EN = [
  /^You invited (.+) to the group chat/,
  /^" ?(.+)" joined group chat via the QR code you shared/,
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

////////////////////////////////////////////////////

const ROOM_JOIN_OTHER_INVITE_OTHER_QRCODE_REGEX_LIST_ZH = [
  /^" (.+)"通过扫描"(.+)"分享的二维码加入群聊/,
]

const ROOM_JOIN_OTHER_INVITE_OTHER_QRCODE_REGEX_LIST_EN = [
  /^"(.+)" joined the group chat via the QR Code shared by "(.+)"/,
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
    /**
     * content:
     * ```
     * 3453262102@chatroom:
     * <sysmsg type="delchatroommember">
     *   ...
     * </sysmsg>
     * ```
     */
    const tryXmlText = content.replace(/^[^\n]+\n/, '')
    interface XmlSchema {
      sysmsg: {
        type: 'revokemsg' | 'delchatroommember',
        delchatroommember?: {
          plain : string,
          text  : string,
        },
        revokemsg?: {
          replacemsg : string,
          msgid      : string,
          newmsgid   : string,
          session    : string,
        },
      }
    }
    const jsonPayload = toJson(tryXmlText, { object: true }) as XmlSchema
    try {
      if (jsonPayload.sysmsg.type === 'delchatroommember') {
        content = jsonPayload.sysmsg.delchatroommember!.plain
      } else if (jsonPayload.sysmsg.type === 'revokemsg') {
        content = jsonPayload.sysmsg.revokemsg!.replacemsg
      } else {
        throw new Error('unknown jsonPayload sysmsg type: ' + jsonPayload.sysmsg.type)
      }
    } catch (e) {
      console.error(e)
      console.log('jsonPayload:', jsonPayload)
      throw e
    }
  }

  let matchesForBotInviteOtherEn         = null as null | string[]
  let matchesForOtherInviteBotEn         = null as null | string[]
  let matchesForOtherInviteOtherEn       = null as null | string[]
  let matchesForOtherInviteOtherQrcodeEn = null as null | string[]

  let matchesForBotInviteOtherZh         = null as null | string[]
  let matchesForOtherInviteBotZh         = null as null | string[]
  let matchesForOtherInviteOtherZh       = null as null | string[]
  let matchesForOtherInviteOtherQrcodeZh = null as null | string[]

  ROOM_JOIN_BOT_INVITE_OTHER_REGEX_LIST_EN.some(
    regex => !!(matchesForBotInviteOtherEn = content.match(regex)),
  )
  ROOM_JOIN_OTHER_INVITE_BOT_REGEX_LIST_EN.some(
    regex => !!(matchesForOtherInviteBotEn = content.match(regex)),
  )
  ROOM_JOIN_OTHER_INVITE_OTHER_REGEX_LIST_EN.some(
    regex => !!(matchesForOtherInviteOtherEn = content.match(regex)),
  )
  ROOM_JOIN_OTHER_INVITE_OTHER_QRCODE_REGEX_LIST_EN.some(
    regex => !!(matchesForOtherInviteOtherQrcodeEn = content.match(regex)),
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
  ROOM_JOIN_OTHER_INVITE_OTHER_QRCODE_REGEX_LIST_ZH.some(
    regex => !!(matchesForOtherInviteOtherQrcodeZh = content.match(regex)),
  )

  const matchesForBotInviteOther         = matchesForBotInviteOtherEn         || matchesForBotInviteOtherZh
  const matchesForOtherInviteBot         = matchesForOtherInviteBotEn         || matchesForOtherInviteBotZh
  const matchesForOtherInviteOther       = matchesForOtherInviteOtherEn       || matchesForOtherInviteOtherZh
  const matchesForOtherInviteOtherQrcode = matchesForOtherInviteOtherQrcodeEn || matchesForOtherInviteOtherQrcodeZh

  const languageEn =   matchesForBotInviteOtherEn
                    || matchesForOtherInviteBotEn
                    || matchesForOtherInviteOtherEn
                    || matchesForOtherInviteOtherQrcodeEn

  const languageZh =   matchesForBotInviteOtherZh
                    || matchesForOtherInviteBotZh
                    || matchesForOtherInviteOtherZh
                    || matchesForOtherInviteOtherQrcodeZh

  const matches =    matchesForBotInviteOther
                  || matchesForOtherInviteBot
                  || matchesForOtherInviteOther
                  || matchesForOtherInviteOtherQrcode

  if (!matches) {
    return null
  }

  /**
   *
   * Parse all Names From the Event Text
   *
   */
  if (matchesForBotInviteOther) {
    /**
     * 1. Bot Invite Other to join the Room
     *  (include invite via QrCode)
     */
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
    /**
     * 2. Other Invite Bot to join the Room
     */
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
    /**
     * 3. Other Invite Other to a Room
     *  (NOT include invite via Qrcode)
     */
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

  } else if (matchesForOtherInviteOtherQrcode) {
    /**
     * 4. Other Invite Other via Qrcode to join a Room
     *   /^" (.+)"通过扫描"(.+)"分享的二维码加入群聊/,
     */
    const inviterName = matches[2]

    let   inviteeNameList: string[]

    const other = matches[1]

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
