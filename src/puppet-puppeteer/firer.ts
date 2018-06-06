/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/* tslint:disable:no-var-requires */
// const retryPromise  = require('retry-promise').default
// import cuid from 'cuid'

import {
  log,
}               from '../config'

import {
  // WebRecomendInfo,
  WebMessageRawPayload,
}                             from './web-schemas'
import PuppetPuppeteer        from './puppet-puppeteer'

// import {
//   // FriendRequestPayload,
//   FriendRequestType,
//   FriendRequestPayloadReceive,
//   FriendRequestPayloadConfirm,
// }                               from '../puppet/'

const REGEX_CONFIG = {
  friendConfirm: [
    /^You have added (.+) as your WeChat contact. Start chatting!$/,
    /^你已添加了(.+)，现在可以开始聊天了。$/,
    /^(.+) just added you to his\/her contacts list. Send a message to him\/her now!$/,
    /^(.+)刚刚把你添加到通讯录，现在可以开始聊天了。$/,
  ],

  roomJoinInvite: [
    // There are 3 blank(charCode is 32) here. eg: You invited 管理员 to the group chat.
    /^(.+?) invited (.+) to the group chat.\s+$/,

    // There no no blank or punctuation here.  eg: 管理员 invited 小桔建群助手 to the group chat
    /^(.+?) invited (.+) to the group chat$/,

    // There are 2 blank(charCode is 32) here. eg: 你邀请"管理员"加入了群聊
    /^(.+?)邀请"(.+)"加入了群聊\s+$/,

    // There no no blank or punctuation here.  eg: "管理员"邀请"宁锐锋"加入了群聊
    /^"(.+?)"邀请"(.+)"加入了群聊$/,
  ],

  roomJoinQrcode: [
    // Wechat change this, should desperate. See more in pr#651
    // /^" (.+)" joined the group chat via the QR Code shared by "?(.+?)".$/,

    // There are 2 blank(charCode is 32) here. Qrcode is shared by bot.     eg: "管理员" joined group chat via the QR code you shared.
    /^"(.+)" joined group chat via the QR code "?(.+?)"? shared.\s+$/,

    // There are no blank(charCode is 32) here. Qrcode isn't shared by bot. eg: "宁锐锋" joined the group chat via the QR Code shared by "管理员".
    /^"(.+)" joined the group chat via the QR Code shared by "?(.+?)".$/,

    // There are 2 blank(charCode is 32) here. Qrcode is shared by bot.     eg: "管理员"通过扫描你分享的二维码加入群聊
    /^"(.+)"通过扫描(.+?)分享的二维码加入群聊\s+$/,

    // There are 1 blank(charCode is 32) here. Qrode isn't shared by bot.  eg: " 苏轼"通过扫描"管理员"分享的二维码加入群聊
    /^"\s+(.+)"通过扫描"(.+?)"分享的二维码加入群聊$/,
  ],

  // no list
  roomLeaveIKickOther: [
    /^(You) removed "(.+)" from the group chat$/,
    /^(你)将"(.+)"移出了群聊$/,
  ],

  roomLeaveOtherKickMe: [
    /^(You) were removed from the group chat by "(.+)"$/,
    /^(你)被"(.+)"移出群聊$/,
  ],

  roomTopic: [
    /^"?(.+?)"? changed the group name to "(.+)"$/,
    /^"?(.+?)"?修改群名为“(.+)”$/,
  ],
}

export class Firer {
  constructor(
    public puppet: PuppetPuppeteer,
  ) {
    //
  }

  // public async checkFriendRequest(
  //   rawPayload : WebMessageRawPayload,
  // ): Promise<void> {
  //   if (!rawPayload.RecommendInfo) {
  //     throw new Error('no RecommendInfo')
  //   }
  //   const recommendInfo: WebRecomendInfo = rawPayload.RecommendInfo
  //   log.verbose('PuppetPuppeteerFirer', 'fireFriendRequest(%s)', recommendInfo)

  //   if (!recommendInfo) {
  //     throw new Error('no recommendInfo')
  //   }

  //   const contactId = recommendInfo.UserName
  //   const hello     = recommendInfo.Content
  //   const ticket    = recommendInfo.Ticket
  //   const type      = FriendRequestType.Receive
  //   const id        = cuid()

  //   const payloadReceive: FriendRequestPayloadReceive = {
  //     id,
  //     contactId,
  //     hello,
  //     ticket,
  //     type,
  //   }

  //   this.puppet.cacheFriendRequestPayload.set(id, payloadReceive)

  //   this.puppet.emit('friend', id)
  // }

  public async checkFriendConfirm(
    rawPayload : WebMessageRawPayload,
  ) {
    const content = rawPayload.Content
    log.silly('PuppetPuppeteerFirer', 'fireFriendConfirm(%s)', content)

    if (!this.parseFriendConfirm(content)) {
      return
    }

    // const contactId = rawPayload.FromUserName
    // const type = FriendRequestType.Confirm

    // const id = cuid()

    // const payloadConfirm: FriendRequestPayloadConfirm = {
    //   id,
    //   contactId,
    //   type,
    // }

    // this.puppet.cacheFriendRequestPayload.set(id, payloadConfirm)

    this.puppet.emit('friend', rawPayload.MsgId)
  }

  public async checkRoomJoin(
    rawPayload : WebMessageRawPayload,
  ): Promise<boolean> {

    const text   = rawPayload.Content
    const roomId = rawPayload.FromUserName

    /**
     * Get the display names of invitee & inviter
     */
    let inviteeNameList : string[]
    let inviterName     : string

    try {
      [inviteeNameList, inviterName] = this.parseRoomJoin(text)
    } catch (e) {
      log.silly('PuppetPuppeteerFirer', 'checkRoomJoin() "%s" is not a join message', text)
      return false // not a room join message
    }
    log.silly('PuppetPuppeteerFirer', 'checkRoomJoin() inviteeList: %s, inviter: %s',
                                      inviteeNameList.join(','),
                                      inviterName,
              )

    /**
     * Convert the display name to Contact ID
     */
    let   inviterContactId: undefined | string = undefined
    const inviteeContactIdList: string[]       = []

    if (/^You|你$/i.test(inviterName)) { //  === 'You' || inviter === '你' || inviter === 'you'
      inviterContactId = this.puppet.selfId()
    }

    const sleep   = 1000
    const timeout = 60 * 1000
    let   ttl     = timeout / sleep

    let ready = true

    while (ttl-- > 0) {
      log.silly('PuppetPuppeteerFirer', 'fireRoomJoin() retry() ttl %d', ttl)

      if (!ready) {
        await new Promise(r => setTimeout(r, timeout))
        ready = true
      }

      /**
       * loop inviteeNameList
       * set inviteeContactIdList
       */
      for (const i in inviteeNameList) {
        const inviteeName = inviteeNameList[i]

        const inviteeContactId = inviteeContactIdList[i]
        if (inviteeContactId) {
          /**
           * had already got ContactId for Room Member
           * try to resolve the ContactPayload
           */
          try {
            await this.puppet.contactPayload(inviteeContactId)
          } catch (e) {
            log.warn('PuppetPuppeteerFirer', 'fireRoomJoin() contactPayload(%s) exception: %s', inviteeContactId, e.message)
            ready = false
          }
        } else {
          /**
           * only had Name of RoomMember
           * try to resolve the ContactId & ContactPayload
           */
          const memberIdList = await this.puppet.roomMemberSearch(roomId, inviteeName)

          if (memberIdList.length <= 0) {
            ready = false
          }

          const contactId = memberIdList[0]
          // XXX: Take out the first one if we have matched many contact.
          inviteeContactIdList[i] = contactId

          try {
            await this.puppet.contactPayload(contactId)
          } catch (e) {
            ready = false
          }

        }

      }

      if (!inviterContactId) {
        const contactIdList = await this.puppet.roomMemberSearch(roomId, inviterName)

        if (contactIdList.length > 0) {
          inviterContactId = contactIdList[0]
        } else {
          ready = false
        }
      }

      if (ready) {
        log.silly('PuppetPuppeteerFirer', 'fireRoomJoin() resolve() inviteeContactIdList: %s, inviterContactId: %s',
                                            inviteeContactIdList.join(','),
                                            inviterContactId,
                  )
        /**
         * Resolve All Payload again to make sure the data is ready.
         */
        await Promise.all(
          inviteeContactIdList.map(
            id => this.puppet.contactPayload(id),
          ),
        )

        if (!inviterContactId) {
          throw new Error('no inviterContactId')
        }

        await this.puppet.contactPayload(inviterContactId)
        await this.puppet.roomPayload(roomId)

        this.puppet.emit('room-join', roomId, inviteeContactIdList, inviterContactId)

        return true
      }
    }

    log.warn('PuppetPuppeteerFier', 'fireRoomJoin() resolve payload fail.')
    return false
  }

  /**
   * You removed "Bruce LEE" from the group chat
   */
  public async checkRoomLeave(
    rawPayload : WebMessageRawPayload,
  ): Promise<boolean> {
    log.verbose('PuppetPuppeteerFirer', 'fireRoomLeave(%s)', rawPayload.Content)

    const roomId = rawPayload.FromUserName

    let leaverName  : string
    let removerName : string

    try {
      [leaverName, removerName] = this.parseRoomLeave(rawPayload.Content)
    } catch (e) {
      log.silly('PuppetPuppeteerFirer', 'fireRoomLeave() %s', e.message)
      return false
    }
    log.silly('PuppetPuppeteerFirer', 'fireRoomLeave() got leaverName: %s', leaverName)

    /**
     * FIXME: leaver maybe is a list
     * @lijiarui: I have checked, leaver will never be a list. If the bot remove 2 leavers at the same time, it will be 2 sys message, instead of 1 sys message contains 2 leavers.
     */
    let leaverContactId  : undefined | string
    let removerContactId : undefined | string

    if (/^(You|你)$/i.test(leaverName)) {
      leaverContactId = this.puppet.selfId()
    } else if (/^(You|你)$/i.test(removerName)) {
      removerContactId = this.puppet.selfId()
    }

    if (!leaverContactId) {
      const idList = await this.puppet.roomMemberSearch(roomId, leaverName)
      leaverContactId = idList[0]
    }

    if (!removerContactId) {
      const idList = await this.puppet.roomMemberSearch(roomId, removerName)
      removerContactId = idList[0]
    }

    if (!leaverContactId || !removerContactId) {
      throw new Error('no id')
    }
    /**
     * FIXME: leaver maybe is a list
     * @lijiarui 2017: I have checked, leaver will never be a list. If the bot remove 2 leavers at the same time,
     *                  it will be 2 sys message, instead of 1 sys message contains 2 leavers.
     * @huan 2018 May: we need to generilize the pattern for future usage.
     */
    this.puppet.emit('room-leave', roomId , [leaverContactId], removerContactId)

    setTimeout(_ => this.puppet.roomPayload(roomId, true), 10 * 1000) // reload the room data, especially for memberList

    return true
  }

  public async checkRoomTopic(
    rawPayload : WebMessageRawPayload,
  ): Promise<boolean> {
    let topic   : string
    let changer : string

    try {
      [topic, changer] = this.parseRoomTopic(rawPayload.Content)
    } catch (e) { // not found
      return false
    }

    const roomId = rawPayload.ToUserName

    const roomPayload = await this.puppet.roomPayload(roomId)
    const oldTopic = roomPayload.topic

    let changerContactId: undefined | string
    if (/^(You|你)$/.test(changer)) {
      changerContactId = this.puppet.selfId()
    } else {
      changerContactId = (await this.puppet.roomMemberSearch(roomId, changer))[0]
    }

    if (!changerContactId) {
      log.error('PuppetPuppeteerFirer', 'fireRoomTopic() changer contact not found for %s', changer)
      return false
    }

    try {
      this.puppet.emit('room-topic', roomId , topic, oldTopic, changerContactId)
      return true
    } catch (e) {
      log.error('PuppetPuppeteerFirer', 'fireRoomTopic() co exception: %s', e.stack)
      return false
    }
  }

  /**
   * try to find FriendRequest Confirmation Message
   */
  private parseFriendConfirm(
    content: string,
  ): boolean {
    const reList = REGEX_CONFIG.friendConfirm
    let found = false

    reList.some(re => !!(found = re.test(content)))
    if (found) {
      return true
    } else {
      return false
    }
  }

  /**
   * try to find 'join' event for Room
   *
   * 1.
   *  You invited 管理员 to the group chat.
   *  You invited 李卓桓.PreAngel、Bruce LEE to the group chat.
   * 2.
   *  管理员 invited 小桔建群助手 to the group chat
   *  管理员 invited 庆次、小桔妹 to the group chat
   */
  private parseRoomJoin(
    content: string,
  ): [string[], string] {
    log.verbose('PuppetPuppeteerFirer', 'parseRoomJoin(%s)', content)

    const reListInvite = REGEX_CONFIG.roomJoinInvite
    const reListQrcode = REGEX_CONFIG.roomJoinQrcode

    let foundInvite: string[]|null = []
    reListInvite.some(re => !!(foundInvite = content.match(re)))
    let foundQrcode: string[]|null = []
    reListQrcode.some(re => !!(foundQrcode = content.match(re)))
    if ((!foundInvite || !foundInvite.length) && (!foundQrcode || !foundQrcode.length)) {
      throw new Error('parseRoomJoin() not found matched re of ' + content)
    }
    /**
     * 管理员 invited 庆次、小桔妹 to the group chat
     * "管理员"通过扫描你分享的二维码加入群聊
     */
    const [inviter, inviteeStr] = foundInvite ? [ foundInvite[1], foundInvite[2] ] : [ foundQrcode[2], foundQrcode[1] ]
    const inviteeList = inviteeStr.split(/、/)

    return [inviteeList, inviter] // put invitee at first place
  }

  private parseRoomLeave(
    content: string,
  ): [string, string] {
    let matchIKickOther: null | string[] = []
    REGEX_CONFIG.roomLeaveIKickOther.some(
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

  private parseRoomTopic(
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

}

export default Firer
