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
import Contact  from './contact'

abstract class FriendRequest {

  public contact: Contact
  public hello: string
  public type: 'send' | 'receive' | 'confirm' | null

  constructor() {
    if (!Config.puppetInstance()) {
      throw new Error('no Config.puppetInstance() instanciated')
    }
  }

  public abstract async send(contact: Contact, hello: string): Promise<void>
  public abstract async accept(): Promise<void>

}

// module.exports = FriendRequest.default = FriendRequest.FriendRequest = FriendRequest
export default FriendRequest
