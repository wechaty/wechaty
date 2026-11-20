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
 * Inheritance entry point: `abstract class AsyncLifecycle`.
 *
 * For a class with no other base class (for example a PuppetServer): it extends
 * {@link AsyncLifecycle} and implements `onStart` (and optionally `onStop` /
 * `onStateChange`). The base owns the caller API and delegates to the same
 * {@link LifecycleEngine} as `createLifecycle`; it adds no lifecycle behaviour.
 * Subclasses never override the caller API and never call `super.start()`: a
 * template method exactly one level deep (wechaty/wechaty#2911 §2).
 *
 * The "never override" rule is enforced at construction time, both for
 * prototype overrides and for class-field overrides (v1 design §8).
 */

import { LifecycleEngine } from './engine.ts'
import { LifecycleOverrideError } from './errors.ts'
import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
  LifecycleStop,
  LifecycleWaitOptions,
}                           from './types.ts'

/**
 * The caller-API members a subclass must not override.
 */
const SEALED_MEMBERS: readonly (string | symbol)[] = [
  'state',
  'start',
  'stop',
  'restart',
  'whenState',
  Symbol.asyncDispose,
]

/**
 * Abstract base: adopt a lifecycle by inheritance.
 */
abstract class AsyncLifecycle implements Lifecycle {

  readonly #engine: LifecycleEngine

  protected constructor (options?: LifecycleOptions) {
    const hooks: LifecycleHooks = {
      onStart       : scope => this.onStart(scope),
      onStop        : stop => this.onStop(stop),
      onStateChange : (state, previous) => this.onStateChange(state, previous),
    }
    this.#engine = new LifecycleEngine(hooks, options)

    this.#assertNoOverride()
    Object.defineProperties(this, {
      state: {
        configurable: false,
        enumerable: true,
        get: () => this.#engine.state,
      },
      start: {
        configurable: false,
        writable: false,
        value: (callOptions?: LifecycleWaitOptions) => this.#engine.start(callOptions),
      },
      stop: {
        configurable: false,
        writable: false,
        value: (callOptions?: LifecycleWaitOptions) => this.#engine.stop(callOptions),
      },
      restart: {
        configurable: false,
        writable: false,
        value: (callOptions?: LifecycleWaitOptions) => this.#engine.restart(callOptions),
      },
      whenState: {
        configurable: false,
        writable: false,
        value: (
          predicate: (state: LifecycleState) => boolean,
          callOptions?: LifecycleWaitOptions,
        ) => this.#engine.whenState(predicate, callOptions),
      },
      [Symbol.asyncDispose]: {
        configurable: false,
        writable: false,
        value: () => this.#engine[Symbol.asyncDispose](),
      },
    })
  }

  /**
   * Throw if a subclass prototype overrides a sealed caller-API member. A
   * class-field override is rejected separately: the constructor installs the
   * members as non-configurable own properties, so the field initializer that
   * runs after `super()` throws `TypeError`.
   */
  #assertNoOverride (): void {
    const base = AsyncLifecycle.prototype as unknown as Record<string, unknown>
    let proto = Object.getPrototypeOf(this) as object | null
    while (proto && proto !== base) {
      for (const member of SEALED_MEMBERS) {
        if (Object.hasOwn(proto, member)) {
          throw new LifecycleOverrideError(typeof member === 'symbol' ? 'Symbol.asyncDispose' : member)
        }
      }
      proto = Object.getPrototypeOf(proto) as object | null
    }
  }

  // ---- Tier 2 hooks (subclass implements) ---------------------------------

  /**
   * Acquire everything this run needs. See {@link LifecycleHooks.onStart}.
   */
  protected abstract onStart (scope: LifecycleScope): Promise<void> | void

  /**
   * Optional graceful goodbye. See {@link LifecycleHooks.onStop}. Default no-op.
   */
  protected onStop (_stop: LifecycleStop): Promise<void> | void {}

  /**
   * Optional observer. See {@link LifecycleHooks.onStateChange}. Default no-op.
   */
  protected onStateChange (_state: LifecycleState, _previous: LifecycleState): void {}

  // ---- Tier 2 owner-only helper ---------------------------------------------

  /**
   * Declare a generation-bound condition. See {@link LifecycleController.condition}.
   */
  protected condition (name: string): LifecycleCondition {
    return this.#engine.condition(name)
  }

  // ---- Tier 1 caller API (sealed) -----------------------------------------

  get state (): LifecycleState {
    return this.#engine.state
  }

  start (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.start(options)
  }

  stop (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.stop(options)
  }

  restart (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.restart(options)
  }

  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> {
    return this.#engine.whenState(predicate, options)
  }

  [Symbol.asyncDispose] (): Promise<void> {
    return this.#engine[Symbol.asyncDispose]()
  }

}

export {
  AsyncLifecycle,
}
