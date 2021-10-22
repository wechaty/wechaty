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
  validateMixin,
}                        from '../mixins/mod.js'

import { PuppetSkelton } from './skelton.js'

/**
 * Huan(202110): use compose() to compose mixins
 */
const MixinBase = miscMixin(
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
   *
   * `onStop()` is the same as the `onStart()`
   *  @see https://github.com/wechaty/puppet/issues/163
   */
  abstract onStart (): Promise<void>
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
        this.emitError(e)
      }
    }

    this.state.on('pending')

    try {
      /**
       * start parent(super) first, then self(this)
       */
      await super.start()
      if (!this.calledSkeltonStart) {
        throw new Error([
          'All mixin classes should propogate the `start()` call to its base class.',
          '@see https://github.com/wechaty/puppet/issues/156',
        ].join('\n'))
      }
      log.verbose('Puppet', 'start() super.start() done')

      await this.onStart()
      log.verbose('Puppet', 'start() this.onStart() done')

      /**
       * the puppet has been successfully started
       */
      this.state.on(true)

    } catch (e) {
      this.emitError(e)
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
        this.emitError(e)
      }
    }

    this.state.off('pending')

    try {
      /**
       * stop self(this) first, then (parent) super
       */
      await this.onStop()
      log.verbose('Puppet', 'stop() this.stop() done')
    } catch (e) {
      this.emitError(e)
    }

    try {
      await super.stop()
      if (!this.calledSkeltonStop) {
        throw new Error([
          'All mixin classes should propogate the `stop()` call to its base class.',
          '@see https://github.com/wechaty/puppet/issues/156',
        ].join('\n'))
      }
      log.verbose('Puppet', 'stop() super.stop() done')
    } catch (e) {
      this.emitError(e)
    }

    /**
     * no matter whether the `try {...}` code success or not
     *  set the puppet state to off(stopped) state
     */
    this.state.off(true)
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
