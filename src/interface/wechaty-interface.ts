import type { EventEmitter }  from 'events'

import type { Constructor } from '../deprecated/clone-class.js'

import type { WechatyImpl }             from '../wechaty.js'
import type { WechatyEventListeners } from '../events/wechaty-events.js'
import type TypedEventEmitter from 'typed-emitter'

type DeprecatedProperty =
  | 'userSelf'

type WechatyInternalProperty =
  | 'log'
  | '_pluginUninstallerList'
  | 'wechaty'
  | 'onStart'
  | 'onStop'
  // | '_serviceCtlFsmInterpreter'  // from ServiceCtlFsm
  | '_serviceCtlLogger'             // from ServiceCtl(&Fsm)
  | '_serviceCtlResettingIndicator' // from ServiceCtl
  | '_options'
  | '_readyState'
  | '_initPuppetInstance'
  | '_setupPuppetEventBridge'
  | 'memory'
  | '_wechatifyUserModules'
  | '_installGlobalPlugin'

type WechatyProtectedProperty =
  | DeprecatedProperty
  | keyof EventEmitter  // Huan(202110): remove all EventEmitter first, and added typed event emitter later: or will get error
  | WechatyInternalProperty

// https://stackoverflow.com/questions/41926269/naming-abstract-classes-and-interfaces-in-typescript
// type Wechaty2 = Pick<WechatyImpl, PublicProperties>
//   & TypedEventEmitter<WechatyEventListeners>

type Wechaty = Omit<WechatyImpl, WechatyProtectedProperty>
  & TypedEventEmitter<WechatyEventListeners>

type WechatyConstructor = Constructor<
  Wechaty,
  typeof WechatyImpl
>

export type {
  Wechaty,
  WechatyConstructor,
  WechatyProtectedProperty,
}
