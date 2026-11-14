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
 * Inheritance entry point for the async lifecycle module.
 *
 * A class with no other base class (for example a PuppetServer) extends
 * {@link AsyncLifecycle} and implements `onStart` / `onStop`. The base owns
 * `start` / `stop` / `restart` / `whenState` / `state` and delegates to the same
 * {@link LifecycleKernel} used by the composition form. Subclasses never override
 * the caller API and never call `super.start()`: a template method exactly one
 * level deep (wechaty/wechaty#2911 §2).
 *
 * The constructor installs an override guard that throws if a subclass overrides
 * `start`, `stop`, `restart` or `whenState`, so the "never override" rule is a
 * runtime error, not a silent footgun (wechaty/wechaty#2911 §8).
 */

import {
  LifecycleKernel,
}                           from './controller.ts'
import type {
  LifecycleState,
}                           from './state.ts'
import type {
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  RecoverResult,
}                           from './types.ts'

/**
 * The caller-API members a subclass must not override.
 */
const SEALED_MEMBERS = [ 'start', 'stop', 'restart', 'whenState' ] as const

/**
 * Abstract base: adopt a lifecycle by inheritance.
 */
abstract class AsyncLifecycle implements Lifecycle {

  readonly #kernel: LifecycleKernel

  protected constructor (options?: LifecycleOptions) {
    const hooks: LifecycleHooks = {
      onStart       : scope => this.onStart(scope),
      onStop        : scope => this.onStop(scope),
      onStateChange : (state, previous) => this.onStateChange(state, previous),
    }
    this.#kernel = new LifecycleKernel(hooks, options)

    this.#assertNoOverride()
  }

  /**
   * Throw if a subclass overrode a sealed caller-API member. We compare the
   * subclass prototype's own method against {@link AsyncLifecycle}'s.
   */
  #assertNoOverride (): void {
    const base = AsyncLifecycle.prototype as unknown as Record<string, unknown>
    let proto = Object.getPrototypeOf(this) as object | null
    while (proto && proto !== base) {
      for (const member of SEALED_MEMBERS) {
        if (Object.hasOwn(proto, member)) {
          throw new Error(
            `AsyncLifecycle subclass must not override '${member}()'; `
            + 'implement onStart/onStop instead',
          )
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
  protected onStop (_scope: LifecycleScope): Promise<void> | void {}

  /**
   * Optional observer. See {@link LifecycleHooks.onStateChange}. Default no-op.
   */
  protected onStateChange (_state: LifecycleState, _previous: LifecycleState): void {}

  // ---- Tier 2 owner-only helpers ------------------------------------------

  /**
   * Declare a generation-bound condition. See {@link LifecycleController.condition}.
   */
  protected condition (name: string): LifecycleCondition {
    return this.#kernel.condition(name)
  }

  /**
   * Authority-checked recovery. See {@link LifecycleController.recover}.
   */
  protected recover (observed: LifecycleState): Promise<RecoverResult> {
    return this.#kernel.recover(observed)
  }

  // ---- Tier 1 caller API (sealed) -----------------------------------------

  get state (): LifecycleState {
    return this.#kernel.state
  }

  start (options?: LifecycleCallOptions): Promise<void> {
    return this.#kernel.start(options)
  }

  stop (options?: LifecycleCallOptions): Promise<void> {
    return this.#kernel.stop(options)
  }

  restart (options?: LifecycleCallOptions): Promise<void> {
    return this.#kernel.restart(options)
  }

  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    return this.#kernel.whenState(predicate, options)
  }

  [Symbol.asyncDispose] (): Promise<void> {
    return this.#kernel[Symbol.asyncDispose]()
  }

}

export {
  AsyncLifecycle,
}
