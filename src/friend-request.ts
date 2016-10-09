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
const Config = require('./config')

class FriendRequest {
  constructor() {
    if (!Config.puppetInstance()) {
      throw new Error('no Config.puppetInstance() instanciated')
    }
  }

  send(contact, message)  { throw new Error('pure virtual implement') }
  accept()                { throw new Error('pure virtual implement') }

}

module.exports = FriendRequest.default = FriendRequest.FriendRequest = FriendRequest
