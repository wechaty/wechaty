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
/**
 * Core Wechaty implementation and public constructor/type declaration merging.
 *
 * Why this module exists:
 * Assembles the full bot class from the mixin hierarchy (`WechatyBase` -> `validationMixin`)
 * without cyclic dependencies, and exports the unified `Wechaty` symbol via TypeScript
 * Type-Value Declaration Merging:
 * - As a type: Pure doc-typing (`Wechaty`), stripping all internal mixin and protected fields.
 * - As a value: Constructible class (`new Wechaty(options)`) with attached static methods (`singleton()`, `valid()`).
 *
 * Architectural boundaries:
 * Part of `wechaty`. Exports the constructible `Wechaty` value and instance type.
 * Internal mixin properties (`_stopCallbackList`, `__options`, etc.) are hidden from public doc-typing.
 *
 * Key relationships:
 * - `wechaty-base.ts`: Base mixin pipeline providing core lifecycle and services.
 * - `wechaty-builder.ts`: Backwards-compatible factory delegating to `new Wechaty()` and `Wechaty.singleton()`.
 * - `mods/mod.ts`: Public package root entry point re-exporting `Wechaty`.
 */
import {
  log,
  type EventIteratorOptions,
}                          from 'wechaty-puppet'

import type {
  WechatyMixinProtectedProperty,
}                                     from '../wechaty-mixins/mod.ts'
import type {
  WechatyEventDetailMap,
  WechatyCustomEvent,
} from '../schemas/mod.ts'
import type { MessageInterface }     from '../user-modules/mod.ts'
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

type LegacyEventEmitterProperty =
  | 'emit'
  | 'on'
  | 'off'
  | 'once'
  | 'addListener'
  | 'removeListener'
  | 'prependListener'
  | 'prependOnceListener'
  | 'removeAllListeners'
  | 'setMaxListeners'
  | 'getMaxListeners'
  | 'listenerCount'
  | 'rawListeners'
  | 'listeners'
  | 'eventNames'
  | 'addEventListener'
  | 'removeEventListener'
  | 'dispatchEvent'
  | 'next'
  | 'events'

type AllProtectedProperty =
  | LegacyEventEmitterProperty
  | WechatyMixinProtectedProperty
  | WechatyBaseProtectedProperty
  | WechatySkeletonProtectedProperty
  | `_${string}`// remove all property from interface which is start with `_`

interface WechatyEventTargetMethods {
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
   * Resolves the next occurrence of a typed Wechaty event as a single promise.
   *
   * @param type - Name of the event to await.
   * @param options - Optional signal to cancel waiting.
   * @returns Promise resolving to `event.detail`.
   */
  next<E extends keyof WechatyEventDetailMap>(
    type: E,
    options?: { signal?: AbortSignal },
  ): Promise<WechatyEventDetailMap[E]>
  next<T = unknown>(
    type: string,
    options?: { signal?: AbortSignal },
  ): Promise<T>

  /**
   * Returns an async iterable yielding typed event details for AI agent loops.
   *
   * @param type - Name of the event stream.
   * @param options - Backpressure, highWaterMark, and signal options.
   * @returns AsyncIterable yielding `event.detail`.
   */
  events<E extends keyof WechatyEventDetailMap>(
    type: E,
    options?: EventIteratorOptions,
  ): AsyncIterable<WechatyEventDetailMap[E]>
  events<T = unknown>(
    type: string,
    options?: EventIteratorOptions,
  ): AsyncIterable<T>

  /**
   * Primary AI Agent message stream loop yielding hydrated Message entities.
   *
   * @param options - Options controlling backpressure buffer and signal cancellation.
   * @returns AsyncIterable yielding hydrated Message entities.
   */
  messages (options?: EventIteratorOptions): AsyncIterable<MessageInterface>

  /**
   * Reactive message stream using native WHATWG Streams.
   *
   * @param options - Optional AbortSignal.
   * @returns ReadableStream of hydrated Message entities.
   */
  messageStream (options?: { signal?: AbortSignal }): ReadableStream<MessageInterface>

  /**
   * Standard AsyncDisposable implementation for `await using bot = ...`.
   */
  [Symbol.asyncDispose] (): Promise<void>
}

type Wechaty = Omit<WechatyImplInterface, AllProtectedProperty>
  & WechatyEventTargetMethods

/**
 * @deprecated Use `Wechaty` instead. `WechatyInterface` is retained for backwards compatibility.
 */
type WechatyInterface = Wechaty

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
  /**
   * Asynchronously creates and starts a Wechaty bot instance, designed for `await using bot = await Wechaty.start()`.
   *
   * @param options - Bot options.
   * @returns Promise resolving to the running Wechaty bot instance.
   */
  start (options?: WechatyOptions): Promise<Wechaty>
}

/**
 * Type representing the constructible `Wechaty` class constructor with attached static methods.
 *
 * Explicitly declares `readonly prototype: Wechaty` while omitting `prototype` from `WechatyImpl`.
 * This guarantees that `instanceof Wechaty` type-narrowing resolves strictly to the pure doc-typed
 * `Wechaty` interface without leaking protected or internal properties from `WechatyImpl`.
 */
type WechatyConstructor = {
  new (options?: WechatyOptions): Wechaty
  readonly prototype: Wechaty
} & Omit<typeof WechatyImpl, 'prototype'> & WechatyStatic

let _singletonInstance: Wechaty | undefined

/**
 * Attaches the `singleton` static factory method to `WechatyImpl`.
 * Using `Object.defineProperty` avoids TypeScript static typing collision with the underlying
 * mixin inheritance chain while maintaining runtime availability.
 *
 * Singleton contract:
 * - Options are applied on the first invocation to create the singleton instance.
 * - Subsequent calls return the existing singleton instance (shared with `WechatyBuilder.singleton()`).
 * - If non-empty options are provided to subsequent calls, a warning is logged.
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
    _singletonInstance = new WechatyImpl(options) as unknown as Wechaty
    return _singletonInstance
  },
})

/**
 * Attaches the `start` static factory method to `WechatyImpl`.
 */
Object.defineProperty(WechatyImpl, 'start', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: async function start (options?: WechatyOptions): Promise<Wechaty> {
    const bot = new WechatyImpl(options) as unknown as Wechaty
    await bot.start()
    return bot
  },
})

/**
 * Modern Wechaty bot constructor and canonical instance type.
 *
 * Implements TypeScript Type-Value Declaration Merging:
 * - As a value: constructible via `new Wechaty(options)` with static methods `singleton()` and `valid()`.
 * - As a type: represents the pure doc-typed bot instance with all protected and mixin internals omitted.
 *
 * Note on `as unknown as WechatyConstructor`:
 * The cast is necessary because the underlying runtime class `WechatyImpl` contains internal mixin
 * implementation details, protected properties, and private methods that the public `Wechaty` interface
 * and `prototype: Wechaty` intentionally omit to ensure 100% pure doc-typing.
 */
const Wechaty = WechatyImpl as unknown as WechatyConstructor

// Clean-slate: Ensure legacy EventEmitter methods are undefined on WechatyImpl runtime prototype
for (const legacyMethod of [
  'on',
  'off',
  'once',
  'addListener',
  'removeListener',
  'prependListener',
  'prependOnceListener',
  'removeAllListeners',
  'setMaxListeners',
  'getMaxListeners',
  'listenerCount',
  'rawListeners',
  'listeners',
  'eventNames',
  'emit',
]) {
  Object.defineProperty(WechatyImpl.prototype, legacyMethod, {
    configurable: true,
    value: undefined,
    writable: true,
  })
}

export  {
  Wechaty,
  type WechatyInterface,
  type WechatyConstructor,
  type AllProtectedProperty,
  WechatyImpl,
}
