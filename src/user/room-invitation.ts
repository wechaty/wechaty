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
}               from '../accessory'
import {
  log,
}               from '../config'
import {
  Acceptable,
}               from '../types'

import {
  Contact,
}               from './contact'

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
   * @ignore
   * Instance Properties
   *
   */
  constructor (
    public id: string,
  ) {
    super()
    log.verbose('RoomInvitation', 'constructor(id=%s)', id)

    // tslint:disable-next-line:variable-name
    const MyClass = instanceToClass(this, RoomInvitation)

    if (MyClass === RoomInvitation) {
      throw new Error('RoomInvitation class can not be instanciated directly! See: https://github.com/Chatie/wechaty/issues/1217')
    }

    if (!this.puppet) {
      throw new Error('RoomInvitation class can not be instanciated without a puppet!')
    }
  }

  public toString () {
    return [
      'RoomInvitation#',
      this.id || 'loading'
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
      payload.roomTopic,
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
                                  e && e.message || e,
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
    return payload.roomTopic
  }

  /**
   * @deprecated: use topic() instead
   */
  public async roomTopic (): Promise<string> {
    return this.topic()
  }

  public async roomMemberCount (): Promise<number> {
    log.verbose('RoomInvitation', 'roomMemberCount()')

    const payload = await this.puppet.roomInvitationPayload(this.id)
    return payload.roomMemberCount
  }

  /**
   * List of Room Members that you known(is friend)
   * @ignore
   */
  public async roomMemberList (): Promise<Contact[]> {
    log.verbose('RoomInvitation', 'roomMemberList()')

    const payload = await this.puppet.roomInvitationPayload(this.id)
    const contactIdList = payload.roomMemberIdList

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
   * Get the invitation time
   *
   * @returns {Promise<Date>}
   */
  public async date (): Promise<Date> {
    log.verbose('RoomInvitation', 'date()')

    const payload = await this.puppet.roomInvitationPayload(this.id)
    // convert the unit timestamp to milliseconds
    // (from seconds to milliseconds)
    return new Date(1000 * payload.timestamp)
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

}
