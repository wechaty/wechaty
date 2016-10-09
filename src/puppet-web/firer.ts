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
// import Message        from '../message'
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

function fireFriendRequest(m) {
  const info = m.rawObj.RecommendInfo
  log.verbose('PuppetWebFirer', 'fireFriendRequest(%s)', info)

  const request = new FriendRequest()
  request.receive(info)
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

function fireFriendConfirm(m) {
  const content = m.content()
  log.silly('PuppetWebFirer', 'fireFriendConfirm(%s)', content)

  if (!checkFriendConfirm(content)) {
    return
  }
  const request = new FriendRequest()
  const contact = Contact.load(m.get('from'))
  request.confirm(contact)

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
function checkRoomJoin(content): [string|string[], string] | boolean {
  log.verbose('PuppetWebFirer', 'checkRoomJoin()')

  const re = regexConfig.roomJoin

  const found = content.match(re)
  if (!found) {
    return false
  }
  const [, inviter, inviteeStr] = found

  // "凌" invited "庆次、小桔妹" to the group chat
  const inviteeList = inviteeStr.split(/、/)

  return [inviteeList, inviter] // put invitee at first place
}

function fireRoomJoin(m) {
  log.verbose('PuppetWebFirer', 'fireRoomJoin()')

  const room    = m.room()
  const content = m.content()

  let result = checkRoomJoin(content)
  if (!result) {
    return
  }
  const [inviteeList, inviter] = <[string[], string]>result

  let inviterContact, inviteeContactList = []

  co.call(this, function* () {
    if (inviter === "You've") {
      inviterContact = Contact.load(this.userId)
    }

    const max = 20
    const backoff = 300
    const timeout = max * (backoff * max) / 2
    // 20 / 300 => 63,000
    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}

    yield retryPromise({ max: max, backoff: backoff }, attempt => {
      log.silly('PuppetWebFirer', 'fireRoomJoin() retryPromise() attempt %d with timeout %d', attempt, timeout)

      return room.refresh()
                  .then(_ => {
                    log.silly('PuppetWebFirer', 'inviteeList: %s, inviter: %s'
                                              , inviteeList.join(',')
                                              , inviter
                            )

                    let iDone, allDone = true

                    for (let i in inviteeList) {
                      iDone = inviteeContactList[i] instanceof Contact
                      if (!iDone) {
                        inviteeContactList[i] = room.member(inviteeList[i])
                                                || (allDone = false)
                      }
                    }

                    if (!inviterContact) {
                      inviterContact = room.member(inviter)
                    }

                    if (allDone && inviterContact) {
                      log.silly('PuppetWebFirer', 'fireRoomJoin() resolve() inviteeContactList: %s, inviterContact: %s'
                                                , inviteeContactList.join(',')
                                                , inviterContact
                              )
                      return Promise.resolve()
                    } else {
                      log.silly('PuppetWebFirer', 'fireRoomJoin() reject() inviteeContactList: %s, inviterContact: %s'
                                                  , inviteeContactList.join(',')
                                                  , inviterContact
                                )
                      return Promise.reject('not found(yet)')
                    }
                  })
                  .catch(e => {
                    log.error('PuppetWebFirer', 'fireRoomJoin9() retryPromise() room.refresh() rejected: %s', e.stack)
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

    yield Promise.all(inviteeContactList.map(c => c.ready()))
    yield inviterContact.ready()

    if (inviteeContactList.length === 1) {
      this.emit('room-join', room , inviteeContactList[0], inviterContact)
      room.emit('join'            , inviteeContactList[0], inviterContact)
    } else {
      this.emit('room-join', room , inviteeContactList, inviterContact)
      room.emit('join'            , inviteeContactList, inviterContact)
    }

  }).catch(e => {
    log.error('PuppetWebFirer', 'retryPromise() rejected: %s', e.stack)
  })
}

function checkRoomLeave(content) {
  const re = regexConfig.roomLeave

  const found = content.match(re)
  if (!found) {
    return false
  }
  const [, leaver] = found
  return leaver
}

/**
 * You removed "Bruce LEE" from the group chat
 */
function fireRoomLeave(m) {
  const leaver = checkRoomLeave(m.content())
  if (!leaver) {
    return
  }
  const room = m.room()
  let leaverContact = room.member(leaver)

  if (!leaverContact) {

    co.call(this, function* () {
      const max = 20
      const backoff = 300
      const timeout = max * (backoff * max) / 2
      // 20 / 300 => 63,000

      yield retryPromise({ max: max, backoff: backoff }, attempt => {
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
    }).catch(e => {
      log.error('PuppetWebFirer', 'fireRoomLeave() co exception: %s', e && e.stack || e)
    })
  }

  if (!leaverContact) {
    log.error('PuppetWebFirer', 'fireRoomLeave() leaver not found for %s', leaver)
    return
  }

  leaverContact.ready()
                .then(_ => {
                  this.emit('room-leave', room, leaverContact)
                  room.emit('leave'           , leaverContact)
                  room.refresh()
                })
}

function checkRoomTopic(content): [string, string] | boolean {
  const re = regexConfig.roomTopic

  const found = content.match(re)
  if (!found) {
    return false
  }
  const [, changer, topic] = found
  return [topic, changer]
}

function fireRoomTopic(m) {
  const result = checkRoomTopic(m.content())
  if (!result) {
    return
  }

  const [topic, changer] = <[string, string]>result
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

  co.call(this, function* () {
    yield changerContact.ready()
    this.emit('room-topic', room, topic, oldTopic, changerContact)
    room.emit('topic'           , topic, oldTopic, changerContact)
    room.refresh()
  }).catch(e => {
    log.error('PuppetWebFirer', 'fireRoomTopic() co exception: %s', e.stack)
  })
}

// module.exports = PuppetWebFirer
export default PuppetWebFirer
