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
import { function as FP } from 'fp-ts'

import {
  log,
  VERSION,
}                       from '../config.js'

import type {
  PuppetOptions,
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
  serviceMixin,
  tagMixin,
  validateMixin,
  readyMixin,
  postMixin,
  sayableMixin,
  tapMixin,
}                        from '../mixins/mod.js'

import { PuppetSkeleton } from './puppet-skeleton.js'

/**
 * Mixins with Functional Programming: compose / pipe
 *  related discussion: https://github.com/wechaty/puppet/pull/173
 */
const PipedBase = FP.pipe(
  PuppetSkeleton,
  memoryMixin,
  loginMixin,
  cacheMixin,
  contactMixin,
  roomMemberMixin,
  roomMixin,
  friendshipMixin,
  tagMixin,
  roomInvitationMixin,
  messageMixin,
  miscMixin,
  serviceMixin,
  readyMixin,
  postMixin,
  sayableMixin,
  tapMixin,
  // TODO: validateMixin,
)

/**
 * Huan(202111): validateMixin can not put in the piped list,
 *  because it import-ed the `PuppetInterface` which is depended on `PuppetImpl`
 *  which caused circle-dependency.
 *
 * TODO: put `validateMixin` back in to piped list
 */
const MixinBase = validateMixin(PipedBase)

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
   *
   * Huan(202111): we must put the `VERSION` in the outter side of all the Mixins
   *  because we do not know which Mixin will override the `VERSION`
   */
  static override readonly VERSION = VERSION

  constructor (
    options: PuppetOptions = {},
  ) {
    super(options)
    log.verbose('Puppet', 'constructor(%s)', JSON.stringify(options))
  }

  /**
   * The child puppet provider should put all start code inside `onStart()`
   *  becasue the `onStart()` with be called by `start()` inside state management.
   *
   * The `try {} catch () {}` is not necessary inside `onStart()`
   *  because it will be handled by the framework.
   *
   * `onStop()` is the same as the `onStart()`
   *
   *  @see https://github.com/wechaty/puppet/issues/163
   */
  abstract override onStart (): Promise<void>
  abstract override onStop  (): Promise<void>

}

export {
  Puppet,
}
