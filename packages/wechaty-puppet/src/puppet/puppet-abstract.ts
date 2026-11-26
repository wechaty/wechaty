/**
 * The abstract `Puppet` class: `PuppetSkeleton` with every mixin applied. Provider
 * puppets extend it and implement its abstract methods.
 */
/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan Li <huan@chatie.io>
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
}                       from '../config.ts'

import type {
  PuppetOptions,
}                       from '../schemas/mod.ts'

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
  type MixinProtectedProperty,
}                        from '../mixins/mod.ts'

import {
  PuppetSkeleton,
  type PuppetSkeletonProtectedProperty,
}                        from './puppet-skeleton.ts'

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
abstract class PuppetImpl extends MixinBase {

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

/**
 * Preserves canonical class name `Puppet` for runtime reflection and `looseInstanceOfClass`
 * compatibility across duplicate package installations.
 */
Object.defineProperty(PuppetImpl, 'name', {
  configurable: true,
  value: 'Puppet',
})

/**
 * Union of protected and internal properties across mixins and PuppetSkeleton
 * that are omitted from the canonical doc-typed `Puppet` interface.
 */
type PuppetProtectedProperty =
  | MixinProtectedProperty
  | PuppetSkeletonProtectedProperty

/**
 * Pure doc-typed interface contract for puppet instances, omitting all internal
 * mixin state, protected properties, and private members prefixed with `_`.
 *
 * @see https://stackoverflow.com/questions/44983560/how-to-exclude-a-key-from-an-interface-in-typescript
 */
type Puppet = Omit<
  PuppetImpl,
  PuppetProtectedProperty | `_${string}`
>

/**
 * Abstract class constructor type for `Puppet`.
 *
 * Explicitly declares `readonly prototype: Puppet` while omitting `prototype` from `PuppetImpl`.
 * This guarantees that `instanceof Puppet` type-narrowing resolves strictly to the pure doc-typed
 * `Puppet` interface without leaking protected or internal properties from `PuppetImpl`, while
 * allowing puppet providers to extend `Puppet` and access protected implementation methods.
 */
type PuppetAbstractConstructor = (abstract new (...args: any[]) => PuppetImpl) & {
  readonly prototype: Puppet
} & Omit<typeof PuppetImpl, 'prototype'>

/**
 * Modern Puppet abstract base class and canonical instance type.
 *
 * Implements TypeScript Type-Value Declaration Merging:
 * - As a value: constructible abstract class constructor for provider subclasses (`class PuppetMock extends Puppet`).
 * - As a type: represents the pure doc-typed puppet instance with all protected and mixin internals omitted.
 *
 * The cast is necessary because runtime class `PuppetImpl` contains mixin implementation details
 * and protected methods that the public `Puppet` interface and `prototype: Puppet` omit for 100% doc-typing.
 */
const Puppet = PuppetImpl as unknown as PuppetAbstractConstructor

export {
  Puppet,
  PuppetImpl,
  type PuppetProtectedProperty,
}
