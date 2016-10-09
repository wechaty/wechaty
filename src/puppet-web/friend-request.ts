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

import Contact       from '../contact'
import Config        from '../config'
import FriendRequest from '../friend-request'
import Wechaty       from '../wechaty'
import log           from '../brolog-env'

type RecommendInfo = {
  UserName:   string
  NickName:   string
  Content:    string // request message
  Ticket:     string // a pass token
  VerifyFlag: number
}

class PuppetWebFriendRequest extends FriendRequest {

  public info: RecommendInfo
  public contact: Contact
  public hello: string
  public type: 'send' | 'receive' | 'confirm'

  private ticket: string

  constructor() {
    log.verbose('PuppetWebFriendRequest', 'constructor()')
    super()
    this.type = null // enum('send', 'receive', 'confirm')
  }

  public receive(info: RecommendInfo): PuppetWebFriendRequest {
    log.verbose('PuppetWebFriendRequest', 'receive(%s)', info)

    if (!info || !info.UserName) {
      throw new Error('not valid RecommendInfo: ' + info)
    }
    this.info     = info

    this.contact    = Contact.load(info.UserName)
    this.hello      = info.Content
    this.ticket     = info.Ticket
    // ??? this.nick = info.NickName

    if (!this.ticket) {
      throw new Error('ticket not found')
    }

    this.type = 'receive'

    return this
  }

  public confirm(contact: Contact): void {
    log.verbose('PuppetWebFriendRequest', 'confirm(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }
    this.contact  = contact
    this.type     = 'confirm'
  }

  public send(contact: Contact, hello = 'Hi'): Promise<any> {
    log.verbose('PuppetWebFriendRequest', 'send(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }
    this.contact  = contact
    this.type       = 'send'

    if (hello) {
      this.hello = hello
    }

    return Config.puppetInstance()
                  .friendRequestSend(contact, hello)
  }

  public accept(): Promise<any> {
    log.verbose('FriendRequest', 'accept() %s', this.contact)

    if (this.type !== 'receive') {
      throw new Error('request on a ' + this.type + ' type')
    }

    return Config.puppetInstance()
                  .friendRequestAccept(this.contact, this.ticket)
  }

}

// module.exports = PuppetWebFriendRequest
export default PuppetWebFriendRequest
