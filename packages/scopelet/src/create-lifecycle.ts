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
 * Composition entry point: `createLifecycle(hooks, options)`.
 *
 * For a class that already has a base class (Wechaty and Puppet extend an event
 * emitter): it *holds* a lifecycle, keeps the returned controller private, and
 * delegates its public `start` / `stop` / `restart` / `whenState` / `state` to it.
 * Adds no behaviour of its own (v1 design rule 1, "one engine, two shells").
 */

import { LifecycleEngine } from './engine.ts'
import { LifecycleOverrideError } from './errors.ts'
import type {
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
}                           from './types.ts'

/**
 * Create a lifecycle in composition form.
 *
 * @param hooks   `onStart`, and optionally `onStop` and `onStateChange`.
 * @param options Diagnostics name, deadlines and timer source.
 * @returns A frozen {@link LifecycleController}: the caller API plus `condition`.
 * @throws TypeError when `hooks.onStart` is not a function, or `onStop` /
 *   `onStateChange` is present but not a function (C-SHELL-03): a mistake in
 *   JavaScript, or in hooks built at runtime, surfaces here instead of at the
 *   first start or stop.
 * @throws RangeError when a timeout option is invalid (C-TIME-01).
 */
function createLifecycle (
  hooks: LifecycleHooks,
  options?: LifecycleOptions,
): LifecycleController {
  assertHooks(hooks)
  const engine = new LifecycleEngine(hooks, options)
  return Object.freeze<LifecycleController>({
    get state () { return engine.state },
    get isRunning () { return engine.isRunning },
    get isActive () { return engine.isActive },
    get isStarting () { return engine.isStarting },
    get isStopping () { return engine.isStopping },
    get isStopped () { return engine.isStopped },
    get isFailed () { return engine.isFailed },
    start       : callOptions => engine.start(callOptions),
    stop        : callOptions => engine.stop(callOptions),
    restart     : callOptions => engine.restart(callOptions),
    whenState   : (predicate, callOptions) => engine.whenState(predicate, callOptions),
    whenRunning : callOptions => engine.whenRunning(callOptions),
    whenStopped : callOptions => engine.whenStopped(callOptions),
    operation   : work => engine.operation(work),
    condition   : name => engine.condition(name),
    [Symbol.asyncDispose]: () => engine[Symbol.asyncDispose](),
  })
}

/**
 * Composition attachment (ADR-04):
 * Attach a lifecycle directly to a target object, defining standard delegation
 * getters and methods (state, isRunning, start, stop, operation, etc.) directly on `target`.
 */
function attach<T extends object> (
  target: T,
  hooks: LifecycleHooks,
  options?: LifecycleOptions,
): LifecycleController {
  const members = [
    'state', 'isRunning', 'isActive', 'isStarting', 'isStopping', 'isStopped', 'isFailed',
    'start', 'stop', 'restart', 'whenState', 'whenRunning', 'whenStopped', 'operation', 'condition',
    Symbol.asyncDispose,
  ]
  for (const member of members) {
    let curr: object | null = target
    while (curr && curr !== Object.prototype) {
      if (Object.hasOwn(curr, member)) {
        throw new LifecycleOverrideError(typeof member === 'symbol' ? 'Symbol.asyncDispose' : member)
      }
      curr = Object.getPrototypeOf(curr)
    }
  }
  const controller = createLifecycle(hooks, options)
  Object.defineProperties(target, {
    state: {
      configurable: false,
      enumerable: true,
      get: () => controller.state,
    },
    isRunning: {
      configurable: false,
      enumerable: true,
      get: () => controller.isRunning,
    },
    isActive: {
      configurable: false,
      enumerable: true,
      get: () => controller.isActive,
    },
    isStarting: {
      configurable: false,
      enumerable: true,
      get: () => controller.isStarting,
    },
    isStopping: {
      configurable: false,
      enumerable: true,
      get: () => controller.isStopping,
    },
    isStopped: {
      configurable: false,
      enumerable: true,
      get: () => controller.isStopped,
    },
    isFailed: {
      configurable: false,
      enumerable: true,
      get: () => controller.isFailed,
    },
    start: {
      configurable: false,
      writable: false,
      value: (callOptions?: any) => controller.start(callOptions),
    },
    stop: {
      configurable: false,
      writable: false,
      value: (callOptions?: any) => controller.stop(callOptions),
    },
    restart: {
      configurable: false,
      writable: false,
      value: (callOptions?: any) => controller.restart(callOptions),
    },
    whenState: {
      configurable: false,
      writable: false,
      value: (predicate: any, callOptions?: any) => controller.whenState(predicate, callOptions),
    },
    whenRunning: {
      configurable: false,
      writable: false,
      value: (callOptions?: any) => controller.whenRunning(callOptions),
    },
    whenStopped: {
      configurable: false,
      writable: false,
      value: (callOptions?: any) => controller.whenStopped(callOptions),
    },
    operation: {
      configurable: false,
      writable: false,
      value: (work: any) => controller.operation(work),
    },
    condition: {
      configurable: false,
      writable: false,
      value: (name: string) => controller.condition(name),
    },
    [Symbol.asyncDispose]: {
      configurable: false,
      writable: false,
      value: () => controller[Symbol.asyncDispose](),
    },
  })
  return controller
}

createLifecycle.attach = attach

/** C-SHELL-03: throw `TypeError` for a missing `onStart` or a non-function hook. */
function assertHooks (hooks: LifecycleHooks): void {
  if (typeof hooks !== 'object' || hooks === null) {
    throw new TypeError('createLifecycle() needs a hooks object')
  }
  if (typeof hooks.onStart !== 'function') {
    throw new TypeError('createLifecycle() needs an onStart function')
  }
  for (const name of [ 'onStop', 'onStateChange' ] as const) {
    if (hooks[name] !== undefined && typeof hooks[name] !== 'function') {
      throw new TypeError(`createLifecycle(): ${name} must be a function when present`)
    }
  }
}

export {
  createLifecycle,
}
