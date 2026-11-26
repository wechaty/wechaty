/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
import {
  log,
  type EventEmitter,
}                          from 'wechaty-puppet'

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

class WechatyImpl extends validationMixin(WechatyImplBase)<Wechaty>() {}

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
    listener: (this: Wechaty, event: WechatyCustomEvent<E>) => void | Promise<void>,
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
    listener: (this: Wechaty, event: WechatyCustomEvent<E>) => void | Promise<void>,
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
  on:   <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E], options?: AddEventListenerOptions) => Wechaty

  /**
   * Removes a previously registered listener callback.
   *
   * @deprecated Use `removeEventListener(type, listener)` instead. Will be removed in Wechaty v3.0.
   */
  off:  <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E], options?: EventListenerOptions) => Wechaty

  /**
   * Registers a one-time listener callback for the specified Wechaty event.
   *
   * @deprecated Use `addEventListener(type, listener, { once: true })` instead. Will be removed in Wechaty v3.0.
   */
  once: <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E]) => Wechaty

  /**
   * Registers a listener callback for the specified Wechaty event.
   *
   * @deprecated Use `addEventListener(type, listener, options)` instead. Will be removed in Wechaty v3.0.
   */
  addListener: <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E]) => Wechaty

  /**
   * Removes a previously registered listener callback.
   *
   * @deprecated Use `removeEventListener(type, listener)` instead. Will be removed in Wechaty v3.0.
   */
  removeListener: <E extends keyof WechatyEventListeners>(event: E, listener: WechatyEventListeners[E]) => Wechaty
}

type Wechaty = Omit<WechatyImplInterface, AllProtectedProperty>
  & WechatyEventEmitter

/**
 * @deprecated Use `Wechaty` instead. `WechatyInterface` is retained for backwards compatibility.
 */
type WechatyInterface = Wechaty

/** Internal alias for the instance type when distinguishing from the constructor */
type WechatyInstance = Wechaty

/**
 * Static methods exposed on the `Wechaty` constructor namespace.
 */
interface WechatyStatic {
  /**
   * Returns a shared singleton instance of `Wechaty`.
   *
   * @param options - Initialization options for the singleton (only applied on the first call).
   */
  singleton (options?: WechatyOptions): Wechaty
  /**
   * Type guard to verify whether an unknown target is a valid Wechaty instance.
   */
  valid (target: unknown): target is Wechaty
}

/**
 * Type representing the constructible `Wechaty` class constructor with attached static methods.
 */
type WechatyConstructor = {
  new (options?: WechatyOptions): Wechaty
} & Omit<typeof WechatyImpl, 'new'> & WechatyStatic

let _singletonInstance: Wechaty | undefined

/**
 * Attaches the `singleton` static factory method to `WechatyImpl`.
 * Using `Object.defineProperty` avoids TypeScript static typing collision with the underlying
 * mixin inheritance chain while maintaining runtime availability.
 */
Object.defineProperty(WechatyImpl, 'singleton', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: function singleton (options?: WechatyOptions): Wechaty {
    if (_singletonInstance) {
      if (options && Object.keys(options).length > 0) {
        log.warn('Wechaty', 'singleton() options were passed but a singleton instance already exists; existing instance returned.')
      }
      return _singletonInstance
    }
    _singletonInstance = new WechatyImpl(options)
    return _singletonInstance
  },
})

/**
 * Modern Wechaty bot constructor and canonical instance type.
 *
 * Implements TypeScript Type-Value Declaration Merging:
 * - As a value: constructible via `new Wechaty(options)` with static methods `singleton()` and `valid()`.
 * - As a type: represents the pure doc-typed bot instance with all protected and mixin internals omitted.
 */
const Wechaty = WechatyImpl as unknown as WechatyConstructor

export  {
  Wechaty,
  type WechatyInterface,
  type WechatyInstance,
  type WechatyConstructor,
  type WechatyStatic,
  type AllProtectedProperty,
  WechatyImpl,
}
