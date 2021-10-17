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
  stateMixin,
  tagMixin,
}                        from '../mixins/mod.js'

import { PuppetSkelton }    from './skelton.js'

/**
 * Huan(202110): use compose() to compose mixins
 */
const MixinBase = miscMixin(
  messageMixin(
    roomInvitationMixin(
      tagMixin(
        friendshipMixin(
          roomMixin(
            roomMemberMixin(
              contactMixin(
                loginMixin(
                  cacheMixin(
                    stateMixin(
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
  static readonly VERSION = VERSION

  /**
   * childPkg stores the `package.json` that the NPM module who extends the `Puppet`
   */
  // Huan(202108): Remove this property, because it the `hot-import` module is not a ESM compatible one
  // private readonly childPkg: normalize.Package

  /**
   *
   *
   * Constructor
   *
   *
   */
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
   */
  abstract onStart (): Promise<void>
  /**
   * The child puppet provider should put all start code inside `onStop()`
   *  becasue the `stop()` will call `onStop()` with the state management.
   */
  abstract onStop  (): Promise<void>

  override async start () : Promise<void> {
    log.verbose('Puppet', 'start()')

    if (this.state.on()) {
      log.warn('Puppet', 'start() found that is starting/statred...')
      await this.state.ready('on')
      log.warn('Puppet', 'start() found that is starting/statred... done')
      return
    }

    if (this.state.off() === 'pending') {
      log.warn('Puppet', 'start() found that is stopping...')

      const TIMEOUT_SECONDS = 5
      const timeoutFuture = new Promise((resolve, reject) => {
        void resolve
        setTimeout(
          () => reject(new Error(TIMEOUT_SECONDS + ' seconds timeout')),
          TIMEOUT_SECONDS * 1000,
        )
      })

      try {
        await Promise.all([
          this.state.ready('off'),
          timeoutFuture,
        ])
        log.warn('Wechaty', 'start() found that is stopping, waiting stable ... done')
      } catch (e) {
        log.warn('Wechaty', 'start() found that is stopping, waiting stable ... %s',
          (e as Error).message,
        )
      }
    }

    this.state.on('pending')

    try {
      /**
       * Call all the mixins start()
       */
      await super.start()
      /**
       * Call the child provider start()
       */
      await this.onStart()

      /**
       * The puppet has been successfully started
       */
      this.state.on(true)

    } catch (e) {
      /**
       * The puppet has not been started
       */
      log.error('Puppet', 'start() rejection: %s', (e as Error).message)
      await this.stop()
      throw e
    }
  }

  override async stop (): Promise<void> {
    log.verbose('Puppet', 'stop()')

    if (this.state.off()) {
      log.warn('Puppet', 'stop() found that is stopping/stopped...')
      await this.state.ready()
      log.warn('Puppet', 'stop() found that is stopping/stopped... done')
      return
    }

    if (this.state.on() === 'pending') {
      log.warn('Puppet', 'stop() found that is starting...')
      const TIMEOUT_SECONDS = 5
      const timeoutFuture = new Promise((resolve, reject) => {
        void resolve
        setTimeout(
          () => reject(new Error(TIMEOUT_SECONDS + ' seconds timeout')),
          TIMEOUT_SECONDS * 1000,
        )
      })

      try {
        await Promise.all([
          this.state.ready('on'),
          timeoutFuture,
        ])
        log.warn('Wechaty', 'stop() found that is starting, waiting stable ... done')
      } catch (e) {
        log.warn('Wechaty', 'stop() found that is starting, waiting stable ... %s',
          (e as Error).message,
        )
      }
    }

    this.state.off('pending')

    try {
      /**
       * Call the child provider stop()
       */
      await this.onStop()
      /**
       * Call all the mixins stop()
       */
      await super.stop()

    } catch (e) {
      /**
       * The puppet has not been stopped
       */
      log.error('Puppet', 'start() rejection: %s', (e as Error).message)
      throw e

    } finally {
      /**
       * Put the puppet into a stopped state
       *  no matter the `onStop()` success or fail
       */
      this.state.off(true)
    }
  }

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
        throw new Error('unknown payload type: ' + type)
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
