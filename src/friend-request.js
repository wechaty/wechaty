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
 */

const Wechaty = require('./wechaty')

class FriendRequest {
  constructor() {
    if (!Wechaty.puppet) {
      throw new Error('no Wechaty.puppet instanciated')
    }
  }

  send(contact, message)  { throw new Error('pure virtual implement') }
  accept()                { throw new Error('pure virtual implement') }

}

module.exports = FriendRequest.default = FriendRequest.FriendRequest = FriendRequest
