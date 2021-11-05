import type { EventEmitter }  from 'events'

import type { Constructor } from '../deprecated/clone-class.js'

import type {
  WechatyImpl,
  WechatyImplProtectedProperty,
}                                     from '../wechaty.js'
import type { WechatyEventListeners } from '../events/wechaty-events.js'
import type TypedEventEmitter from 'typed-emitter'
import type { WechatyMixinProtectedProperty } from '../wechaty-mixins/mod.js'
import type { TypedMiddleWareEventEmitter, WechatyMiddleWares } from '../middlewares/wechaty-middlewares.js'

type AllProtectedProperty =
  | keyof EventEmitter  // Huan(202110): remove all EventEmitter first, and added typed event emitter later: or will get error
  | WechatyMixinProtectedProperty
  | WechatyImplProtectedProperty
  | `_${string}`// remove all property from interface which is start with `_`

// https://stackoverflow.com/questions/41926269/naming-abstract-classes-and-interfaces-in-typescript
// type Wechaty2 = Pick<WechatyImpl, PublicProperties>
//   & TypedEventEmitter<WechatyEventListeners>

type WechatyInterface = Omit<WechatyImpl, AllProtectedProperty>
  & TypedEventEmitter<WechatyEventListeners> & TypedMiddleWareEventEmitter<WechatyEventListeners, WechatyMiddleWares>

type WechatyConstructor = Constructor<
  WechatyInterface,
  typeof WechatyImpl
>

export type {
  WechatyInterface,
  WechatyConstructor,
  AllProtectedProperty,
}
