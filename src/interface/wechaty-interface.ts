import type { EventEmitter }  from 'events'

import type { Constructor } from '../deprecated/clone-class.js'

import type {
  WechatyImpl,
  WechatyImplProtectedProperty,
}                                     from '../wechaty.js'
import type {
  WechatyMixinProtectedProperty,
}                                     from '../wechaty-mixins/mod.js'

type AllProtectedProperty =
  | keyof EventEmitter  // Huan(202110): remove all EventEmitter first, and added typed event emitter later: or will get error
  | WechatyMixinProtectedProperty
  | WechatyImplProtectedProperty
  | `_${string}`// remove all property from interface which is start with `_`

interface WechatyEventEmitter {
  on                  : WechatyImpl['on']
  off                 : WechatyImpl['off']
  once                : WechatyImpl['once']
  addEventListener    : WechatyImpl['addEventListener']
  removeEventListener : WechatyImpl['removeEventListener']
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
