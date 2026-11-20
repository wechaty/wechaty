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
 * The seam between the contract suite and an implementation under test
 * (wechaty/wechaty#2970).
 *
 * Contract tests are written once, against the final S1 API in `../types.ts`.
 * Each implementation provides an {@link Implementation}: one
 * {@link MakeSubject} per entry point, the {@link Capability} set it supports,
 * and its known failures. Adapters live in `./adapters/` and only translate
 * names and shapes; they never add behavior (#2970, "Adapters, not refactors").
 */

import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleHooks,
  LifecycleOptions,
}                           from '../types.ts'

/** The two entry points every implementation exposes (C-SHELL-01). */
type ShellName = 'createLifecycle' | 'AsyncLifecycle'

/**
 * Optional parts of the S1 API that a comparison implementation may lack. A
 * test declares what it needs and is skipped, with the reason, for an
 * implementation that lacks it. The final kernel must support every capability.
 */
type Capability =
  /** `LifecycleOptions.clock` is honored, so deadlines can run on a manual clock. */
  | 'clock'
  /** `scope.acquire(create, release)` registers the release before `create` runs. */
  | 'scope.acquire'
  /** `acquire`'s `interrupt` option. */
  | 'acquire.interrupt'
  /** `scope.recover()`. */
  | 'scope.recover'
  /** `onStop` receives `{ generation, reason, signal }`. */
  | 'onStop.context'
  /** `condition.isSet`. */
  | 'condition.isSet'

/** What a test drives: the caller API, plus the owner's condition declaration. */
interface Subject {
  readonly lifecycle: Lifecycle
  condition (name: string): LifecycleCondition
}

/** Create a subject from hooks and options written against the final API. */
type MakeSubject = (hooks: LifecycleHooks, options?: LifecycleOptions) => Subject

/**
 * The implementation's own `AsyncLifecycle` base class, for tests of the
 * inheritance entry point itself (C-SHELL-02). Typed loosely: each comparison
 * implementation declares its constructor and hooks with its own types.
 */
type LifecycleBase = abstract new (options?: LifecycleOptions) => Lifecycle

/** One implementation under test. */
interface Implementation {
  readonly name: string
  readonly capabilities: ReadonlySet<Capability>
  /** Its `AsyncLifecycle` class, used directly only by entry-point tests. */
  readonly base: LifecycleBase
  /** The `node:diagnostics_channel` name it publishes state changes on (C-OBS-04). */
  readonly diagnosticsChannel: string
  readonly shells: Readonly<Record<ShellName, MakeSubject>>
  /**
   * Contract tests this implementation is known to fail, keyed by test key
   * (for example `'B1'` or `'C-CMD-04.a'`), or by `'<key>@<shell>'` when only
   * one entry point fails. The value says why, citing a bug ID when there is one.
   *
   * A key `'S3.<invariant>'` (for example `'S3.I7'`) instead waives one
   * invariant in the S3 random-schedule run (`random/random.test.ts`): the run
   * still checks every other invariant, and a waived one is not reported.
   */
  readonly knownFailures: Readonly<Record<string, string>>
}

/**
 * Thrown by an adapter when a test touches a feature its implementation lacks
 * without declaring the capability. It means the test's `needs` list is wrong.
 */
class UnsupportedFeatureError extends Error {

  constructor (implementation: string, feature: string) {
    super(`${implementation} does not support ${feature}; declare the capability in the test's needs`)
    this.name = 'UnsupportedFeatureError'
  }

}

export type {
  Capability,
  Implementation,
  LifecycleBase,
  MakeSubject,
  ShellName,
  Subject,
}
export {
  UnsupportedFeatureError,
}
