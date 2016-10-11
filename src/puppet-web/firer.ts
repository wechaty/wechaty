/**
 *
 * Wechaty: Wechat for Bot. Connecting ChatBots
 *
 * Class PuppetWeb Firer
 *
 * Process the Message to find which event to FIRE
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 * Firer for Class PuppetWeb
 *
 * here `this` is a PuppetWeb Instance
 *
 */
// import * as util  from 'util'
// import * as fs    from 'fs'

/* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default

import Contact        from '../contact'
import Message        from '../message'
import log            from '../brolog-env'

import FriendRequest  from './friend-request'

/* tslint:disable:variable-name */
const PuppetWebFirer = {
  fireFriendConfirm
  , fireFriendRequest

  , fireRoomJoin
  , fireRoomLeave
  , fireRoomTopic

  /**
   * for testing
   */
  , checkFriendConfirm

  , checkRoomJoin
  , checkRoomLeave
  , checkRoomTopic
}

const regexConfig = {
  friendConfirm:  /^You have added (.+) as your WeChat contact. Start chatting!$/

  , roomJoin:     /^"?(.+?)"? invited "(.+)" to the group chat$/
  , roomLeave:    /^You removed "(.+)" from the group chat$/
  , roomTopic:    /^"?(.+?)"? changed the group name to "(.+)"$/
}

async function fireFriendRequest(m) {
  const info = m.rawObj.RecommendInfo
  log.verbose('PuppetWebFirer', 'fireFriendRequest(%s)', info)

  const request = new FriendRequest()
  request.receive(info)

  await request.contact.ready()
  this.emit('friend', request.contact, request)
}

/**
 * try to find FriendRequest Confirmation Message
 */
function checkFriendConfirm(content) {
  const re = regexConfig.friendConfirm
  if (re.test(content)) {
    return true
  } else {
    return false
  }
}

async function fireFriendConfirm(m) {
  const content = m.content()
  log.silly('PuppetWebFirer', 'fireFriendConfirm(%s)', content)

  if (!checkFriendConfirm(content)) {
    return
  }
  const request = new FriendRequest()
  const contact = Contact.load(m.get('from'))
  request.confirm(contact)

  await contact.ready()
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
function checkRoomJoin(content: string): [string[], string] {
  log.verbose('PuppetWebFirer', 'checkRoomJoin()')

  const re = regexConfig.roomJoin

  const found = content.match(re)
  if (!found) {
    throw new Error('checkRoomJoin() not found')
  }

  const [, inviter, inviteeStr] = found

  // "凌" invited "庆次、小桔妹" to the group chat
  const inviteeList = inviteeStr.split(/、/)

  return [inviteeList, inviter] // put invitee at first place
}

async function fireRoomJoin(m: Message): Promise<void> {
  log.verbose('PuppetWebFirer', 'fireRoomJoin()')

  const room    = m.room()
  const content = m.content()

  let inviteeList: string[], inviter: string
  try {
    [inviteeList, inviter] = checkRoomJoin(content)
  } catch (e) { // not a room join message
    return
  }
  log.silly('PuppetWebFirer', 'fireRoomJoin() inviteeList: %s, inviter: %s'
                            , inviteeList.join(',')
                            , inviter
          )

  let inviterContact: Contact
  let inviteeContactList: Contact[] = []

  // co.call(this, function* () {
  try {
    if (inviter === "You've") {
      inviterContact = Contact.load(this.userId)
    }

    const max = 20
    const backoff = 300
    const timeout = max * (backoff * max) / 2
    // 20 / 300 => 63,000
    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}

    await retryPromise({ max: max, backoff: backoff }, attempt => {
      log.silly('PuppetWebFirer', 'fireRoomJoin() retryPromise() attempt %d with timeout %d', attempt, timeout)

      return room.refresh()
                  .then(_ => {
                    let iDone, allDone = true

                    for (let i in inviteeList) {
                      iDone = inviteeContactList[i] instanceof Contact
                      if (!iDone) {
                        let c = room.member(inviteeList[i])
                        if (c) {
                          inviteeContactList[i] = c
                        } else {
                          allDone = false
                        }
                      }
                    }

                    if (!inviterContact) {
                      inviterContact = room.member(inviter)
                    }

                    if (allDone && inviterContact) {
                      log.silly('PuppetWebFirer', 'fireRoomJoin() resolve() inviteeContactList: %s, inviterContact: %s'
                                                , inviteeContactList.map((c: Contact) => c.name()).join(',')
                                                , inviterContact.name()
                              )
                      return Promise.resolve()
                    } else {
                      log.silly('PuppetWebFirer', 'fireRoomJoin() reject() inviteeContactList: %s, inviterContact: %s'
                                                  , inviteeContactList.map((c: Contact) => c.name()).join(',')
                                                  , inviterContact.name()
                                )
                      return Promise.reject('not found(yet)')
                    }
                  })
                  .catch(e => {
                    log.error('PuppetWebFirer', 'fireRoomJoin() retryPromise() room.refresh() rejected: %s', e.stack)
                    throw e
                  })
    })
    .catch(e => { /* fail safe */ })

    if (!inviterContact) {
      log.error('PuppetWebFirer', 'firmRoomJoin() inivter not found for %s', inviter)
      return
    }
    if (!inviteeContactList.every(c => c instanceof Contact)) {
      log.error('PuppetWebFirer', 'firmRoomJoin() inviteeList not all found for %s', inviteeContactList.join(','))
      inviteeContactList = inviteeContactList.filter(c => (c instanceof Contact))
    }

    await Promise.all(inviteeContactList.map(c => c.ready()))
    await inviterContact.ready()
    await room.ready()

    if (inviteeContactList.length === 1) {
      this.emit('room-join', room , inviteeContactList[0] , inviterContact)
      room.emit('join'            , inviteeContactList[0] , inviterContact)
    } else {
      this.emit('room-join', room , inviteeContactList    , inviterContact)
      room.emit('join'            , inviteeContactList    , inviterContact)
    }

  // }).catch(e => {
  } catch (e) {
    log.error('PuppetWebFirer', 'retryPromise() rejected: %s', e.stack)
  }

  return
}

function checkRoomLeave(content: string): string {
  const re = regexConfig.roomLeave

  const found = content.match(re)
  if (!found) {
    return null
  }
  const [, leaver] = found
  return leaver
}

/**
 * You removed "Bruce LEE" from the group chat
 */
async function fireRoomLeave(m) {
  const leaver = checkRoomLeave(m.content())
  if (!leaver) {
    return
  }
  const room = m.room()
  let leaverContact = room.member(leaver)

  if (!leaverContact) {

    // co.call(this, function* () {
    try {
      const max = 20
      const backoff = 300
      const timeout = max * (backoff * max) / 2
      // 20 / 300 => 63,000

      await retryPromise({ max: max, backoff: backoff }, attempt => {
        log.silly('PuppetWebFirer', 'fireRoomLeave() retryPromise() attempt %d with timeout %d', attempt, timeout)

        return room.refresh()
                    .then(_ => {
                      log.silly('PuppetWebFirer', 'leaver: %s', leaver)

                      leaverContact = room.member(leaver)

                      if (leaverContact) {
                        log.silly('PuppetWebFirer', 'fireRoomLeave() resolve() leaverContact: %s'
                                                  , leaverContact
                                )
                        return Promise.resolve(leaverContact)
                      } else {
                        log.silly('PuppetWebFirer', 'fireRoomLeave() reject() leaver: %s'
                                                    , leaver
                                  )
                        return Promise.reject('not found(yet)')
                      }
                    })
                    .catch(e => {
                      log.error('PuppetWebFirer', 'fireRoomLeave() retryPromise() room.refresh() rejected: %s', e && e.stack || e)
                      throw e
                    })
      })
    // }).catch(e => {
    } catch (e) {
      log.error('PuppetWebFirer', 'fireRoomLeave() co exception: %s', e && e.stack || e)
    }
  }

  if (!leaverContact) {
    log.error('PuppetWebFirer', 'fireRoomLeave() leaver not found for %s', leaver)
    return
  }

  await leaverContact.ready()
  await room.ready()
  this.emit('room-leave', room, leaverContact)
  room.emit('leave'           , leaverContact)
  await room.refresh()
}

function checkRoomTopic(content): [string, string] {
  const re = regexConfig.roomTopic

  const found = content.match(re)
  if (!found) {
    throw new Error('checkRoomTopic() not found')
  }
  const [, changer, topic] = found
  return [topic, changer]
}

async function fireRoomTopic(m) {
  let  topic, changer
  try {
    [topic, changer] = checkRoomTopic(m.content())
  } catch (e) { // not found
    return
  }

  const room = m.room()
  const oldTopic = room.topic()

  let changerContact: Contact
  if (/^You$/.test(changer)) {
    changerContact = Contact.load(this.userId)
  } else {
    changerContact = room.member(changer)
  }

  if (!changerContact) {
    log.error('PuppetWebFirer', 'fireRoomTopic() changer contact not found for %s', changer)
    return
  }

  // co.call(this, function* () {
  try {
    await changerContact.ready()
    await room.ready()
    this.emit('room-topic', room, topic, oldTopic, changerContact)
    room.emit('topic'           , topic, oldTopic, changerContact)
    room.refresh()
  // }).catch(e => {
  } catch (e) {
    log.error('PuppetWebFirer', 'fireRoomTopic() co exception: %s', e.stack)
  }
}

// module.exports = PuppetWebFirer
export default PuppetWebFirer
