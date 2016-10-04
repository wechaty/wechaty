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
const Config        = require('../config')
const FriendRequest = require('../friend-request')
const log           = require('../brolog-env')

class PuppetWebFriendRequest extends FriendRequest {
  constructor() {
    log.verbose('PuppetWebFriendRequest', 'constructor()')
    super()
    this.type = '' // enum('send', 'receive', 'confirm')
  }

  receive(info) {
    log.verbose('PuppetWebFriendRequest', 'receive(%s)', info)

    if (!info || !info.UserName) {
      throw new Error('not valid RecommendInfo: ' + info)
    }
    this.info     = info

    this.contactId  = info.UserName
    this.hello      = info.Content
    this.ticket     = info.Ticket
    // ??? this.nick = info.NickName

    if (!this.ticket) {
      throw new Error('ticket not found')
    }

    this.type = 'receive'

    return this
  }

  confirm(contactId) {
    log.verbose('PuppetWebFriendRequest', 'confirm(%s)', contactId)

    if (!contactId) {
      throw new Error('contactId not found')
    }
    this.contactId  = contactId
    this.type       = 'confirm'
  }

  send(contactId, hello = 'Hi') {
    log.verbose('PuppetWebFriendRequest', 'send(%s)', contactId)

    if (!contactId) {
      throw new Error('contactId not found')
    }
    this.contactId  = contactId
    this.type       = 'send'

    if (hello) {
      this.hello = hello
    }

    return Config.puppetInstance()
                  .friendRequestSend(contactId, hello)
  }

  accept() {
    log.verbose('FriendRequest', 'accept() %s', this.contactId)

    if (this.type !== 'receive') {
      throw new Error('request on a ' + this.type + ' type')
    }

    return Config.puppetInstance()
                  .friendRequestAccept(this.contactId, this.ticket)
  }

}

module.exports = PuppetWebFriendRequest.default = PuppetWebFriendRequest.PuppetWebFriendRequest = PuppetWebFriendRequest
