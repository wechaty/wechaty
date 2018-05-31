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
import * as cuid from 'cuid'

import {
  log,
}               from '../config'
import { Misc } from '../misc'

import {
  WebRecomendInfo,
  WebMessageRawPayload,
  // FriendRequest,
}                             from './web-schemas'
import PuppetPuppeteer        from './puppet-puppeteer'

import {
  Contact,
}                             from '../contact'

// import {
//   Message,
// }                       from '../message'
import {
  // FriendRequestPayload,
  FriendRequestType,
  FriendRequestPayloadReceive,
  FriendRequestPayloadConfirm,
}                               from '../friend-request'

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
  roomLeaveByBot: [
    /^You removed "(.+)" from the group chat$/,
    /^你将"(.+)"移出了群聊$/,
  ],

  roomLeaveByOther: [
    /^You were removed from the group chat by "(.+)"$/,
    /^你被"(.+)"移出群聊$/,
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

  public async checkFriendRequest(
    rawPayload : WebMessageRawPayload,
  ): Promise<void> {
    if (!rawPayload.RecommendInfo) {
      throw new Error('no RecommendInfo')
    }
    const recommendInfo: WebRecomendInfo = rawPayload.RecommendInfo
    log.verbose('PuppetPuppeteerFirer', 'fireFriendRequest(%s)', recommendInfo)

    if (!recommendInfo) {
      throw new Error('no recommendInfo')
    }

    const contactId = recommendInfo.UserName
    const hello     = recommendInfo.Content
    const ticket    = recommendInfo.Ticket
    const type      = FriendRequestType.Receive

    const payloadReceive: FriendRequestPayloadReceive = {
      contactId,
      hello,
      ticket,
      type,
    }

    const id = cuid()
    this.puppet.cacheFriendRequestPayload.set(id, payloadReceive)

    this.puppet.emit('friend', id)
  }

  public async checkFriendConfirm(
    rawPayload : WebMessageRawPayload,
  ) {
    const content = rawPayload.Content
    log.silly('PuppetPuppeteerFirer', 'fireFriendConfirm(%s)', content)

    if (!this.parseFriendConfirm(content)) {
      return
    }

    const contactId = rawPayload.FromUserName
    const type = FriendRequestType.Confirm

    const payloadConfirm: FriendRequestPayloadConfirm = {
      contactId,
      type,
    }

    const id = cuid()
    this.puppet.cacheFriendRequestPayload.set(id, payloadConfirm)

    this.puppet.emit('friend', id)
  }

  public async checkRoomJoin(
    rawPayload : WebMessageRawPayload,
  ): Promise<boolean> {

    const text = rawPayload.Content

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

    let inviterContactId: undefined | string = undefined
    let inviteeContactIdList: string[]  = []

    try {
      if (/^You|你$/i.test(inviterName)) { //  === 'You' || inviter === '你' || inviter === 'you'
        inviterContactId = this.puppet.selfId()
      }

      // const max     = 20
      // const backoff = 300
      // const timeout = max * (backoff * max) / 2
      // 20 / 300 => 63,000
      // max = (2*totalTime/backoff) ^ (1/2)
      // timeout = 11,250 for {max: 15, backoff: 100}

      await Misc.retry(async (retry, attempt) => {
        log.silly('PuppetPuppeteerFirer', 'fireRoomJoin() retry() attempt %d', attempt)

        await room.sync()
        let inviteeListAllDone = true

        for (const i in inviteeNameList) {
          const inviteeContact = inviteeContactIdList[i]
          if (inviteeContact instanceof Contact) {
            if (!inviteeContact.isReady()) {
              log.warn('PuppetPuppeteerFirer', 'fireRoomJoin() retryPromise() isReady false for contact %s', inviteeContact.id)
              inviteeListAllDone = false
              await inviteeContact.refresh()
              continue
            }
          } else {
            const member = room.member(inviteeNameList[i])
            if (!member) {
              inviteeListAllDone = false
              continue
            }

            await member.ready()
            inviteeContactIdList[i] = member

            if (!member.isReady()) {
              inviteeListAllDone = false
              continue
            }
          }

        }

        if (!inviterContactId) {
          inviterContactId = room.member(inviterName)
        }

        if (inviteeListAllDone && inviterContactId) {
          log.silly('PuppetPuppeteerFirer', 'fireRoomJoin() resolve() inviteeContactList: %s, inviterContact: %s',
                                      inviteeContactIdList.map((c: Contact) => c.name()).join(','),
                                      inviterContactId.name(),
                  )
          return true
        }

        log.error('PuppetPuppeteerFirer', 'fireRoomJoin() not found(yet)')
        return retry(new Error('fireRoomJoin() not found(yet)'))

      }).catch((e: Error) => {
        log.warn('PuppetPuppeteerFirer', 'fireRoomJoin() reject() inviteeContactList: %s, inviterContact: %s, error %s',
                                   inviteeContactIdList.map((c: Contact) => c.name()).join(','),
                                   inviterName,
                                   e.message,
        )
      })

      if (!inviterContactId) {
        log.error('PuppetPuppeteerFirer', 'firmRoomJoin() inivter not found for %s , `room-join` & `join` event will not fired', inviterName)
        return false
      }
      if (!inviteeContactIdList.every(c => c instanceof Contact)) {
        log.error('PuppetPuppeteerFirer', 'firmRoomJoin() inviteeList not all found for %s , only part of them will in the `room-join` or `join` event',
                                    inviteeContactIdList.join(','),
                )
        inviteeContactIdList = inviteeContactIdList.filter(c => (c instanceof Contact))
        if (inviteeContactIdList.length < 1) {
          log.error('PuppetPuppeteerFirer', 'firmRoomJoin() inviteeList empty.  `room-join` & `join` event will not fired')
          return false
        }
      }

      await Promise.all(inviteeContactIdList.map(c => c.ready()))
      await inviterContactId.ready()
      await room.ready()

      this.puppet.emit('room-join', room.id, inviteeContactIdList.map(c => c.id), inviterContactId.id)
      // room.emit('join'              , inviteeContactList, inviterContact)

      return true
    } catch (e) {
      log.error('PuppetPuppeteerFirer', 'exception: %s', e.stack)
      return false
    }

  }

  /**
   * You removed "Bruce LEE" from the group chat
   */
  public async checkRoomLeave(
    rawPayload : WebMessageRawPayload,
  ): Promise<boolean> {
    log.verbose('PuppetPuppeteerFirer', 'fireRoomLeave(%s)', rawPayload.Content)

    let leaverName  : string
    let removerName : string

    try {
      [leaverName, removerName] = this.parseRoomLeave(rawPayload.Content)
    } catch (e) {
      return false
    }
    log.silly('PuppetPuppeteerFirer', 'fireRoomLeave() got leaver: %s', leaverName)

    /**
     * FIXME: leaver maybe is a list
     * @lijiarui: I have checked, leaver will never be a list. If the bot remove 2 leavers at the same time, it will be 2 sys message, instead of 1 sys message contains 2 leavers.
     */
    let leaverContactId  : undefined | string
    let removerContactId : undefined | string

    if (leaverName === this.puppet.selfId()) {
      leaverContactId = this.Contact.load(this.selfId())

      // not sure which is better
      // removerContact = room.member({contactAlias: remover}) || room.member({name: remover})
      removerContactId = room.member(removerName)
      // if (!removerContact) {
      //   log.error('PuppetPuppeteerFirer', 'fireRoomLeave() bot is removed from the room, but remover %s not found, event `room-leave` & `leave` will not be fired', remover)
      //   return false
      // }

    } else {
      removerContactId = this.puppet.selfId()

      // not sure which is better
      // leaverContact = room.member({contactAlias: remover}) || room.member({name: leaver})
      leaverContactId = room.member(removerName)
      if (!leaverContactId) {
        log.error('PuppetPuppeteerFirer', 'fireRoomLeave() bot removed someone from the room, but leaver %s not found, event `room-leave` & `leave` will not be fired', leaverName)
        return false
      }
    }

    // TODO
    const roomId = ''

    /**
     * FIXME: leaver maybe is a list
     * @lijiarui 2017: I have checked, leaver will never be a list. If the bot remove 2 leavers at the same time,
     *                  it will be 2 sys message, instead of 1 sys message contains 2 leavers.
     * @huan 2018 May: we need to generilize the pattern for future usage.
     */
    this.puppet.emit('room-leave', roomId , [leaverContactId] /* , [removerContact] */)

    setTimeout(_ => { room.refresh() }, 10000) // reload the room data, especially for memberList
    return true
  }

  public async checkRoomTopic(
    rawPayload : WebMessageRawPayload,
  ): Promise<boolean> {
    let  topic, changer
    try {
      [topic, changer] = this.parseRoomTopic(rawPayload.Content)
    } catch (e) { // not found
      return false
    }

    const oldTopic = room.topic()

    let changerContactId: undefined | string
    if (/^You$/.test(changer) || /^你$/.test(changer)) {
      changerContactId = this.Contact.load(this.selfId())
    } else {
      changerContactId = room.member(changer)
    }

    if (!changerContactId) {
      log.error('PuppetPuppeteerFirer', 'fireRoomTopic() changer contact not found for %s', changer)
      return false
    }

    try {
      this.emit('room-topic', roomId , topic, oldTopic, changerContactId)
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
    const reListByBot = REGEX_CONFIG.roomLeaveByBot
    const reListByOther = REGEX_CONFIG.roomLeaveByOther
    let foundByBot: string[]|null = []
    reListByBot.some(re => !!(foundByBot = content.match(re)))
    let foundByOther: string[]|null = []
    reListByOther.some(re => !!(foundByOther = content.match(re)))
    if ((!foundByBot || !foundByBot.length) && (!foundByOther || !foundByOther.length)) {
      throw new Error('checkRoomLeave() no matched re for ' + content)
    }
    const [leaver, remover] = foundByBot ? [ foundByBot[1], this.selfId() ] : [ this.selfId(), foundByOther[1] ]
    return [leaver, remover]
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
