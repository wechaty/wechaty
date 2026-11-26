import type { EventEmitter }  from 'wechaty-puppet'

import type {
  WechatyMixinProtectedProperty,
}                                     from '../wechaty-mixins/mod.ts'
import type {
  WechatyEventListeners,
  WechatyEventDetailMap,
  WechatyCustomEvent,
} from '../schemas/mod.ts'
import type { WechatyOptions }        from '../schemas/wechaty-options.ts'
import { validationMixin }            from '../user-mixins/mod.ts'

import type {
  WechatySkeletonProtectedProperty,
}                                     from './wechaty-skeleton.ts'
import {
  WechatyBase,
  type WechatyBaseProtectedProperty,
}                                     from './wechaty-base.ts'

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
  | Exclude<keyof EventEmitter, symbol>  // Huan(202110): remove all EventEmitter first, and added typed event emitter later: or will get error
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
  /**
   * Registers an event listener on the Wechaty bot instance using the standard WinterTC EventTarget interface.
   *
   * @param type - Name of the Wechaty event (e.g. 'message', 'scan', 'login', 'ready', 'error').
   * @param listener - Callback receiving the CustomEvent with `event.detail`.
   * @param options - Standard AddEventListenerOptions, including native `{ signal: abortSignal, once: boolean }`.
   */
  addEventListener<E extends keyof WechatyEventDetailMap>(
    type: E,
    listener: (this: WechatyInterface, event: WechatyCustomEvent<E>) => void | Promise<void>,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void

  /**
   * Removes an event listener previously registered with `addEventListener`.
   *
   * @param type - Name of the Wechaty event.
   * @param listener - Listener callback to remove.
   * @param options - Standard EventListenerOptions.
   */
  removeEventListener<E extends keyof WechatyEventDetailMap>(
    type: E,
    listener: (this: WechatyInterface, event: WechatyCustomEvent<E>) => void | Promise<void>,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void

  /**
   * Dispatches an event on the Wechaty instance.
   *
   * @param event - Standard Event to dispatch.
   */
  dispatchEvent(event: Event): boolean

  /**
   * Registers a listener callback for the specified Wechaty event.
   *
   * @deprecated Use `addEventListener(type, listener, options)` instead. Will be removed in Wechaty v3.0.
   */
  on:   <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E], options?: AddEventListenerOptions) => WechatyInterface

  /**
   * Removes a previously registered listener callback.
   *
   * @deprecated Use `removeEventListener(type, listener)` instead. Will be removed in Wechaty v3.0.
   */
  off:  <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E], options?: EventListenerOptions) => WechatyInterface

  /**
   * Registers a one-time listener callback for the specified Wechaty event.
   *
   * @deprecated Use `addEventListener(type, listener, { once: true })` instead. Will be removed in Wechaty v3.0.
   */
  once: <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E]) => WechatyInterface

  /**
   * Registers a listener callback for the specified Wechaty event.
   *
   * @deprecated Use `addEventListener(type, listener, options)` instead. Will be removed in Wechaty v3.0.
   */
  addListener: <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E]) => WechatyInterface

  /**
   * Removes a previously registered listener callback.
   *
   * @deprecated Use `removeEventListener(type, listener)` instead. Will be removed in Wechaty v3.0.
   */
  removeListener: <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E]) => WechatyInterface
}

type WechatyInterface = Omit<WechatyImplInterface, AllProtectedProperty>
  & WechatyEventEmitter

interface WechatyStatic {
  singleton (options?: WechatyOptions): WechatyInterface
  valid (target: unknown): target is WechatyInterface
}

type WechatyConstructor = {
  new (options?: WechatyOptions): WechatyInterface
} & Omit<typeof WechatyImpl, 'new'> & WechatyStatic

let _singletonInstance: WechatyInterface | undefined

Object.defineProperty(WechatyImpl, 'singleton', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: function singleton (options?: WechatyOptions): WechatyInterface {
    if (!_singletonInstance) {
      _singletonInstance = new WechatyImpl(options)
    }
    return _singletonInstance
  },
})

const Wechaty = WechatyImpl as unknown as WechatyConstructor
type Wechaty = WechatyInterface

export  {
  Wechaty,
  type WechatyInterface,
  type WechatyConstructor,
  type WechatyStatic,
  type AllProtectedProperty,
  WechatyImpl,
}
