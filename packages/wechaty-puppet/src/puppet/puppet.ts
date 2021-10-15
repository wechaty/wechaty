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
import type { Constructor }     from 'clone-class'
import { StateSwitch }          from 'state-switch'

import {
  log,
  NAME,
  VERSION,
}                       from '../config.js'

import type {
  EventLoginPayload,
  PuppetOptions,
}                       from '../schemas/mod.js'
import {
  PayloadType,
}                       from '../schemas/mod.js'

import {
  contactMixin,
  friendshipMixin,
  messageMixin,
  roomInvitationMixin,
  roomMixin,
  tagMixin,
  memoryMixin,
  cacheMixin,
  watchdogMixin,
}                     from '../mixins/mod.js'

import { PuppetSkelton } from './skelton.js'

let PUPPET_COUNTER = 0

const MixinBase = messageMixin(
  roomInvitationMixin(
    tagMixin(
      friendshipMixin(
        roomMixin(
          contactMixin(
            memoryMixin(
              cacheMixin(
                watchdogMixin(
                  PuppetSkelton,
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

  protected readonly counter : number

  readonly state: StateSwitch

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
    super()

    this.counter = PUPPET_COUNTER++
    log.verbose('Puppet', 'constructor(%s) #%d', JSON.stringify(options), this.counter)

    this.state    = new StateSwitch(this.constructor.name, { log })
    {
      /* eslint  no-lone-blocks: off */
      // Huan(202108): remove this code block because it's unclear what it does

      /**
       * 4. Load the package.json for Puppet Plugin version range matching
       *
       * For: dist/src/puppet/puppet.ts
       *  We need to up 3 times: ../../../package.json
       */
      // try {
      //   const childClassPath = callerResolve('.', __filename)
      //   log.verbose('Puppet', 'constructor() childClassPath=%s', childClassPath)

      //   this.childPkg = readPkgUp.readPackageUpSync({ cwd: childClassPath })!.packageJson
      // } catch (e) {
      //   log.error('Puppet', 'constructor() %s', e)
      //   throw e
      // }

      // if (!this.childPkg) {
      //   throw new Error('Cannot found package.json for Puppet Plugin Module')
      // }

      // normalize(this.childPkg)
    }

  }

  override toString () {
    return [
      'Puppet#',
      this.counter,
      '<',
      this.constructor.name,
      '>',
      '(',
      this.memory.name || '',
      ')',
    ].join('')
  }

  /**
   * Unref
   */
  unref (): void {
    log.verbose('Puppet', 'unref()')
    // this.watchdog.unref()
  }

  /**
   *
   *
   * Start / Stop
   *
   *
   */
  override async start () : Promise<void> {
    log.verbose('Puppet', 'start()')
    await super.start()
  }

  override async stop (): Promise<void> {
    log.verbose('Puppet', 'stop()')
    await super.stop()
  }

  /**
   *
   *
   * Login / Logout
   *
   *
   */

  /**
   * Need to be called internally when the puppet is logined.
   * this method will emit a `login` event
   */
  protected async login (userId: string): Promise<void> {
    log.verbose('Puppet', 'login(%s)', userId)

    if (this.id) {
      throw new Error('must logout first before login again!')
    }

    this.id = userId
    // console.log('this.id=', this.id)

    const payload: EventLoginPayload = {
      contactId: userId,
    }

    this.emit('login', payload)
  }

  /**
   * Need to be called internally/externally when the puppet need to be logouted
   * this method will emit a `logout` event,
   *
   * Note: must set `this.id = undefined` in this function.
   */
  async logout (reason = 'logout()'): Promise<void> {
    log.verbose('Puppet', 'logout(%s)', this.id)

    if (!this.id) {
      throw new Error('must login first before logout!')
    }

    this.emit('logout', {
      contactId : this.id,
      data      : reason,
    })

    this.id = undefined
  }

  selfId (): string {
    log.verbose('Puppet', 'selfId()')

    if (!this.id) {
      throw new Error('not logged in, no this.id yet.')
    }

    return this.id
  }

  logonoff (): boolean {
    if (this.id) {
      return true
    } else {
      return false
    }
  }

  /**
   *
   *
   * Misc
   *
   *
   */
  /**
   * Check whether the puppet is work property.
   * @returns `false` if something went wrong
   *          'dong' if everything is OK
   */
  abstract ding (data?: string) : void

  /**
   * Get the NPM name of the Puppet
   */
  name (): string {
    return NAME
  }

  /**
   * Get version from the Puppet Implementation
   */
  version (): string {
    return VERSION
  }

  /**
   * will be used by semver.satisfied(version, range)
   */
  wechatyVersionRange (strict = false): string {
    // FIXME: for development, we use `*` if not set
    if (strict) {
      return '^0.16.0'
    }

    return '*'

    // TODO: test and uncomment the following codes after promote the `wehcaty-puppet` as a solo NPM module

    // if (this.pkg.dependencies && this.pkg.dependencies.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation should add `wechaty` from `dependencies` to `peerDependencies` in package.json')
    // }

    // if (!this.pkg.peerDependencies || !this.pkg.peerDependencies.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation should add `wechaty` to `peerDependencies`')
    // }

    // if (!this.pkg.engines || !this.pkg.engines.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation must define `package.engines.wechaty` for a required Version Range')
    // }

    // return this.pkg.engines.wechaty
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
