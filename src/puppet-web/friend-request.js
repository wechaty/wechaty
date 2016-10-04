/**
 * Wechat for Bot. Connecting ChatBots
 *
 * Interface for puppet
 *
 * Class FriendRequest
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 * request/accept: https://github.com/wechaty/wechaty/issues/33
 *
 * 1. send request
 * 2. receive request(in friend event)
 * 3. confirmation friendship(friend event)
 *
 */

const Wechaty       = require('../wechaty')
const Contact       = require('../contact')
const FriendRequest = require('../friend-request')
const log           = require('../brolog-env')

class PuppetWebFriendRequest extends FriendRequest {
  constructor() {
    super()
    this.type = '' // enum('send', 'receive', 'confirm')
  }

  receive(info) {
    log.verbose('PuppetWebFriendRequest', 'receive(%s)', info)

    if (!info || !info.UserName) {
      throw new Error('not valid RecommendInfo: ' + info)
    }

    this.info = info

    this.message = info.Content
    this.contact = Contact.load(info.UserName)
    // ??? this.nick = info.NickName

    this.type = 'receive'
  }

  confirm(contact) {
    log.verbose('PuppetWebFriendRequest', 'confirm(%s)', contact)

    if (!contact instanceof Contact) {
      contact = Contact.load(contact)
    }
    this.contact  = contact
    this.type     = 'confirm'
  }

  send(contact, message = 'Hi') {
    log.verbose('PuppetWebFriendRequest', 'send(%s)', contact)

    if (!contact instanceof Contact) {
      contact = Contact.load(contact)
    }
    this.contact  = contact
    this.type     = 'send'

    if (message) {
      this.message = message
    }

    return Wechaty.puppet.friendRequestSend(contact, message)
  }

  accept() {
    log.verbose('FriendRequest', 'accept() %s', this.contact)

    if (this.type !== 'receive') {
      throw new Error('request on a ' + this.type + ' type')
    }

    return Wechaty.puppet.friendRequestAccept(contact, message)
  }

}

module.exports = PuppetWebFriendRequest.default = PuppetWebFriendRequest.PuppetWebFriendRequest = PuppetWebFriendRequest
