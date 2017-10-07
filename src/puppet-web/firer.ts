/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
const retryPromise  = require('retry-promise').default

import {
  log,
}                     from '../config'
import Contact        from '../contact'
import Message        from '../message'

import FriendRequest  from './friend-request'

/* tslint:disable:variable-name */
export const Firer = {
  checkFriendConfirm,
  checkFriendRequest,

  checkRoomJoin,
  checkRoomLeave,
  checkRoomTopic,

  parseFriendConfirm,
  parseRoomJoin,
  parseRoomLeave,
  parseRoomTopic,

}

const regexConfig = {
  friendConfirm: [
    /^You have added (.+) as your WeChat contact. Start chatting!$/,
    /^你已添加了(.+)，现在可以开始聊天了。$/,
    /^(.+) just added you to his\/her contacts list. Send a message to him\/her now!$/,
    /^(.+)刚刚把你添加到通讯录，现在可以开始聊天了。$/,
  ],

  roomJoinInvite: [
    /^"?(.+?)"? invited "(.+)" to the group chat$/,
    /^"?(.+?)"?邀请"(.+)"加入了群聊$/,
  ],

  roomJoinQrcode: [
    /^" (.+)" joined the group chat via the QR Code shared by "?(.+?)".$/,
    /^"(.+)" joined the group chat via the QR Code shared by "?(.+?)".$/,
    /^"(.+)" joined the group chat via "?(.+?)"? shared QR Code.$/,
    /^" (.+)"通过扫描"?(.+?)"?分享的二维码加入群聊$/,
    /^"(.+)"通过扫描"?(.+?)"?分享的二维码加入群聊$/,
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

async function checkFriendRequest(m: Message) {
  if (!m.rawObj) {
    throw new Error('message empty')
  }
  const info = m.rawObj.RecommendInfo
  log.verbose('PuppetWebFirer', 'fireFriendRequest(%s)', info)

  if (!info) {
    throw new Error('no info')
  }

  const request = new FriendRequest()
  request.receive(info)

  await request.contact.ready()
  if (!request.contact.isReady()) {
    log.warn('PuppetWebFirer', 'fireFriendConfirm() contact still not ready after `ready()` call')
  }

  this.emit('friend', request.contact, request)
}

/**
 * try to find FriendRequest Confirmation Message
 */
function parseFriendConfirm(content: string): boolean {
  const reList = regexConfig.friendConfirm
  let found = false

  reList.some(re => !!(found = re.test(content)))
  if (found) {
    return true
  } else {
    return false
  }
}

async function checkFriendConfirm(m: Message) {
  const content = m.content()
  log.silly('PuppetWebFirer', 'fireFriendConfirm(%s)', content)

  if (!parseFriendConfirm(content)) {
    return
  }
  const request = new FriendRequest()
  const contact = m.from()
  request.confirm(contact)

  await contact.ready()
  if (!contact.isReady()) {
    log.warn('PuppetWebFirer', 'fireFriendConfirm() contact still not ready after `ready()` call')
  }
  this.emit('friend', contact)
}

/**
 * try to find 'join' event for Room
 *
 * 1.
 *  You've invited "李卓桓" to the group chat
 *  You've invited "李卓桓.PreAngel、Bruce LEE" to the group chat
 * 2.
 *  "李卓桓.PreAngel" invited "Bruce LEE" to the group chat
 *  "凌" invited "庆次、小桔妹" to the group chat
 */
function parseRoomJoin(content: string): [string[], string] {
  log.verbose('PuppetWebFirer', 'checkRoomJoin(%s)', content)

  const reListInvite = regexConfig.roomJoinInvite
  const reListQrcode = regexConfig.roomJoinQrcode

  let foundInvite: string[]|null = []
  reListInvite.some(re => !!(foundInvite = content.match(re)))
  let foundQrcode: string[]|null = []
  reListQrcode.some(re => !!(foundQrcode = content.match(re)))
  if ((!foundInvite || !foundInvite.length) && (!foundQrcode || !foundQrcode.length)) {
    throw new Error('checkRoomJoin() not found matched re of ' + content)
  }
  /**
   * "凌" invited "庆次、小桔妹" to the group chat
   * "桔小秘"通过扫描你分享的二维码加入群聊
   */
  const [inviter, inviteeStr] = foundInvite ? [ foundInvite[1], foundInvite[2] ] : [ foundQrcode[2], foundQrcode[1] ]
  const inviteeList = inviteeStr.split(/、/)

  return [inviteeList, inviter] // put invitee at first place
}

async function checkRoomJoin(m: Message): Promise<void> {

  const room = m.room()
  if (!room) {
    log.warn('PuppetWebFirer', 'fireRoomJoin() `room` not found')
    return
  }

  const content = m.content()

  let inviteeList: string[], inviter: string
  try {
    [inviteeList, inviter] = parseRoomJoin(content)
  } catch (e) {
    log.silly('PuppetWebFirer', 'fireRoomJoin() "%s" is not a join message', content)
    return // not a room join message
  }
  log.silly('PuppetWebFirer', 'fireRoomJoin() inviteeList: %s, inviter: %s',
                              inviteeList.join(','),
                              inviter,
          )

  let inviterContact: Contact | null = null
  let inviteeContactList: Contact[] = []

  try {
    if (inviter === "You've" || inviter === '你' || inviter === 'your') {
      inviterContact = Contact.load(this.userId)
    }

    const max = 20
    const backoff = 300
    const timeout = max * (backoff * max) / 2
    // 20 / 300 => 63,000
    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}

    await retryPromise({ max: max, backoff: backoff }, async (attempt: number) => {
      log.silly('PuppetWebFirer', 'fireRoomJoin() retryPromise() attempt %d with timeout %d', attempt, timeout)

      await room.refresh()
      let inviteeListAllDone = true

      for (const i in inviteeList) {
        const loaded = inviteeContactList[i] instanceof Contact

        if (!loaded) {
          const c = room.member(inviteeList[i])
          if (!c) {
            inviteeListAllDone = false
            continue
          }

          inviteeContactList[i] = await c.ready()
          const isReady = c.isReady()
          if (!isReady) {
            inviteeListAllDone = false
            continue
          }
        }

        if (inviteeContactList[i] instanceof Contact) {
          const isReady = inviteeContactList[i].isReady()
          if (!isReady) {
            log.warn('PuppetWebFirer', 'fireRoomJoin() retryPromise() isReady false for contact %s', inviteeContactList[i].id)
            inviteeListAllDone = false
            await inviteeContactList[i].refresh()
            continue
          }
        }

      }

      if (!inviterContact) {
        inviterContact = room.member(inviter)
      }

      if (inviteeListAllDone && inviterContact) {
        log.silly('PuppetWebFirer', 'fireRoomJoin() resolve() inviteeContactList: %s, inviterContact: %s',
                                    inviteeContactList.map((c: Contact) => c.name()).join(','),
                                    inviterContact.name(),
                )
        return
      }

      throw new Error('not found(yet)')

    }).catch(e => {
      log.warn('PuppetWebFirer', 'fireRoomJoin() reject() inviteeContactList: %s, inviterContact: %s',
                                 inviteeContactList.map((c: Contact) => c.name()).join(','),
                                 inviter,
      )
    })

    if (!inviterContact) {
      log.error('PuppetWebFirer', 'firmRoomJoin() inivter not found for %s , `room-join` & `join` event will not fired', inviter)
      return
    }
    if (!inviteeContactList.every(c => c instanceof Contact)) {
      log.error('PuppetWebFirer', 'firmRoomJoin() inviteeList not all found for %s , only part of them will in the `room-join` or `join` event',
                                  inviteeContactList.join(','),
              )
      inviteeContactList = inviteeContactList.filter(c => (c instanceof Contact))
      if (inviteeContactList.length < 1) {
        log.error('PuppetWebFirer', 'firmRoomJoin() inviteeList empty.  `room-join` & `join` event will not fired')
        return
      }
    }

    await Promise.all(inviteeContactList.map(c => c.ready()))
    await inviterContact.ready()
    await room.ready()

    this.emit('room-join', room , inviteeContactList, inviterContact)
    room.emit('join'            , inviteeContactList, inviterContact)

  } catch (e) {
    log.error('PuppetWebFirer', 'exception: %s', e.stack)
  }

  return
}

function parseRoomLeave(content: string): [string, string] {
  const reListByBot = regexConfig.roomLeaveByBot
  const reListByOther = regexConfig.roomLeaveByOther
  let foundByBot: string[]|null = []
  reListByBot.some(re => !!(foundByBot = content.match(re)))
  let foundByOther: string[]|null = []
  reListByOther.some(re => !!(foundByOther = content.match(re)))
  if ((!foundByBot || !foundByBot.length) && (!foundByOther || !foundByOther.length)) {
    throw new Error('checkRoomLeave() no matched re for ' + content)
  }
  const [leaver, remover] = foundByBot ? [ foundByBot[1], this.userId ] : [ this.userId, foundByOther[1] ]
  return [leaver, remover]
}

/**
 * You removed "Bruce LEE" from the group chat
 */
async function checkRoomLeave(m: Message): Promise<void> {
  log.verbose('PuppetWebFirer', 'fireRoomLeave(%s)', m.content())

  let leaver: string, remover: string
  try {
    [leaver, remover] = parseRoomLeave(m.content())
  } catch (e) {
    return
  }
  log.silly('PuppetWebFirer', 'fireRoomLeave() got leaver: %s', leaver)

  const room = m.room()
  if (!room) {
    log.warn('PuppetWebFirer', 'fireRoomLeave() room not found')
    return
  }
  /**
   * FIXME: leaver maybe is a list
   * @lijiarui: I have checked, leaver will never be a list. If the bot remove 2 leavers at the same time, it will be 2 sys message, instead of 1 sys message contains 2 leavers.
   */
  let leaverContact: Contact | null, removerContact: Contact | null
  if (leaver === this.userId) {
    leaverContact = Contact.load(this.userId)
    // not sure which is better
    // removerContact = room.member({contactAlias: remover}) || room.member({name: remover})
    removerContact = room.member(remover)
    if (!removerContact) {
      log.error('PuppetWebFirer', 'fireRoomLeave() bot is removed from the room, but remover %s not found, event `room-leave` & `leave` will not be fired', remover)
      return
    }
  } else {
    removerContact = Contact.load(this.userId)
    // not sure which is better
    // leaverContact = room.member({contactAlias: remover}) || room.member({name: leaver})
    leaverContact = room.member(remover)
    if (!leaverContact) {
      log.error('PuppetWebFirer', 'fireRoomLeave() bot removed someone from the room, but leaver %s not found, event `room-leave` & `leave` will not be fired', leaver)
      return
    }
  }

  await removerContact.ready()
  await leaverContact.ready()
  await room.ready()

  /**
   * FIXME: leaver maybe is a list
   * @lijiarui: I have checked, leaver will never be a list. If the bot remove 2 leavers at the same time, it will be 2 sys message, instead of 1 sys message contains 2 leavers.
   */
  this.emit('room-leave', room, leaverContact, removerContact)
  room.emit('leave'           , leaverContact, removerContact)

  setTimeout(_ => { room.refresh() }, 10000) // reload the room data, especially for memberList
}

function parseRoomTopic(content: string): [string, string] {
  const reList = regexConfig.roomTopic

  let found: string[]|null = []
  reList.some(re => !!(found = content.match(re)))
  if (!found || !found.length) {
    throw new Error('checkRoomTopic() not found')
  }
  const [, changer, topic] = found
  return [topic, changer]
}

async function checkRoomTopic(m: Message): Promise<void> {
  let  topic, changer
  try {
    [topic, changer] = parseRoomTopic(m.content())
  } catch (e) { // not found
    return
  }

  const room = m.room()
  if (!room) {
    log.warn('PuppetWebFirer', 'fireRoomLeave() room not found')
    return
  }

  const oldTopic = room.topic()

  let changerContact: Contact | null
  if (/^You$/.test(changer) || /^你$/.test(changer)) {
    changerContact = Contact.load(this.userId)
  } else {
    changerContact = room.member(changer)
  }

  if (!changerContact) {
    log.error('PuppetWebFirer', 'fireRoomTopic() changer contact not found for %s', changer)
    return
  }

  try {
    await changerContact.ready()
    await room.ready()
    this.emit('room-topic', room, topic, oldTopic, changerContact)
    room.emit('topic'           , topic, oldTopic, changerContact)
    room.refresh()
  } catch (e) {
    log.error('PuppetWebFirer', 'fireRoomTopic() co exception: %s', e.stack)
  }
}

export default Firer
