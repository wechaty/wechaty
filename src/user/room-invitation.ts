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
import {
  Room,
}               from './room'

export class RoomInvitation extends Accessory implements Acceptable {

  public static load<T extends typeof RoomInvitation> (
    this : T,
    id   : string,
  ): T['prototype'] {
    const newRoomInvitation = new (this as any)(id)
    return newRoomInvitation
  }

  /**
   *
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
      this.id
    ].join('')
  }

  public async toStringAsync (): Promise<string> {
    const payload = await this.puppet.roomInvitationPayload(this.id)
    return [
      'RoomInvitation#',
      this.id,
      '<',
      payload.roomId,
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

    const room    = await this.room()
    const inviter = await this.inviter()

    try {
      await room.ready()
      await inviter.ready()

      log.verbose('RoomInvitation', 'accept() with room(%s) & inviter(%s) ready()',
                                    await room.toStringAsync(),
                                    await inviter.toStringAsync(),
                  )
      return
    } catch (e) {
      log.warn('RoomInvitation', 'accept() room(%s) or inviter(%s) is not ready because of %s', room, inviter, e && e.message || e)
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
    const payload = await this.puppet.roomInvitationPayload(this.id)
    const inviter = this.wechaty.Contact.load(payload.inviterId)
    return inviter
  }

  /**
   * Get the room from room invitation
   *
   * @returns {Contact}
   * @example
   * const bot = new Wechaty()
   * bot.on('room-invite', async roomInvitation => {
   *   const room = await roomInvitation.room()
   *   const topic = await room.topic()
   *   console.log(`received room invitation event from room ${topic}`)
   * }
   * .start()
   */
  public async room (): Promise<Room> {
    const payload = await this.puppet.roomInvitationPayload(this.id)
    const room = this.wechaty.Room.load(payload.roomId)
    return room
  }

  public async date (): Promise<Date> {
    const payload = await this.puppet.roomInvitationPayload(this.id)
    // convert the unit timestamp to milliseconds
    // (from seconds to milliseconds)
    return new Date(1000 * payload.timestamp)
  }
}
