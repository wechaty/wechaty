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
 * request/accept: https://github.com/wechaty/wechaty/issues/33
 *
 * 1. send request
 * 2. receive request(in friend event)
 * 3. confirmation friendship(friend event)
 *
 */

/* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default

import { Contact }        from '../contact'
import {
  Config,
  RecommendInfo,
  log,
}                         from '../config'
import { FriendRequest }  from '../friend-request'

class PuppetWebFriendRequest extends FriendRequest {

  public info: RecommendInfo

  private ticket: string

  constructor() {
    log.verbose('PuppetWebFriendRequest', 'constructor()')
    super()
  }

  public receive(info: RecommendInfo): void {
    log.verbose('PuppetWebFriendRequest', 'receive(%s)', info)

    if (!info || !info.UserName) {
      throw new Error('not valid RecommendInfo: ' + info)
    }
    this.info       = info

    const contact   = Contact.load(info.UserName)
    if (!contact) {
      log.warn('PuppetWebFriendRequest', 'receive() no contact found for "%s"', info.UserName)
      throw new Error('no contact')
    }
    this.contact    = contact
    this.hello      = info.Content
    this.ticket     = info.Ticket
    // ??? this.nick = info.NickName

    if (!this.ticket) {
      throw new Error('ticket not found')
    }

    this.type = 'receive'

    return
  }

  public confirm(contact: Contact): void {
    log.verbose('PuppetWebFriendRequest', 'confirm(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }
    this.contact  = contact
    this.type     = 'confirm'
  }

  public async send(contact: Contact, hello = 'Hi'): Promise<boolean> {
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

  public async accept(): Promise<boolean> {
    log.verbose('FriendRequest', 'accept() %s', this.contact)

    if (this.type !== 'receive') {
      throw new Error('request is not a `receive` type. it is a ' + this.type + ' type')
    }

    const ret = await Config.puppetInstance()
                            .friendRequestAccept(this.contact, this.ticket)

    const max = 20
    const backoff = 300
    const timeout = max * (backoff * max) / 2
    // 20 / 300 => 63,000
    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}

    // refresh to wait contact ready

    await retryPromise({ max: max, backoff: backoff }, async (attempt: number) => {
      log.silly('PuppetWebFriendRequest', 'accept() retryPromise() attempt %d with timeout %d', attempt, timeout)

      await this.contact.ready()

      if (this.contact.isReady()) {
        log.verbose('PuppetWebFriendRequest', 'accept() with contact %s ready()', this.contact.name())
        return
      }
      throw new Error('FriendRequest.accept() content.ready() not ready')

    }).catch( e => {
      log.warn('PuppetWebFriendRequest', 'accept() rejected for contact %s because %s', this.contact, e && e.message || e)
    })

    return ret
  }

}

export { PuppetWebFriendRequest as FriendRequest }
