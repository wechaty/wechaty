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

import Config   from './config'
import Wechaty  from './wechaty'

class FriendRequest {
  constructor() {
    if (!Config.puppetInstance()) {
      throw new Error('no Config.puppetInstance() instanciated')
    }
  }

  send(contact, message)  { throw new Error('pure virtual implement') }
  accept()                { throw new Error('pure virtual implement') }

}

// module.exports = FriendRequest.default = FriendRequest.FriendRequest = FriendRequest
export default FriendRequest
