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
 *
 */

 /* tslint:disable:no-var-requires */
const retryPromise  = require('retry-promise').default

import PuppetAccessory  from '../puppet-accessory'

import Contact          from './contact'

import {
  log,
}                       from '../config'

export enum FriendRequestType {
  Unknown = 0,
  Send,
  Receive,
  Confirm,
}

export interface FriendRequestPayload {
  contact? : Contact,
  hello?   : string,
  ticket?  : string
  type?    : FriendRequestType,
}

/**
 * Send, receive friend request, and friend confirmation events.
 *
 * 1. send request
 * 2. receive request(in friend event)
 * 3. confirmation friendship(friend event)
 *
 * [Examples/Friend-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/friend-bot.ts}
 */
export class FriendRequest extends PuppetAccessory {

  // tslint:disable-next-line:variable-name
  public static Type = FriendRequestType

  public static createSend(
    contact : Contact,
    hello   : string,
    ): FriendRequest {
    log.verbose('PuppeteerFriendRequest', 'createSend(%s, %s)',
                                          contact,
                                          hello,
                )

    const sentRequest = new this({
      type: FriendRequestType.Send,
      contact,
      hello,
    })

    return sentRequest
  }

  public static createConfirm(
    contact: Contact,
  ): FriendRequest {
    log.verbose('PuppeteerFriendRequest', 'createConfirm(%s)',
                                          contact,
                )

    const confirmedRequest = new this({
      type: FriendRequestType.Confirm,
      contact,
    })

    return confirmedRequest
  }

  public static createReceive(
    contact : Contact,
    hello   : string,
    ticket  : string,
  ): FriendRequest {
    log.verbose('PuppeteerFriendRequest', 'createReceive(%s, %s, %s)',
                                          contact,
                                          hello,
                                          ticket,
                )

    const receivedRequest = new this({
      type: FriendRequestType.Receive,
      contact,
      hello,
      ticket,
    })

    return receivedRequest
  }

  /**
   *
   * Instance Properties
   *
   */
  private constructor(
    protected payload?: FriendRequestPayload,
  ) {
    super()
    log.verbose('PuppeteerFriendRequest', 'constructor(%s)', payload)
  }

  public async send(): Promise<void> {
    if (!this.payload) {
      throw new Error('no payload')
    } else if (!this.payload.contact) {
      throw new Error('no contact')
    } else if (this.payload.type !== FriendRequest.Type.Send) {
      throw new Error('not a send request')
    }
    log.verbose('PuppeteerFriendRequest', 'send() to %s', this.payload.contact)

    await this.puppet.friendRequestSend(
      this.payload.contact,
      this.payload.hello,
    )
  }

  public async accept(): Promise<void> {
    if (!this.payload) {
      throw new Error('no payload')
    } else if (!this.payload.contact) {
      throw new Error('no contact')
    } else if (!this.payload.ticket) {
      throw new Error('no ticket')
    } else if (this.payload.type !== FriendRequest.Type.Receive) {
      throw new Error('not a receive request, its a ' + FriendRequest.Type[this.payload.type!])
    }
    log.verbose('FriendRequest', 'accept() to %s', this.payload.contact)

    await this.puppet.friendRequestAccept(this.payload.contact, this.payload.ticket)

    const max = 20
    const backoff = 300
    const timeout = max * (backoff * max) / 2
    // 20 / 300 => 63,000
    // max = (2*totalTime/backoff) ^ (1/2)
    // timeout = 11,250 for {max: 15, backoff: 100}

    // refresh to wait contact ready

    await retryPromise({ max: max, backoff: backoff }, async (attempt: number) => {
      log.silly('PuppeteerFriendRequest', 'accept() retryPromise() attempt %d with timeout %d', attempt, timeout)

      await this.contact().ready()

      if (this.contact().isReady()) {
        log.verbose('PuppeteerFriendRequest', 'accept() with contact %s ready()', this.contact().name())
        return
      }
      throw new Error('FriendRequest.accept() content.ready() not ready')

    }).catch((e: Error) => {
      log.warn('PuppeteerFriendRequest', 'accept() rejected for contact %s because %s', this.contact, e && e.message || e)
    })

  }

  public hello(): string {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.hello || ''
  }

  public contact(): Contact {
    if (!this.payload) {
      throw new Error('no payload')
    } else if (!this.payload.contact) {
      throw new Error('no contact')
    }
    return this.payload.contact
  }

  public async reject(): Promise<void> {
    log.warn('PuppeteerFriendRequest', 'reject() not necessary, NOP.')
    return
  }

  public type(): FriendRequestType {
    if (!this.payload) {
      throw new Error('no payload')
    } else if (!this.payload.type) {
      throw new Error('no type')
    }
    return this.payload.type
  }

}

export default FriendRequest
