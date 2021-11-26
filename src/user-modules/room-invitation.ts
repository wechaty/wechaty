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
import type * as PUPPET          from 'wechaty-puppet'

import { log } from '../config.js'
import type { Constructor } from 'clone-class'

import type {
  Accepter,
}                     from '../schemas/acceptable.js'
import {
  timestampToDate,
}                     from '../pure-functions/timestamp-to-date.js'

import type {
  ContactInterface,
}               from './contact.js'
import {
  wechatifyMixinBase,
}                     from '../user-mixins/wechatify.js'
import { validationMixin } from '../user-mixins/validation.js'

/**
 *
 * accept room invitation
 */
class RoomInvitationMixin extends wechatifyMixinBase() implements Accepter {

  static load (
    id   : string,
  ): RoomInvitationInterface {
    const newRoomInvitation = new this(id)
    return newRoomInvitation
  }

  /**
   * @hideconstructor
   * Instance Properties
   *
   */
  constructor (
    public readonly id: string,
  ) {
    super()
    log.verbose('RoomInvitation', 'constructor(id=%s)', id)
  }

  override toString () {
    return [
      'RoomInvitation#',
      this.id || 'loading',
    ].join('')
  }

  /**
    * @ignore
   */
  async toStringAsync (): Promise<string> {
    const payload = await this.wechaty.puppet.roomInvitationPayload(this.id)
    return [
      'RoomInvitation#',
      this.id,
      '<',
      payload.topic,
      ',',
      payload.inviterId,
      '>',
    ].join('')
  }

  /**
   * Accept Room Invitation
   *
   * @returns {Promise<void>}
   *
   * @example
   * const bot = new Wechaty()
   * bot.on('room-invite', async roomInvitation => {
   *   try {
   *     console.log(`received room-invite event.`)
   *     await roomInvitation.accept()
   *   } catch (e) {
   *     console.error(e)
   *   }
   * }
   * .start()
   */
  async accept (): Promise<void> {
    log.verbose('RoomInvitation', 'accept()')

    try {
      await this.wechaty.puppet.roomInvitationAccept(this.id)

      const inviter = await this.inviter()
      const topic   = await this.topic()

      log.verbose('RoomInvitation', 'accept() with room(%s) & inviter(%s) ready()',
        topic,
        inviter,
      )
      return
    } catch (e) {
      this.wechaty.emitError(e)
      log.warn('RoomInvitation', 'accept() rejection: %s',
        (e && (e as Error).message) || e,
      )
    }
  }

  /**
   * Get the inviter from room invitation
   *
   * @returns {ContactInterface}
   * @example
   * const bot = new Wechaty()
   * bot.on('room-invite', async roomInvitation => {
   *   const inviter = await roomInvitation.inviter()
   *   const name = inviter.name()
   *   console.log(`received room invitation event from ${name}`)
   * }
   * .start()
   */
  async inviter (): Promise<ContactInterface> {
    log.verbose('RoomInvitation', 'inviter()')

    const payload = await this.wechaty.puppet.roomInvitationPayload(this.id)
    const inviter = await this.wechaty.Contact.find({ id: payload.inviterId })

    if (!inviter) {
      throw new Error('can not found inviter with id: ' + payload.inviterId)
    }
    return inviter
  }

  /**
   * Get the room topic from room invitation
   *
   * @returns {string}
   * @example
   * const bot = new Wechaty()
   * bot.on('room-invite', async roomInvitation => {
   *   const topic = await roomInvitation.topic()
   *   console.log(`received room invitation event from room ${topic}`)
   * }
   * .start()
   */
  async topic (): Promise<string> {
    const payload = await this.wechaty.puppet.roomInvitationPayload(this.id)

    return payload.topic || payload.topic || ''
  }

  async memberCount (): Promise<number> {
    log.verbose('RoomInvitation', 'memberCount()')

    const payload = await this.wechaty.puppet.roomInvitationPayload(this.id)

    return payload.memberCount || payload.memberCount || 0
  }

  /**
   * List of Room Members that you known(is friend)
    * @ignore
   */
  async memberList (): Promise<ContactInterface[]> {
    log.verbose('RoomInvitation', 'roomMemberList()')

    const payload = await this.wechaty.puppet.roomInvitationPayload(this.id)

    const contactIdList = payload.memberIdList

    const contactListAll = await Promise.all(
      contactIdList.map(
        id => this.wechaty.Contact.find({ id }),
      ),
    )

    const contactList = contactListAll.filter(c => !!c) as ContactInterface[]
    return contactList
  }

  /**
   * Get the invitation time
   *
   * @returns {Promise<Date>}
   */
  async date (): Promise<Date> {
    log.verbose('RoomInvitation', 'date()')

    const payload = await this.wechaty.puppet.roomInvitationPayload(this.id)
    return timestampToDate(payload.timestamp)
  }

  /**
   * Returns the roopm invitation age in seconds. <br>
   *
   * For example, the invitation is sent at time `8:43:01`,
   * and when we received it in Wechaty, the time is `8:43:15`,
   * then the age() will return `8:43:15 - 8:43:01 = 14 (seconds)`
   * @returns {number}
   */
  async age (): Promise<number> {
    const recvDate = await this.date()

    const ageMilliseconds = Date.now() - recvDate.getTime()
    const ageSeconds = Math.floor(ageMilliseconds / 1000)

    return ageSeconds
  }

  /**
   * Load the room invitation info from disk
   *
   * @returns {RoomInvitationInterface}
   * @example
   * const bot = new Wechaty()
   * const dataFromDisk // get the room invitation info data from disk
   * const roomInvitation = await bot.RoomInvitation.fromJSON(dataFromDisk)
   * await roomInvitation.accept()
   */
  static async fromJSON (
    payload: string | PUPPET.payloads.RoomInvitation,
  ): Promise<RoomInvitationInterface> {
    log.verbose('RoomInvitation', 'fromJSON(%s)',
      typeof payload === 'string'
        ? payload
        : JSON.stringify(payload),
    )

    if (typeof payload === 'string') {
      payload = JSON.parse(payload) as PUPPET.payloads.RoomInvitation
    }

    await this.wechaty.puppet.roomInvitationPayload(payload.id, payload)

    return this.wechaty.RoomInvitation.load(payload.id)
  }

  /**
   * Get the room invitation info when listened on room-invite event
   *
   * @returns {string}
   * @example
   * const bot = new Wechaty()
   * bot.on('room-invite', async roomInvitation => {
   *  const roomInvitation = bot.RoomInvitation.load(roomInvitation.id)
   *  const jsonData = await roomInvitation.toJSON(roomInvitation.id)
   *  // save the json data to disk, and we can use it by RoomInvitation.fromJSON()
   * }
   * .start()
   */
  async toJSON (): Promise<string> {
    log.verbose('RoomInvitation', 'toJSON()')
    const payload = await this.wechaty.puppet.roomInvitationPayload(this.id)
    return JSON.stringify(payload)
  }

}

class RoomInvitationImpl extends validationMixin(RoomInvitationMixin)<RoomInvitationInterface>() {}
interface RoomInvitationInterface extends RoomInvitationImpl {}

type RoomInvitationConstructor = Constructor<
  RoomInvitationInterface,
  typeof RoomInvitationImpl
>

export type {
  RoomInvitationConstructor,
  RoomInvitationInterface,
}
export {
  RoomInvitationImpl,
}
