import type { EventEmitter }  from 'events'
import type TypedEventEmitter from 'typed-emitter'

import type { Constructor } from '../deprecated/clone-class.js'

import type {
  WechatyImpl,
  WechatyImplProtectedProperty,
}                                     from '../wechaty.js'
import type {
  WechatyMixinProtectedProperty,
}                                     from '../wechaty-mixins/mod.js'
import type { WechatyEventListeners } from '../events/mod.js'

type AllProtectedProperty =
  | keyof EventEmitter  // Huan(202110): remove all EventEmitter first, and added typed event emitter later: or will get error
  | WechatyMixinProtectedProperty
  | WechatyImplProtectedProperty
  | `_${string}`// remove all property from interface which is start with `_`

/**
 * Huan(202111):
 * `on`/`off`/`once` must use TypedEventEmitter<WechatyEventListeners> instead of WechatyImpl
 *    or will run into error: cyclic dependency?
 */
interface WechatyEventEmitter {
  on   : TypedEventEmitter<WechatyEventListeners>['on']
  off  : TypedEventEmitter<WechatyEventListeners>['off']
  once : TypedEventEmitter<WechatyEventListeners>['once']
}

type WechatyInterface = Omit<WechatyImpl, AllProtectedProperty>
  & WechatyEventEmitter

type WechatyConstructor = Constructor<
  WechatyInterface,
  typeof WechatyImpl
>

export type {
  WechatyInterface,
  WechatyConstructor,
  AllProtectedProperty,
}
