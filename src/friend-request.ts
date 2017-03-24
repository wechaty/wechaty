/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Interface for puppet
 *
 * Class FriendRequest
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */

import {
  Config,
  log,
}                   from './config'
import { Contact }  from './contact'

export abstract class FriendRequest {

  public contact: Contact
  public hello: string
  public type: 'send' | 'receive' | 'confirm'

  constructor() {
    log.verbose('FriendRequest', 'constructor()')

    if (!Config.puppetInstance()) {
      throw new Error('no Config.puppetInstance() instanciated')
    }
  }

  public abstract send(contact: Contact, hello: string): Promise<boolean>
  public abstract accept(): Promise<boolean>

}
