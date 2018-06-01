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
// const retryPromise  = require('retry-promise').default
import {
  instanceToClass,
}                   from 'clone-class'

import {
  Accessory,
}                   from './accessory'
import {
  Contact,
}                   from './contact'
import {
  log,
}                   from './config'
import {
  Misc,
}                   from './misc'

import {
  FriendRequestPayload,
  FriendRequestType,
}                         from './puppet/'

/**
 * Send, receive friend request, and friend confirmation events.
 *
 * 1. send request
 * 2. receive request(in friend event)
 * 3. confirmation friendship(friend event)
 *
 * [Examples/Friend-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/friend-bot.ts}
 */
export class FriendRequest extends Accessory {

  // tslint:disable-next-line:variable-name
  public static Type = FriendRequestType

  public static load<T extends typeof FriendRequest>(
    this : T,
    id   : string,
  ): T['prototype'] {
    const newFriendRequest = new (this as any)(id)
    newFriendRequest.payload = this.puppet.cacheFriendRequestPayload.get(id)
    return newFriendRequest
  }

  /**
   * Send a Friend Request to a `contact` with message `hello`.
   * @param contact
   * @param hello
   */
  public static async send(
    contact : Contact,
    hello   : string,
  ): Promise<void> {
    log.verbose('PuppeteerFriendRequest', 'static send(%s, %s)',
                                          contact.id,
                                          hello,
                )
    await this.puppet.friendRequestSend(contact.id, hello)
  }

  // public static createConfirm(
  //   contactId: string,
  // ): FriendRequestPayload {
  //   log.verbose('PuppeteerFriendRequest', 'createConfirm(%s)',
  //                                         contactId,
  //               )

  //   const payload: FriendRequestPayloadConfirm = {
  //     type : FriendRequestType.Confirm,
  //     contactId,
  //   }

  //   return payload
  // }

  // public static createReceive(
  //   contactId : string,
  //   hello     : string,
  //   ticket    : string,
  // ): FriendRequestPayload {
  //   log.verbose('PuppeteerFriendRequest', 'createReceive(%s, %s, %s)',
  //                                         contactId,
  //                                         hello,
  //                                         ticket,
  //               )

  //   const payload: FriendRequestPayloadReceive = {
  //     type : FriendRequestType.Receive,
  //     contactId,
  //     hello,
  //     ticket,
  //   }

  //   return payload
  // }

  /**
   *
   * Instance Properties
   *
   */

  protected payload?: FriendRequestPayload

  constructor(
    public id: string,
  ) {
    super()
    log.verbose('PuppeteerFriendRequest', 'constructor(id=%s)', id)

    // tslint:disable-next-line:variable-name
    const MyClass = instanceToClass(this, FriendRequest)

    if (MyClass === FriendRequest) {
      throw new Error('FriendRequest class can not be instanciated directly! See: https://github.com/Chatie/wechaty/issues/1217')
    }

    if (!this.puppet) {
      throw new Error('FriendRequest class can not be instanciated without a puppet!')
    }
  }

  public toString() {
    if (!this.payload) {
      return this.constructor.name
    }
    return [
      'FriendRequest#',
      FriendRequestType[this.payload.type],
      '<',
      this.payload.contactId,
      '>',
    ].join('')
  }

  public isReady(): boolean {
    return !!this.payload && (Object.keys(this.payload).length > 0)
  }

  /**
   * no `noCache` support because FriendRequest has no rawPayload(yet)
   */
  public async ready(): Promise<void> {
    if (this.payload) {
      return
    }

    this.payload = await this.puppet.friendRequestPayload(this.id)

    if (!this.payload) {
      throw new Error('no payload')
    }
  }

  // public async send(): Promise<void> {
  //   if (!this.payload) {
  //     throw new Error('no payload')
  //   } else if (!this.payload.contactId) {
  //     throw new Error('no contact')
  //   } else if (this.payload.type !== FriendRequest.Type.Send) {
  //     throw new Error('not a send request')
  //   }
  //   log.verbose('PuppeteerFriendRequest', 'send() to %s', this.payload.contactId)

  //   await this.puppet.friendRequestSend(
  //     this.payload.contactId,
  //     this.payload.hello,
  //   )
  // }

  public async accept(): Promise<void> {
    log.verbose('FriendRequest', 'accept()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.payload.type !== FriendRequest.Type.Receive) {
      throw new Error('accept() need type to be FriendRequestType.Receive, but it got a ' + FriendRequest.Type[this.payload.type!])
    }

    log.silly('FriendRequest', 'accept() to %s', this.payload.contactId)

    await this.puppet.friendRequestAccept(this.payload.contactId, this.payload.ticket)

    const contact = this.contact()

    await Misc.retry(async (retry, attempt) => {
      log.silly('PuppeteerFriendRequest', 'accept() retry() ready() attempt %d', attempt)

      await contact.ready()

      if (contact.isReady()) {
        log.verbose('PuppeteerFriendRequest', 'accept() with contact %s ready()', contact.name())
        return
      }
      retry(new Error('FriendRequest.accept() content.ready() not ready'))

    }).catch((e: Error) => {
      log.warn('PuppeteerFriendRequest', 'accept() contact %s not ready because of %s', contact, e && e.message || e)
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
    }

    const contact = this.wechaty.Contact.load(this.payload.contactId)
    return contact
  }

  public async reject(): Promise<void> {
    log.warn('PuppeteerFriendRequest', 'reject() not necessary, NOP.')
    return
  }

  public type(): FriendRequestType {
    return this.payload
            ? this.payload.type
            : FriendRequestType.Unknown
  }

}

export default FriendRequest
