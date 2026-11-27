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

import { CANONICAL_LIFECYCLE } from './create-lifecycle.ts'
import { LifecycleEngine } from './engine.ts'
import { LifecycleOverrideError } from './errors.ts'
import type {
  Lifecycle,
  LifecycleConditionHandle,
  LifecycleController,
  LifecycleHooks,
  LifecycleOperationOptions,
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
  'whenRunning',
  'whenStopped',
  'operation',
  'isRunning',
  'isActive',
  'isStarting',
  'isStopping',
  'isStopped',
  'isFailed',
  'isSettled',
  'whenSettled',
  Symbol.asyncDispose,
  CANONICAL_LIFECYCLE,
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
      whenRunning: {
        configurable: false,
        writable: false,
        value: (callOptions?: LifecycleWaitOptions) => this.#engine.whenRunning(callOptions),
      },
      whenStopped: {
        configurable: false,
        writable: false,
        value: (callOptions?: LifecycleWaitOptions) => this.#engine.whenStopped(callOptions),
      },
      operation: {
        configurable: false,
        writable: false,
        value: <T>(
          work: (signal: AbortSignal) => T | PromiseLike<T>,
          callOptions?: LifecycleOperationOptions,
        ) => this.#engine.operation(work, callOptions),
      },
      isRunning: {
        configurable: false,
        enumerable: true,
        get: () => this.#engine.isRunning,
      },
      isActive: {
        configurable: false,
        enumerable: true,
        get: () => this.#engine.isActive,
      },
      isStarting: {
        configurable: false,
        enumerable: true,
        get: () => this.#engine.isStarting,
      },
      isStopping: {
        configurable: false,
        enumerable: true,
        get: () => this.#engine.isStopping,
      },
      isStopped: {
        configurable: false,
        enumerable: true,
        get: () => this.#engine.isStopped,
      },
      isFailed: {
        configurable: false,
        enumerable: true,
        get: () => this.#engine.isFailed,
      },
      [Symbol.asyncDispose]: {
        configurable: false,
        writable: false,
        value: () => this.#engine[Symbol.asyncDispose](),
      },
      [CANONICAL_LIFECYCLE]: {
        configurable: false,
        enumerable: false,
        writable: false,
        value: this,
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
          throw new LifecycleOverrideError(typeof member === 'symbol' ? member.toString() : member)
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
  protected condition (name: string): LifecycleConditionHandle {
    return this.#engine.condition(name)
  }

  // ---- Tier 1 caller API (sealed) -----------------------------------------

  /** The current frozen snapshot. See {@link Lifecycle.state} (C-STATE-01). */
  get state (): LifecycleState {
    return this.#engine.state
  }

  /** See {@link Lifecycle.isRunning}. */
  get isRunning (): boolean {
    return this.#engine.isRunning
  }

  /** See {@link Lifecycle.isActive}. */
  get isActive (): boolean {
    return this.#engine.isActive
  }

  /** See {@link Lifecycle.isStarting}. */
  get isStarting (): boolean {
    return this.#engine.isStarting
  }

  /** See {@link Lifecycle.isStopping}. */
  get isStopping (): boolean {
    return this.#engine.isStopping
  }

  /** See {@link Lifecycle.isStopped}. */
  get isStopped (): boolean {
    return this.#engine.isStopped
  }

  /** See {@link Lifecycle.isFailed}. */
  get isFailed (): boolean {
    return this.#engine.isFailed
  }

  /** See {@link Lifecycle.isSettled}. */
  get isSettled (): boolean {
    return this.#engine.isSettled
  }

  /** See {@link Lifecycle.whenRunning}. */
  whenRunning (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.whenRunning(options)
  }

  /** See {@link Lifecycle.whenStopped}. */
  whenStopped (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.whenStopped(options)
  }

  /** See {@link Lifecycle.whenSettled}. */
  whenSettled (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.whenSettled(options)
  }

  /** See {@link LifecycleController.operation}. */
  protected operation<T> (
    work: (signal: AbortSignal) => T | PromiseLike<T>,
    options?: LifecycleOperationOptions,
  ): Promise<T> {
    return this.#engine.operation(work, options)
  }

  /** Ask for a running generation. See {@link Lifecycle.start} (C-CMD-01 to C-CMD-06). */
  start (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.start(options)
  }

  /** Ask for the current run to be released. See {@link Lifecycle.stop} (C-CMD-07 to C-CMD-10). */
  stop (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.stop(options)
  }

  /** Release the current run, then start a replacement. See {@link Lifecycle.restart} (C-CMD-11 to C-CMD-13). */
  restart (options?: LifecycleWaitOptions): Promise<void> {
    return this.#engine.restart(options)
  }

  /** Wait for a snapshot that matches `predicate`. See {@link Lifecycle.whenState} (C-CMD-16). */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> {
    return this.#engine.whenState(predicate, options)
  }

  /** `stop()`, for `await using`; the instance can start again (C-CMD-15, D4). */
  [Symbol.asyncDispose] (): Promise<void> {
    return this.#engine[Symbol.asyncDispose]()
  }

}

export {
  AsyncLifecycle,
}
