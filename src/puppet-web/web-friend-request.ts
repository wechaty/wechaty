/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *   @ignore
 */

/**
 * request/accept: https://github.com/wechaty/wechaty/issues/33
 *
 * 1. send request
 * 2. receive request(in friend event)
 * 3. confirmation friendship(friend event)
 * @ignore
 */

/* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default

import {
  // config,
  log,
}                     from '../config'
import FriendRequest  from '../puppet/friend-request'

import {
  RecommendInfo,
}                     from './schema'
import WebContact     from './web-contact'

/**
 * @alias FriendRequest
 */
export class WebFriendRequest extends FriendRequest {

  public info: RecommendInfo

  private ticket: string

  constructor() {
    log.verbose('WebFriendRequest', 'constructor()')
    super()
  }

  public receive(info: RecommendInfo): void {
    log.verbose('WebFriendRequest', 'receive(%s)', info)

    if (!info || !info.UserName) {
      throw new Error('not valid RecommendInfo: ' + info)
    }
    this.info       = info

    const contact   = WebContact.load(info.UserName)
    contact.puppet  = this.puppet

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

  public confirm(contact: WebContact): void {
    log.verbose('WebFriendRequest', 'confirm(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }
    this.contact  = contact
    this.type     = 'confirm'
  }

  /**
   * Send a new friend request
   * @param {WebContact} contact
   * @param {string} [hello='Hi']
   * @returns {Promise<boolean>} Return a Promise, true for accept successful, false for failure.
   * @example
   * const from = message.from()
   * const request = new FriendRequest()
   * request.send(from, 'hello~')
   */
  public async send(contact: WebContact, hello = 'Hi'): Promise<void> {
    log.verbose('WebFriendRequest', 'send(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }
    this.contact  = contact
    this.type     = 'send'

    if (hello) {
      this.hello = hello
    }

    await this.puppet.friendRequestSend(contact, hello)
  }

  /**
   * Accept a friend request
   *
   * @returns {Promise<void>} Return a Promise, true for accept successful, false for failure.
   */
  public async accept(): Promise<void> {
    log.verbose('FriendRequest', 'accept() %s', this.contact)

    if (this.type !== 'receive') {
      throw new Error('request is not a `receive` type. it is a ' + this.type + ' type')
    }

    await this.puppet.friendRequestAccept(this.contact, this.ticket)

    const max = 20
    const backoff = 300
    const timeout = max * (backoff * max) / 2
    // 20 / 300 => 63,000
    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}

    // refresh to wait contact ready

    await retryPromise({ max: max, backoff: backoff }, async (attempt: number) => {
      log.silly('WebFriendRequest', 'accept() retryPromise() attempt %d with timeout %d', attempt, timeout)

      await this.contact.ready()

      if ((this.contact as WebContact).isReady()) {
        log.verbose('WebFriendRequest', 'accept() with contact %s ready()', this.contact.name())
        return
      }
      throw new Error('FriendRequest.accept() content.ready() not ready')

    }).catch( e => {
      log.warn('WebFriendRequest', 'accept() rejected for contact %s because %s', this.contact, e && e.message || e)
    })

  }

}

export default WebFriendRequest
