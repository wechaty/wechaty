/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
 *
 */
import { EventEmitter }     from 'events'
import * as PUPPET          from 'wechaty-puppet'
import { log }              from 'wechaty-puppet'
import type { Constructor } from 'clone-class'

import {
  retryPolicy,
}                   from '../pure-functions/mod.js'

import type {
  Accepter,
}                   from '../schemas/acceptable.js'

import type {
  ContactInterface,
  ContactImpl,
}                       from './contact.js'
import type {
  RoomInterface,
}                       from './room.js'
import {
  wechatifyMixin,
}                       from '../user-mixins/wechatify.js'
import { validationMixin } from '../user-mixins/validation.js'

interface FriendshipAddOptionsObject {
  room?: RoomInterface,
  contact?: ContactInterface,
  hello?: string,
}

type FriendshipAddOptions = string | FriendshipAddOptionsObject

const MixinBase = wechatifyMixin(
  EventEmitter,
)

/**
 * Send, receive friend request, and friend confirmation events.
 *
 * 1. send request
 * 2. receive request(in friend event)
 * 3. confirmation friendship(friend event)
 *
 * [Examples/Friend-Bot]{@link https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/friend-bot.ts}
 */
class FriendshipMixin extends MixinBase implements Accepter {

  static Type = PUPPET.types.Friendship

  /**
   * @ignore
   */
  static load (
    id   : string,
  ): FriendshipInterface {
    const newFriendship = new this(id)
    return newFriendship
  }

  /**
   * Search a Friend by phone or weixin.
   *
   * The best practice is to search friend request once per minute.
   * Remember not to do this too frequently, or your account may be blocked.
   *
   * @param {FriendshipSearchCondition} condition - Search friend by phone or weixin.
   * @returns {Promise<ContactInterface>}
   *
   * @example
   * const friend_phone = await bot.Friendship.search({phone: '13112341234'})
   * const friend_weixin = await bot.Friendship.search({weixin: 'weixin_account'})
   *
   * console.log(`This is the new friend info searched by phone : ${friend_phone}`)
   * await bot.Friendship.add(friend_phone, 'hello')
   *
   */
  static async search (
    queryFilter : PUPPET.filters.Friendship,
  ): Promise<undefined | ContactInterface> {
    log.verbose('Friendship', 'static search("%s")',
      JSON.stringify(queryFilter),
    )
    const contactId = await this.wechaty.puppet.friendshipSearch(queryFilter)

    if (!contactId) {
      return undefined
    }

    const contact = await this.wechaty.Contact.find({ id: contactId })
    return contact
  }

  /**
   * Send a Friend Request to a `contact` with message `hello`.
   *
   * The best practice is to send friend request once per minute.
   * Remeber not to do this too frequently, or your account may be blocked.
   *
   * @param {ContactInterface} contact - Send friend request to contact
   * @param {FriendshipAddOptions} options - The friend request content
   * @returns {Promise<void>}
   *
   * @example
   * const contact = await bot.Friendship.search({phone: '13112341234'})
   * await bot.Friendship.add(contact, 'Nice to meet you! I am wechaty bot!')
   *
   * const memberList = await room.memberList()
   * for (let i = 0; i < memberList.length; i++) {
   *   await bot.Friendship.add(member, {
   *     room: room,
   *     hello: `Nice to meet you! I am wechaty bot from room: ${await room.topic()}!`,
   *   })
   * }
   *
   */
  static async add (
    contact : ContactInterface,
    options  : FriendshipAddOptions,
  ): Promise<void> {
    log.verbose('Friendship', 'static add(%s, %s)',
      contact.id,
      typeof options === 'string' ? options : options.hello,
    )

    if (typeof options === 'string') {
      log.warn('Friendship', 'the params hello is deprecated in the next version, please put the attr hello into options object, e.g. { hello: "xxxx" }')
      await this.wechaty.puppet.friendshipAdd(contact.id, { hello: options })
    } else {
      const friendOption: PUPPET.types.FriendshipAddOptions = {
        contactId: options.contact?.id,
        hello: options.hello,
        roomId: options.room && options.room.id,
      }
      await this.wechaty.puppet.friendshipAdd(contact.id, friendOption)
    }
  }

  static async del (
    contact: ContactInterface,
  ): Promise<void> {
    log.verbose('Friendship', 'static del(%s)', contact.id)
    throw new Error('to be implemented')
  }

  /**
   *
   * Instance Properties
   *
   */

  /**
    * @ignore
   */
  payload?: PUPPET.payloads.Friendship

  /*
   * @hideconstructor
   */
  constructor (
    public readonly id: string,
  ) {
    super()
    log.verbose('Friendship', 'constructor(id=%s)', id)
  }

  override toString () {
    if (!this.payload) {
      return this.constructor.name
    }

    return [
      'Friendship#',
      PUPPET.types.Friendship[this.payload.type],
      '<',
      this.payload.contactId,
      '>',
    ].join('')
  }

  isReady (): boolean {
    return !!this.payload && (Object.keys(this.payload).length > 0)
  }

  /**
   * no `dirty` support because Friendship has no rawPayload(yet)
    * @ignore
   */
  async ready (): Promise<void> {
    if (this.isReady()) {
      return
    }

    this.payload = await this.wechaty.puppet.friendshipPayload(this.id)

    // if (!this.#payload) {
    //   throw new Error('no payload')
    // }

    await (this.contact() as ContactImpl).ready()
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
  async accept (): Promise<void> {
    log.verbose('Friendship', 'accept()')

    if (!this.payload) {
      throw new Error('no payload')
    }

    if (this.payload.type !== PUPPET.types.Friendship.Receive) {
      throw new Error('accept() need type to be FriendshipType.Receive, but it got a ' + FriendshipImpl.Type[this.payload.type])
    }

    log.silly('Friendship', 'accept() to %s', this.payload.contactId)

    await this.wechaty.puppet.friendshipAccept(this.id)

    const contact = this.contact()

    try {
      const doSync = async () => {
        await (contact as ContactImpl).ready()
        if (!contact.isReady()) {
          throw new Error('Friendship.accept() contact.ready() not ready')
        }
        log.verbose('Friendship', 'accept() with contact %s ready()', contact.name())
      }

      await retryPolicy.execute(doSync)

    } catch (e) {
      this.wechaty.emitError(e)
      log.warn('Friendship', 'accept() contact %s not ready because of %s', contact, (e && (e as Error).message) || e)
      // console.error(e)
    }

    // try to fix issue #293 - https://github.com/wechaty/wechaty/issues/293
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
  hello (): string {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.hello || ''
  }

  /**
   * Get the contact from friendship
   *
   * @returns {ContactInterface}
   * @example
   * const bot = new Wechaty()
   * bot.on('friendship', async friendship => {
   *   const contact = friendship.contact()
   *   const name = contact.name()
   *   console.log(`received friend event from ${name}`)
   * }
   * .start()
   */
  contact (): ContactInterface {
    if (!this.payload) {
      throw new Error('no payload')
    }

    const contact = (this.wechaty.Contact as typeof ContactImpl).load(this.payload.contactId)
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
  type (): PUPPET.types.Friendship {
    return this.payload
      ? this.payload.type
      : PUPPET.types.Friendship.Unknown
  }

  /**
   * get friendShipPayload Json
   * @returns {FriendshipPayload}
   *
   * @example
   * const bot = new Wechaty()
   * bot.on('friendship', async friendship => {
   *   try {
   *     // JSON.stringify(friendship) as well.
   *     const payload = await friendship.toJSON()
   *   } catch (e) {
   *     console.error(e)
   *   }
   * }
   * .start()
   */
  toJSON (): string {
    log.verbose('Friendship', 'toJSON()')

    if (!this.isReady()) {
      throw new Error(`Friendship<${this.id}> needs to be ready. Please call ready() before toJSON()`)
    }
    return JSON.stringify(this.payload)
  }

  /**
   * create friendShip by friendshipJson
   * @example
   * const bot = new Wechaty()
   * bot.start()
   *
   * const payload = '{...}'  // your saved JSON payload
   * const friendship = bot.FriendShip.fromJSON(friendshipFromDisk)
   * await friendship.accept()
   */
  static async fromJSON (
    payload: string | PUPPET.payloads.Friendship,
  ): Promise<FriendshipInterface> {
    log.verbose('Friendship', 'static fromJSON(%s)',
      typeof payload === 'string'
        ? payload
        : JSON.stringify(payload),
    )

    if (typeof payload === 'string') {
      payload = JSON.parse(payload) as PUPPET.payloads.Friendship
    }

    /**
     * Set the payload back to the puppet for future use
     */
    await this.wechaty.puppet.friendshipPayload(payload.id, payload)

    const instance = this.wechaty.Friendship.load(payload.id)
    await instance.ready()

    return instance
  }

}

class FriendshipImpl extends validationMixin(FriendshipMixin)<FriendshipInterface>() {}
interface FriendshipInterface extends FriendshipImpl {}

type FriendshipConstructor = Constructor<
  FriendshipInterface,
  typeof FriendshipImpl
>

export type {
  FriendshipConstructor,
  FriendshipInterface,
}
export {
  FriendshipImpl,
}
