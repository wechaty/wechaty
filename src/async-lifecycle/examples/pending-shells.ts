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
 * Type-only stand-ins for the two entry points, so the S1 usage examples can be
 * type-checked before the kernel exists (wechaty/wechaty#2969).
 *
 * These `declare` statements are the specification of the shells' signatures
 * (README §Shells, C-SHELL-01 to C-SHELL-04). They have no runtime value:
 * importing this file at runtime yields `undefined` bindings, which is why the
 * examples are only type-checked (`npm run lint:ts`) and never run.
 *
 * Delete this file when the kernel lands (wechaty/wechaty#2972) and import the
 * real shells from `../mod.ts` instead; the examples then become runnable in
 * wechaty/wechaty#2973.
 */

import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
  LifecycleStop,
  LifecycleWaitOptions,
}                           from '../types.ts'

/**
 * Composition entry point: for a class that already has a base class, such as
 * an EventEmitter. The owner keeps the controller private and delegates the
 * caller API to it.
 *
 * @throws TypeError when `hooks.onStart` is not a function (C-SHELL-03).
 * @throws RangeError when a timeout option is invalid (C-TIME-01).
 */
export declare function createLifecycle (hooks: LifecycleHooks, options?: LifecycleOptions): LifecycleController

/**
 * Inheritance entry point: for a class with no other base. Same engine and
 * behavior as {@link createLifecycle} (C-SHELL-01).
 *
 * The caller-API members are final: the constructor throws
 * `LifecycleOverrideError` if a subclass overrides one, including through a class
 * field (C-SHELL-02).
 */
export declare abstract class AsyncLifecycle implements Lifecycle {

  protected constructor (options?: LifecycleOptions)

  get state (): LifecycleState
  start (options?: LifecycleWaitOptions): Promise<void>
  stop (options?: LifecycleWaitOptions): Promise<void>
  restart (options?: LifecycleWaitOptions): Promise<void>
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState>

  [Symbol.asyncDispose] (): Promise<void>

  /** Required hook; see `LifecycleHooks.onStart`. */
  protected abstract onStart (scope: LifecycleScope): void | Promise<void>
  /** Optional hook; the default does nothing. See `LifecycleHooks.onStop`. */
  protected onStop (stop: LifecycleStop): void | Promise<void>
  /** Optional observer; the default does nothing. See `LifecycleHooks.onStateChange`. */
  protected onStateChange (state: LifecycleState, previous: LifecycleState): void
  /** Declare, or look up, a condition on this instance (C-COND-01). */
  protected condition (name: string): LifecycleCondition

}
