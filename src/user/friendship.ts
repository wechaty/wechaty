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

import {
  instanceToClass,
}                   from 'clone-class'

import {
  Accessory,
}                   from '../accessory'
import {
  log,
}                   from '../config'
import {
  tryWait,
}                   from '../helper-functions'

import {
  FriendshipPayload,
  FriendshipType,
}                         from 'wechaty-puppet'

import {
  Acceptable,
}                   from '../types'

import {
  Contact,
}                   from './contact'

/**
 * Send, receive friend request, and friend confirmation events.
 *
 * 1. send request
 * 2. receive request(in friend event)
 * 3. confirmation friendship(friend event)
 *
 * [Examples/Friend-Bot]{@link https://github.com/Chatie/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/friend-bot.ts}
 */
export class Friendship extends Accessory implements Acceptable {

  // tslint:disable-next-line:variable-name
  public static Type = FriendshipType

  /**
   * @private
   */
  public static load<T extends typeof Friendship> (
    this : T,
    id   : string,
  ): T['prototype'] {
    const newFriendship = new (this as any)(id)
    return newFriendship
  }

  /**
   * @description
   * use {@link Friendship#add} instead
   * @deprecated
   */
  public static async send (contact: Contact,  hello: string) {
    log.warn('Friendship', 'static send() DEPRECATED， use add() instead.')
    return this.add(contact, hello)
  }

  /**
   * Send a Friend Request to a `contact` with message `hello`.
   *
   * The best practice is to send friend request once per minute.
   * Remeber not to do this too frequently, or your account may be blocked.
   *
   * @param {Contact} contact - Send friend request to contact
   * @param {string} hello    - The friend request content
   * @returns {Promise<void>}
   *
   * @example
   * const memberList = await room.memberList()
   * for (let i = 0; i < memberList.length; i++) {
   *   await bot.Friendship.add(member, 'Nice to meet you! I am wechaty bot!')
   * }
   */
  public static async add (
    contact : Contact,
    hello   : string,
  ): Promise<void> {
    log.verbose('Friendship', 'static add(%s, %s)',
                                  contact.id,
                                  hello,
                )
    await this.puppet.friendshipAdd(contact.id, hello)
  }

  public static async del (
    contact: Contact,
  ): Promise<void> {
    log.verbose('Friendship', 'static del(%s)', contact.id)
    throw new Error('to be implemented')
  }

  // public static createConfirm(
  //   contactId: string,
  // ): FriendRequestPayload {
  //   log.verbose('Friendship', 'createConfirm(%s)',
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
  //   log.verbose('Friendship', 'createReceive(%s, %s, %s)',
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

  /**
   * @ignore
   */
  protected payload?: FriendshipPayload

  constructor (
    public id: string,
  ) {
    super()
    log.verbose('Friendship', 'constructor(id=%s)', id)

    // tslint:disable-next-line:variable-name
    const MyClass = instanceToClass(this, Friendship)

    if (MyClass === Friendship) {
      throw new Error('Friendship class can not be instanciated directly! See: https://github.com/Chatie/wechaty/issues/1217')
    }

    if (!this.puppet) {
      throw new Error('Friendship class can not be instanciated without a puppet!')
    }
  }

  public toString () {
    if (!this.payload) {
      return this.constructor.name
    }

    return [
      'Friendship#',
      FriendshipType[this.payload.type],
      '<',
      this.payload.contactId,
      '>',
    ].join('')
  }

  public isReady (): boolean {
    return !!this.payload && (Object.keys(this.payload).length > 0)
  }

  /**
   * no `dirty` support because Friendship has no rawPayload(yet)
   * @ignore
   */
  public async ready (): Promise<void> {
    if (this.isReady()) {
      return
    }

    this.payload = await this.puppet.friendshipPayload(this.id)

    if (!this.payload) {
      throw new Error('no payload')
    }
  }

  /**
   * Accept Friend Request
   *
   * @returns {Promise<void>}
   *
   * @example
   * const bot = new Wechaty()
   * bot.on('friendship', async friendship => {
   *   try {
   *     console.log(`received friend event.`)
   *     switch (friendship.type()) {
   *
   *     // 1. New Friend Request
   *
   *     case Friendship.Type.Receive:
   *       await friendship.accept()
   *       break
   *
   *     // 2. Friend Ship Confirmed
   *
   *     case Friendship.Type.Confirm:
   *       console.log(`friend ship confirmed`)
   *       break
   *     }
   *   } catch (e) {
   *     console.error(e)
   *   }
   * }
   * .start()
   */
  public async accept (): Promise<void> {
    log.verbose('Friendship', 'accept()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.payload.type !== Friendship.Type.Receive) {
      throw new Error('accept() need type to be FriendshipType.Receive, but it got a ' + Friendship.Type[this.payload.type])
    }

    log.silly('Friendship', 'accept() to %s', this.payload.contactId)

    await this.puppet.friendshipAccept(this.id)

    const contact = this.contact()

    await tryWait(async (retry, attempt) => {
      log.silly('Friendship', 'accept() retry() ready() attempt %d', attempt)

      await contact.ready()

      if (contact.isReady()) {
        log.verbose('Friendship', 'accept() with contact %s ready()', contact.name())
        return
      }
      retry(new Error('Friendship.accept() contact.ready() not ready'))

    }).catch((e: Error) => {
      log.warn('Friendship', 'accept() contact %s not ready because of %s', contact, e && e.message || e)
    })

    // try to fix issue #293
    await contact.sync()
  }

  /**
   * Get verify message from
   *
   * @returns {string}
   * @example <caption>If request content is `ding`, then accept the friendship</caption>
   * const bot = new Wechaty()
   * bot.on('friendship', async friendship => {
   *   try {
   *     console.log(`received friend event from ${friendship.contact().name()}`)
   *     if (friendship.type() === Friendship.Type.Receive && friendship.hello() === 'ding') {
   *       await friendship.accept()
   *     }
   *   } catch (e) {
   *     console.error(e)
   *   }
   * }
   * .start()
   */
  public hello (): string {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.hello || ''
  }

  /**
   * Get the contact from friendship
   *
   * @returns {Contact}
   * @example
   * const bot = new Wechaty()
   * bot.on('friendship', async friendship => {
   *   const contact = friendship.contact()
   *   const name = contact.name()
   *   console.log(`received friend event from ${name}`)
   * }
   * .start()
   */
  public contact (): Contact {
    if (!this.payload) {
      throw new Error('no payload')
    }

    const contact = this.wechaty.Contact.load(this.payload.contactId)
    return contact
  }

  /**
   * Return the Friendship Type
   * > Tips: FriendshipType is enum here. </br>
   * - FriendshipType.Unknown  </br>
   * - FriendshipType.Confirm  </br>
   * - FriendshipType.Receive  </br>
   * - FriendshipType.Verify   </br>
   *
   * @returns {FriendshipType}
   *
   * @example <caption>If request content is `ding`, then accept the friendship</caption>
   * const bot = new Wechaty()
   * bot.on('friendship', async friendship => {
   *   try {
   *     if (friendship.type() === Friendship.Type.Receive && friendship.hello() === 'ding') {
   *       await friendship.accept()
   *     }
   *   } catch (e) {
   *     console.error(e)
   *   }
   * }
   * .start()
   */
  public type (): FriendshipType {
    return this.payload
            ? this.payload.type
            : FriendshipType.Unknown
  }
}
