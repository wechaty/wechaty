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
 * Public and implementer-facing contracts for the async lifecycle module.
 *
 * This module defines the three tiers of surface named in wechaty/wechaty#2911:
 *
 * - Tier 1 ({@link Lifecycle}): what a *caller* of a service can do.
 * - Tier 2 ({@link LifecycleHooks}, {@link LifecycleScope},
 *   {@link LifecycleCondition}, {@link LifecycleController}): what an
 *   *implementer* writes and uses.
 *
 * It holds only types. The kernel that satisfies them lives in `controller.ts`;
 * the two ergonomic entry points live in `create.ts` and `async-lifecycle.ts`.
 */

import type { LifecycleState } from './state.ts'

/**
 * Options accepted by every caller method.
 *
 * The signal cancels *this caller's wait only*. It never cancels shared work and
 * never revokes accepted intent: aborting your `await bot.start()` does not stop
 * the bot for everyone else (wechaty/wechaty#2905 §10 Q2, invariant 8).
 */
interface LifecycleCallOptions {
  readonly signal?: AbortSignal
}

/**
 * Tier 1: the caller API. Both entry points expose exactly this.
 *
 * `start`/`stop`/`restart` return *attempt results*; `whenState` is *condition
 * observation*. This is the two-primitive split (wechaty/wechaty#2905 §10 Q7):
 * attempt results reject on failure or supersession, while a condition
 * observation spans generations and rejects only on caller abort or a throwing
 * predicate.
 *
 * Intent is accepted synchronously, before the first `await`. An already-aborted
 * signal rejects before any intent is accepted.
 */
interface Lifecycle extends AsyncDisposable {
  /**
   * The current frozen snapshot. Only the kernel can change it.
   */
  readonly state: LifecycleState

  /**
   * Request that the service become running.
   *
   * Resolves when *this request's* attempt is genuinely running. Rejects with
   * {@link LifecycleSupersededError} if a newer intent replaces it, with the
   * start error if `onStart` fails, or with the caller's abort reason.
   * Concurrent equivalent requests share one attempt outcome.
   */
  start (options?: LifecycleCallOptions): Promise<void>

  /**
   * Request retirement immediately.
   *
   * Resolves when owned resources are released. Rejects on cleanup failure. On a
   * `failed { cleanupComplete: false }` state it retries the remaining cleanup.
   */
  stop (options?: LifecycleCallOptions): Promise<void>

  /**
   * Retire the current run, then start its replacement.
   *
   * Resolves when the replacement is running. A later `stop()` supersedes it
   * permanently (wechaty/wechaty#2905 invariant 1). From a clean `stopped` state
   * it behaves as `start()`.
   */
  restart (options?: LifecycleCallOptions): Promise<void>

  /**
   * Observe a condition across generations.
   *
   * Resolves with the first snapshot for which `predicate` returns `true`.
   * Rejects only on caller abort or if `predicate` throws. It never rejects on a
   * `failed` snapshot; the predicate sees `failed` snapshots and may match them.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState>

  /**
   * Same as {@link Lifecycle.stop}. Lets a lifecycle be used with `await using`.
   */
  [Symbol.asyncDispose] (): Promise<void>
}

/**
 * Tier 2: a generation-bound condition, the generic answer to "await ready".
 *
 * Declared once per instance with `controller.condition(name)`, then set or
 * cleared through a {@link LifecycleScope}. A resolution never crosses
 * generations: a second start does not inherit the first run's readiness
 * (wechaty/wechaty#2905 §3.4, invariant 11).
 */
interface LifecycleCondition {
  readonly name: string

  /**
   * Wait for the bound generation to set this condition.
   *
   * Binds to the generation that is currently `starting` or `running`; otherwise
   * binds to the next generation to start (so `const p = bot.ready();
   * await bot.start()` works). Resolves when that generation sets the condition.
   * Rejects if that generation fails or retires first, or on caller abort.
   */
  wait (options?: LifecycleCallOptions): Promise<void>
}

/**
 * Tier 2: the per-generation scope. The only way an implementer touches the
 * lifecycle machinery.
 *
 * `use`/`adopt`/`defer` mirror `AsyncDisposableStack` names and semantics:
 * release order is the reverse of registration order. `spawn` and `start(child)`
 * register their join/stop into the same ledger, so one ordering rule covers
 * resources, tasks and children (wechaty/wechaty#2911 §6.2).
 *
 * The scope has no `close`, `abort` or `move`: only the kernel retires a
 * generation. `set`, `clear` and `fail` from a retired generation are no-ops by
 * construction, which fences a stale callback (wechaty/wechaty#2905 invariant 9).
 */
interface LifecycleScope {
  /**
   * Aborted when this generation is being retired. Abort listeners are the
   * "interrupt" step that runs before the ledger unwinds.
   */
  readonly signal: AbortSignal

  /**
   * Register a resource that already implements disposal. Returns it unchanged.
   */
  use<T extends AsyncDisposable | Disposable> (resource: T): T

  /**
   * Register a resource together with its release function. Returns it unchanged.
   *
   * If the generation is already retiring, the resource is released immediately
   * and the abort reason is thrown, so a late acquisition is still cleaned up.
   */
  adopt<T> (resource: T, release: (resource: T) => void | PromiseLike<void>): T

  /**
   * Register a cleanup action (remove a listener, clear a timer).
   */
  defer (cleanup: () => void | PromiseLike<void>): void

  /**
   * Start an owned background task, joined on retirement. A rejection other than
   * the abort is reported through {@link LifecycleScope.fail}.
   */
  spawn (task: (signal: AbortSignal) => Promise<void>): void

  /**
   * Start a child lifecycle, own it, and watch it.
   *
   * Uses only the child's {@link Lifecycle} interface, so it works with either
   * entry point. Registers ownership before calling `child.start()`, and refuses
   * a child that is not `stopped` or cleanly `failed`. If the child fails, or
   * leaves `running` without this scope asking, the parent's
   * {@link LifecycleScope.fail} is called with the child's error as `cause`.
   */
  start (child: Lifecycle): Promise<void>

  /** Set a generation-bound condition. */
  set (condition: LifecycleCondition): void

  /** Clear a generation-bound condition. */
  clear (condition: LifecycleCondition): void

  /**
   * Report that this generation can no longer run (watchdog timeout, dropped
   * connection, child exit). Transitions a running generation to
   * `failed { phase: 'run' }` and triggers retirement.
   */
  fail (error: unknown): void
}

/**
 * Tier 2: what an implementer writes.
 */
interface LifecycleHooks {
  /**
   * Acquire everything this run needs. Returning means "running". Throwing fails
   * the attempt and unwinds the scope.
   */
  onStart (scope: LifecycleScope): Promise<void> | void

  /**
   * Optional ordered goodbye while resources are still usable. Runs whenever
   * `onStart` was entered, so it must tolerate a partial start.
   */
  onStop? (scope: LifecycleScope): Promise<void> | void

  /**
   * Optional observer. Runs after the snapshot is committed and attempt waiters
   * are settled. Exceptions are isolated and never affect reconciliation.
   */
  onStateChange? (state: LifecycleState, previous: LifecycleState): void
}

/**
 * Options for a lifecycle instance.
 */
interface LifecycleOptions {
  /** Diagnostics-only name. */
  readonly name?: string
  /** Start deadline. Expiry fails the attempt, aborts the scope, and unwinds. */
  readonly startTimeoutMs?: number
  /** Stop deadline. Expiry yields `failed { phase: 'stop', cleanupComplete: false }`. */
  readonly stopTimeoutMs?: number
}

/**
 * The outcome of an authority-checked {@link LifecycleController.recover}.
 */
type RecoverResult = 'recovered' | 'superseded'

/**
 * Tier 2: what the owner of a lifecycle holds. The caller API plus two
 * owner-only members.
 */
interface LifecycleController extends Lifecycle {
  /**
   * Declare (or look up) a generation-bound condition by name.
   */
  condition (name: string): LifecycleCondition

  /**
   * Authority-checked recovery. Accepted only if `observed` is still the current
   * snapshot and no user command arrived since. Never counts as user intent, and
   * the check is repeated after the old generation retires, so a user command in
   * between always wins (wechaty/wechaty#2905 §3.3, invariants 1 and 12).
   */
  recover (observed: LifecycleState): Promise<RecoverResult>
}

export type {
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  RecoverResult,
}
