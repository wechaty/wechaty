import type { EventEmitter }  from 'events'

import type { Constructor } from '../deprecated/clone-class.js'

import type { Wechaty }             from '../wechaty.js'
import type { WechatyEventListeners } from '../events/wechaty-events.js'
import type TypedEventEmitter from 'typed-emitter'

type DeprecatedProperties = never
  | 'userSelf'

type NonInterfaceProperties = never
  | 'log'
  | 'options'
  | 'pluginUninstallerList'
  | 'readyState'
  | 'sleep'
  | 'waitForMessage'
  | 'wechaty'

// type WechatyUserClass = never
//   | 'Contact'
//   | 'ContactSelf'
//   | 'Friendship'
//   | 'Image'
//   | 'Location'
//   | 'Message'
//   | 'MiniProgram'
//   | 'Moment'
//   | 'Money'
//   | 'Room'
//   | 'RoomInvitation'
//   | 'Tag'
//   | 'UrlLink'

// https://stackoverflow.com/a/64754408/1123955
type KeyOfWechaty       = keyof Wechaty
// Huan(202110): remove all EventEmitter first, or will get error
type KeyOfEventEmitter  = keyof EventEmitter

type PublicProperties = Exclude<KeyOfWechaty, never
  | DeprecatedProperties
  | KeyOfEventEmitter
  | NonInterfaceProperties
  // | WechatyUserClass
>

// https://stackoverflow.com/questions/41926269/naming-abstract-classes-and-interfaces-in-typescript
type WechatyInterface = Pick<Wechaty, PublicProperties>
  & TypedEventEmitter<WechatyEventListeners>

type WechatyConstructor = Constructor<
  WechatyInterface,
  typeof Wechaty
>

export type {
  WechatyInterface,
  WechatyConstructor,
}
