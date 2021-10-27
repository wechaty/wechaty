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
 *
 */
import {
  log,
  VERSION,
}                       from '../config.js'

import type {
  PuppetOptions,
}                       from '../schemas/mod.js'
import {
  PayloadType,
}                       from '../schemas/mod.js'
import { GError }       from '../gerror/gerror.js'

import {
  cacheMixin,
  contactMixin,
  friendshipMixin,
  loginMixin,
  memoryMixin,
  messageMixin,
  miscMixin,
  roomInvitationMixin,
  roomMemberMixin,
  roomMixin,
  serviceMixin,
  tagMixin,
  validateMixin,
}                        from '../mixins/mod.js'

import { PuppetSkelton } from './puppet-skelton.js'

/**
 * Huan(202110): use compose() to compose mixins
 */
const MixinBase = serviceMixin(
  miscMixin(
    validateMixin(
      messageMixin(
        roomInvitationMixin(
          tagMixin(
            friendshipMixin(
              roomMixin(
                roomMemberMixin(
                  contactMixin(
                    loginMixin(
                      cacheMixin(
                        memoryMixin(
                          PuppetSkelton,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
)

/**
 *
 * Puppet Base Class
 *
 * See: https://github.com/wechaty/wechaty/wiki/Puppet
 *
 */
abstract class Puppet extends MixinBase {

  /**
   * Must overwrite by child class to identify their version
   */
  static override readonly VERSION = VERSION

  constructor (
    public override options: PuppetOptions = {},
  ) {
    super(options)
    log.verbose('Puppet', 'constructor(%s)', JSON.stringify(options))
  }

  override toString () {
    return [
      'Puppet#',
      this.counter,
      '<',
      this.constructor.name,
      '>',
      '(',
      this.memory.name || 'NONAME',
      ')',
    ].join('')
  }

  /**
   * The child puppet provider should put all start code inside `onStart()`
   *  becasue the `start()` will call `onStart()` with the state management.
   *
   * `onStop()` is the same as the `onStart()`
   *  @see https://github.com/wechaty/puppet/issues/163
   */
  abstract override onStart (): Promise<void>
  abstract override onStop  (): Promise<void>

  /**
   *
   * dirty payload methods
   *  See: https://github.com/Chatie/grpc/pull/79
   *
   */

  async dirtyPayload (type: PayloadType, id: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayload(%s<%s>, %s)', PayloadType[type], type, id)

    switch (type) {
      case PayloadType.Message:
        return this.dirtyPayloadMessage(id)
      case PayloadType.Contact:
        return this.dirtyPayloadContact(id)
      case PayloadType.Room:
        return this.dirtyPayloadRoom(id)
      case PayloadType.RoomMember:
        return this.dirtyPayloadRoomMember(id)
      case PayloadType.Friendship:
        return this.dirtyPayloadFriendship(id)

      default:
        throw GError.from('unknown payload type: ' + type)
    }
  }

  // private async dirtyPayloadContact (contactId: string): Promise<void> {
  //   log.verbose('Puppet', 'dirtyPayloadContact(%s)', contactId)
  //   this.payloadCache.contact.delete(contactId)
  // }

  private async dirtyPayloadFriendship (friendshipId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadFriendship(%s)', friendshipId)
    this.cache.friendship.delete(friendshipId)
  }

  private async dirtyPayloadMessage (messageId: string): Promise<void> {
    log.verbose('Puppet', 'dirtyPayloadMessage(%s)', messageId)
    this.cache.message.delete(messageId)
  }

}

export {
  Puppet,
}
export default Puppet
