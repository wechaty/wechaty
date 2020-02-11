/**
 *   Wechaty - https://github.com/wechaty/wechaty
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
}               from '../accessory'
import {
  log,
}               from '../config'
import {
  Acceptable,
}               from '../types'
import {
  timestampToDate,
}                   from '../helper-functions/pure/timestamp-to-date'

import {
  Contact,
}               from './contact'
import { RoomInvitationPayload } from 'wechaty-puppet'

/**
 *
 * accept room invitation
 */
export class RoomInvitation extends Accessory implements Acceptable {

  public static load<T extends typeof RoomInvitation> (
    this : T,
    id   : string,
  ): T['prototype'] {
    const newRoomInvitation = new (this as any)(id)
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

    // tslint:disable-next-line:variable-name
    const MyClass = instanceToClass(this, RoomInvitation)

    if (MyClass === RoomInvitation) {
      throw new Error('RoomInvitation class can not be instanciated directly! See: https://github.com/wechaty/wechaty/issues/1217')
    }

    if (!this.puppet) {
      throw new Error('RoomInvitation class can not be instanciated without a puppet!')
    }
  }

  public toString () {
    return [
      'RoomInvitation#',
      this.id || 'loading',
    ].join('')
  }

  /**
    * @ignore
   */
  public async toStringAsync (): Promise<string> {
    const payload = await this.puppet.roomInvitationPayload(this.id)
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
  public async accept (): Promise<void> {
    log.verbose('RoomInvitation', 'accept()')

    await this.puppet.roomInvitationAccept(this.id)

    const inviter = await this.inviter()
    const topic   = await this.topic()

    try {
      await inviter.ready()

      log.verbose('RoomInvitation', 'accept() with room(%s) & inviter(%s) ready()',
        topic,
        inviter,
      )
      return
    } catch (e) {
      log.warn('RoomInvitation', 'accept() inviter(%s) is not ready because of %s',
        inviter,
        (e && e.message) || e,
      )
    }
  }

  /**
   * Get the inviter from room invitation
   *
   * @returns {Contact}
   * @example
   * const bot = new Wechaty()
   * bot.on('room-invite', async roomInvitation => {
   *   const inviter = await roomInvitation.inviter()
   *   const name = inviter.name()
   *   console.log(`received room invitation event from ${name}`)
   * }
   * .start()
   */
  public async inviter (): Promise<Contact> {
    log.verbose('RoomInvitation', 'inviter()')

    const payload = await this.puppet.roomInvitationPayload(this.id)
    const inviter = this.wechaty.Contact.load(payload.inviterId)
    return inviter
  }

  /**
   * Get the room topic from room invitation
   *
   * @returns {Contact}
   * @example
   * const bot = new Wechaty()
   * bot.on('room-invite', async roomInvitation => {
   *   const topic = await roomInvitation.topic()
   *   console.log(`received room invitation event from room ${topic}`)
   * }
   * .start()
   */
  public async topic (): Promise<string> {
    const payload = await this.puppet.roomInvitationPayload(this.id)

    // roomTopic deprecated. use topic instead:
    return payload.topic || payload.topic || ''
  }

  /**
   * @deprecated: use topic() instead
   * @ignore
   */
  public async roomTopic (): Promise<string> {
    return this.topic()
  }

  public async memberCount (): Promise<number> {
    log.verbose('RoomInvitation', 'memberCount()')

    const payload = await this.puppet.roomInvitationPayload(this.id)

    // roomMemberCount deprecated. use memberCount instead:
    return payload.memberCount || payload.memberCount || 0
  }

  /**
   * @deprecated: use memberCount() instead
   * @ignore
   */
  public async roomMemberCount (): Promise<number> {
    log.warn('RoomInvitation', 'roomMemberCount() DEPRECATED. use memberCount() instead.')
    return this.memberCount()
  }

  /**
   * List of Room Members that you known(is friend)
    * @ignore
   */
  public async memberList (): Promise<Contact[]> {
    log.verbose('RoomInvitation', 'roomMemberList()')

    const payload = await this.puppet.roomInvitationPayload(this.id)

    // roomMemberIdList deprecated. use memberIdList isntead.
    const contactIdList = payload.memberIdList || payload.memberIdList || []

    const contactList = contactIdList.map(
      id => this.wechaty.Contact.load(id),
    )
    await Promise.all(
      contactList.map(
        c => c.ready(),
      ),
    )

    return contactList
  }

  /**
   * @deprecated: use memberList() instead.
   * @ignore
   */
  public async roomMemberList (): Promise<Contact[]> {
    log.warn('RoomInvitation', 'roomMemberList() DEPRECATED. use memberList() instead.')
    return this.roomMemberList()
  }

  /**
   * Get the invitation time
   *
   * @returns {Promise<Date>}
   */
  public async date (): Promise<Date> {
    log.verbose('RoomInvitation', 'date()')

    const payload = await this.puppet.roomInvitationPayload(this.id)
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
  public async age (): Promise<number> {
    const recvDate = await this.date()

    const ageMilliseconds = Date.now() - recvDate.getTime()
    const ageSeconds = Math.floor(ageMilliseconds / 1000)

    return ageSeconds
  }

  /**
   * Load the room invitation info from disk
   *
   * @returns {RoomInvitation}
   * @example
   * const bot = new Wechaty()
   * const dataFromDisk // get the room invitation info data from disk
   * const roomInvitation = await bot.RoomInvitation.fromJSON(dataFromDisk)
   * await roomInvitation.accept()
   */
  public static async fromJSON (
    payload: string | RoomInvitationPayload,
  ): Promise<RoomInvitation> {
    log.verbose('RoomInvitation', 'fromJSON(%s)',
      typeof payload === 'string'
        ? payload
        : JSON.stringify(payload),
    )

    if (typeof payload === 'string') {
      payload = JSON.parse(payload) as RoomInvitationPayload
    }

    await this.puppet.roomInvitationPayload(payload.id, payload)

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
  public async toJSON (): Promise<string> {
    log.verbose('RoomInvitation', `toJSON()`)
    const payload = await this.puppet.roomInvitationPayload(this.id)
    return JSON.stringify(payload)
  }

}
