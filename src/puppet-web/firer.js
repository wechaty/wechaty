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
 */

/**************************************
 *
 * Firer for Class PuppetWeb
 *
 * here `this` is a PuppetWeb Instance
 *
 ***************************************/
const util          = require('util')
const fs            = require('fs')
const co            = require('co')
const retryPromise  = require('retry-promise').default

const log = require('../brolog-env')
const Contact = require('../contact')
const Message = require('../message')
const FriendRequest = require('./friend-request')

const PuppetWebFirer = {
  fireFriendConfirm
  , fireFriendRequest

  , fireRoomJoin
  , fireRoomLeave

  // for testing
  , checkFriendConfirm
  , checkRoomJoin
  , checkRoomLeave
}

const regexConfig = {
  friendConfirm:  /^You have added (.+) as your WeChat contact. Start chatting!$/

  , roomJoin:     /^"?(.+?)"? invited "(.+)" to the group chat$/
  , roomLeave:    /^You removed "(.+)" from the group chat$/
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
1.
  You've invited "李卓桓" to the group chat
  You've invited "李卓桓.PreAngel、Bruce LEE" to the group chat
2.
   "李卓桓.PreAngel" invited "Bruce LEE" to the group chat
*/
function checkRoomJoin(content) {
  const re = regexConfig.roomJoin

  const found = content.match(re)
  if (!found) {
    return false
  }
  const [_, inviter, invitee] = found
  return [invitee, inviter] // put invitee at first place
}

function fireRoomJoin(m) {
  const room    = m.room()
  const content = m.content()

  let result = checkRoomJoin(content)
  if (!result) {
    return
  }
  const [invitee, inviter] = result

  let inviterContact, inviteeContact

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
                    log.silly('PuppetWebFirer', 'inviteeContact: %s, invitorContact: %s', inviteeContact, inviterContact)

                    inviteeContact || (inviteeContact = room.member(invitee))
                    inviterContact || (inviterContact = room.member(inviter))
                    if (inviteeContact && inviterContact) {
                      log.silly('PuppetWebFirer', 'resolve() inviteeContact: %s, invitorContact: %s', inviteeContact, inviterContact)
                      return Promise.resolve()
                    } else {
                      log.silly('PuppetWebFirer', 'reject() inviteeContact: %s, invitorContact: %s', inviteeContact, inviterContact)
                      return Promise.reject()
                    }
                  })
                  .catch(e => {
                    log.error('PuppetWebFirer', 'retryPromise() room.refresh() rejected: %s', e.stack)
                    throw e
                  })
    })
    .catch(e => { /* fail safe */ })

    if (!inviterContact || !inviteeContact) {
      log.error('PuppetWebFirer', 'inivter or invitee not found for %s, %s', inviter, invitee)
      return
    }
    yield inviteeContact.ready()
    yield inviterContact.ready()
    room.emit('join', inviteeContact, inviterContact)

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
  const [_, leaver] = found
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

  leaverContact = room.member(leaver)

  if (!leaverContact) {
    log.error('PuppetWebFirer', 'leaver not found for %s', leaver)
    return
  }

  co.call(this, function* () {
    yield leaverContact.ready()
    room.emit('leave', leaverContact)
    room.refresh()
  }).catch(e => {
    log.error('PuppetWebFirer', 'fireRoomLeave() co exception: %s', e.stack)
  })
}

module.exports = PuppetWebFirer
