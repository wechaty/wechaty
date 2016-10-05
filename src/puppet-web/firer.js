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
const util  = require('util')
const fs    = require('fs')
const co    = require('co')

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
  log.verbose('PuppetWebEvent', 'fireFriendRequest(%s)', info)

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
  log.silly('PuppetWebEvent', 'fireFriendConfirm(%s)', content)

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
    yield room.refresh()

    yield new Promise(resolve => {
      setTimeout(_ => resolve(), 1000)
    })

    if (inviter === "You've") {
      inviterContact = Contact.load(this.userId)
    } else {
      inviterContact = room.member(inviter)
    }

    inviteeContact = room.member(invitee)

    if (!inviterContact || !inviteeContact) {
      log.error('PuppetWebEvent', 'inivter or invitee not found for %s, %s', inviter.name(), invitee.name())
      return
    }
    room.emit('join', inviteeContact, inviterContact)
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
    log.error('PuppetWebEvent', 'leaver not found for %s', leaver)
    return
  }
  room.emit('leave', leaverContact)
  room.refresh()
}

module.exports = PuppetWebFirer
