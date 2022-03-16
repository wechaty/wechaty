import type { EventEmitter }  from 'events'
import type TypedEventEmitter from 'typed-emitter'

import type { Constructor }           from 'clone-class'
import type {
  WechatyMixinProtectedProperty,
}                                     from '../wechaty-mixins/mod.js'
import type { WechatyEventListeners } from '../schemas/mod.js'
import { validationMixin }            from '../user-mixins/mod.js'

import type {
  WechatySkeletonProtectedProperty,
}                                     from './wechaty-skeleton.js'
import {
  WechatyBase,
  WechatyBaseProtectedProperty,
}                                     from './wechaty-base.js'

/**
 * Huan(202111): this is for solving the circyle dependency problem
 *
 *  Construct a `WechatyImpl` based the `WechatyImplBase` with `validationMixin`
 *
 */
class WechatyImplBase extends validationMixin(WechatyBase)<WechatyImplInterface>() {}
interface WechatyImplInterface extends WechatyImplBase {}

class WechatyImpl extends validationMixin(WechatyImplBase)<WechatyInterface>() {}

/**
 * ^ The above code will make a ready-to-use class: `WechatyImpl`
 *  without any cyclic dependency problem.
 */

type AllProtectedProperty =
  | keyof EventEmitter  // Huan(202110): remove all EventEmitter first, and added typed event emitter later: or will get error
  | WechatyMixinProtectedProperty
  | WechatyBaseProtectedProperty
  | WechatySkeletonProtectedProperty
  | `_${string}`// remove all property from interface which is start with `_`

/**
 * Huan(202111):
 * `on`/`off`/`once` must use TypedEventEmitter<WechatyEventListeners> instead of WechatyImpl
 *    or will run into error: cyclic dependency?
 */
interface WechatyEventEmitter {
  on: AlterReturnType<TypedEventEmitter<WechatyEventListeners>['on'], WechatyInterface>
  off: AlterReturnType<TypedEventEmitter<WechatyEventListeners>['off'], WechatyInterface>
  once: AlterReturnType<TypedEventEmitter<WechatyEventListeners>['once'], WechatyInterface>
}

type AlterReturnType<Func extends Function, ReturnType> =
  Func extends (...args: infer Args) => any ? (...args: Args) => ReturnType : never

type WechatyInterface = Omit<WechatyImplInterface, AllProtectedProperty>
  & WechatyEventEmitter

type WechatyConstructor = Constructor<
  WechatyInterface,
  typeof WechatyImpl
>

export  {
  type WechatyInterface,
  type WechatyConstructor,
  type AllProtectedProperty,
  WechatyImpl,
}
