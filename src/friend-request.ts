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
// import Wechaty  from './wechaty'

abstract class FriendRequest {
  constructor() {
    if (!Config.puppetInstance()) {
      throw new Error('no Config.puppetInstance() instanciated')
    }
  }

  public abstract send(contact: Contact, hello: string): void
  public abstract accept(): void

}

// module.exports = FriendRequest.default = FriendRequest.FriendRequest = FriendRequest
export default FriendRequest
