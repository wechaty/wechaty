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
 * Type-only contracts of the async lifecycle module (wechaty/wechaty#2911,
 * consolidated v1 design, §3).
 *
 * Owns every public shape: the state snapshot, the caller API ({@link Lifecycle}),
 * the implementer API ({@link LifecycleHooks}, {@link LifecycleScope},
 * {@link LifecycleCondition}, {@link LifecycleController}) and the options.
 * It contains no runtime code; `engine.ts` is the only implementation and both
 * entry points (`create-lifecycle.ts`, `async-lifecycle.ts`) expose it unchanged.
 */

/**
 * The phase in which a `failed` state was entered.
 *
 * - `'start'`: `onStart` threw, timed out, or the run failed before `running`.
 * - `'run'`: a running generation reported `scope.fail()` (or a task/child failed).
 * - `'stop'`: retirement reported an error (`onStop`, an interrupt, or a release).
 */
type LifecyclePhase = 'start' | 'run' | 'stop'

/**
 * A frozen snapshot of a lifecycle's observable state.
 *
 * `generation` identifies the run a snapshot belongs to. Every start attempt
 * allocates a new generation, successful or not, so a late completion from an
 * older run can be recognised and discarded.
 *
 * `failed` never implies "safely stopped": `cleanupComplete: false` means owned
 * resources may still be live. That blocks every new generation until a `stop()`
 * finishes the remaining cleanup (wechaty/wechaty#2905 §3.6).
 */
type LifecycleState =
  | { readonly kind: 'stopped';  readonly generation: number }
  | { readonly kind: 'starting'; readonly generation: number }
  | { readonly kind: 'running';  readonly generation: number }
  | { readonly kind: 'stopping'; readonly generation: number }
  | {
      readonly kind: 'failed'
      readonly generation: number
      readonly phase: LifecyclePhase
      readonly error: unknown
      readonly cleanupComplete: boolean
      readonly cleanupError?: unknown
    }

/** The discriminator values of {@link LifecycleState}. */
type LifecycleStateKind = LifecycleState['kind']

/**
 * Options accepted by every waiting call.
 *
 * The signal cancels *this caller's wait only*. It never cancels shared work and
 * never revokes accepted intent (wechaty/wechaty#2905 §10 Q2). An already-aborted
 * signal rejects before any intent is accepted.
 */
interface LifecycleWaitOptions {
  readonly signal?: AbortSignal
}

/**
 * Tier 1: the caller API. Both entry points expose exactly this.
 *
 * `start` / `stop` / `restart` return *attempt results*; `whenState` is
 * *condition observation* (wechaty/wechaty#2905 §10 Q7). Intent is accepted
 * synchronously, before the first `await`. Equivalent concurrent calls share one
 * attempt outcome; promise identity is not guaranteed.
 */
interface Lifecycle extends AsyncDisposable {
  /** The current frozen snapshot. Only the kernel can change it. */
  readonly state: LifecycleState

  /**
   * Request a running service.
   *
   * Resolves when the attempt this call joined commits `running`, or at once when
   * a generation is already running and not being retired. Rejects with the start
   * error when that attempt fails, with `LifecycleSupersededError` when a later
   * `stop()` or `restart()` supersedes it, with `LifecycleUnsafeStateError` when a
   * dirty `failed` state blocks a new run, or with the caller's abort reason.
   */
  start (options?: LifecycleWaitOptions): Promise<void>

  /**
   * Request retirement of the current run.
   *
   * Resolves when the run this call captured is released, even if a newer
   * `start()` is already queued. Rejects with the cleanup error when retirement
   * reports one (the state then says whether cleanup completed), or with the
   * caller's abort reason. On a dirty `failed` state it retries only the cleanup
   * that has not completed. On a clean `failed` state it commits `stopped`.
   * It also rejects every condition wait that is not yet bound to a generation.
   */
  stop (options?: LifecycleWaitOptions): Promise<void>

  /**
   * Retire the current run, then start a replacement.
   *
   * The state goes `running → stopping → starting → running`. Resolves when the
   * replacement commits `running`. Rejects when either half fails, when a later
   * `stop()` supersedes it, when a dirty `failed` state blocks it, or on caller
   * abort. From a clean idle state it behaves like `start()`.
   */
  restart (options?: LifecycleWaitOptions): Promise<void>

  /**
   * Observe the state across generations.
   *
   * Resolves with the first snapshot (the current one included) for which
   * `predicate` returns `true`; `failed` snapshots are passed to it. Rejects only
   * on caller abort or when `predicate` throws.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState>

  /** Same as {@link Lifecycle.stop}; the instance can start again afterwards. */
  [Symbol.asyncDispose] (): Promise<void>
}

/** Why a running generation is being retired. Passed to `onStop`. */
type LifecycleStopReason = 'stop' | 'restart' | 'recover' | 'failure'

/**
 * The argument of `onStop`.
 *
 * `signal` is the *stop deadline* (`stopTimeoutMs`), not the run's signal: when
 * `onStop` runs, `scope.signal` has deliberately not been aborted yet, so the
 * hook can still use its resources for a graceful goodbye.
 */
interface LifecycleStop {
  readonly reason: LifecycleStopReason
  readonly signal: AbortSignal
}

/**
 * Tier 2: a generation-bound condition, the generic answer to "await ready".
 *
 * Declared once per instance with `condition(name)` and set or cleared through a
 * {@link LifecycleScope}. A result never crosses generations.
 */
interface LifecycleCondition {
  readonly name: string

  /**
   * Wait for the bound generation to set this condition.
   *
   * Binds to the generation that is `starting` or `running` and not retiring;
   * otherwise to the next generation to start, so `const p = ready.wait();
   * await start()` works. Resolves at once when the bound generation has it set.
   * Rejects when that generation fails or retires first, when `stop()` is called
   * before the wait is bound, or on caller abort.
   */
  wait (options?: LifecycleWaitOptions): Promise<void>
}

/** Options for {@link LifecycleScope.acquire}. */
interface LifecycleAcquireOptions<T> {
  /**
   * Unblock anything waiting on the resource (for example destroy a socket so a
   * task reading from it returns). Runs synchronously during retirement, after
   * `scope.signal` aborts and before any ledger entry is released or joined.
   */
  readonly interrupt?: (resource: T) => void
}

/** Outcome of an accepted {@link LifecycleScope.recover}. */
type RecoverResult = 'recovered' | 'superseded'

/**
 * Tier 2: the per-generation scope, the only way an implementer touches the
 * lifecycle machinery.
 *
 * Every registration (`acquire`, `use`, `defer`, `spawn`, `start`) goes into one
 * ownership ledger that is released newest first. Once the generation starts
 * retiring the scope is *sealed*: a later `use` / `defer` releases its argument
 * at once and throws the retirement reason, `acquire` / `spawn` / `start` refuse
 * without running anything, and `set` / `clear` / `fail` do nothing. A stale
 * callback holding an old scope therefore cannot affect a newer run.
 */
interface LifecycleScope {
  /** The generation this scope belongs to. */
  readonly generation: number

  /** Aborted when this generation is retired (after `onStop` for a running one). */
  readonly signal: AbortSignal

  /**
   * Record ownership, then create a resource.
   *
   * The release is registered *before* `create` runs, so a resource that
   * resolves after retirement began is still released (and `acquire` then
   * rejects with the retirement reason). If `create` rejects, nothing is
   * released. `create` receives `scope.signal`.
   */
  acquire<T> (
    create: (signal: AbortSignal) => T | PromiseLike<T>,
    release: (resource: NoInfer<T>) => void | PromiseLike<void>,
    options?: LifecycleAcquireOptions<NoInfer<T>>,
  ): Promise<T>

  /**
   * Register a resource that implements `Symbol.asyncDispose` or
   * `Symbol.dispose`. Returns it unchanged. Throws `TypeError` for anything else.
   */
  use<T extends AsyncDisposable | Disposable> (resource: T): T

  /** Register a cleanup action (remove a listener, clear a timer). */
  defer (cleanup: () => void | PromiseLike<void>): void

  /**
   * Start an owned background task, joined during retirement. A rejection other
   * than the scope's own abort reason fails the generation; one that happens
   * while retiring is reported as a cleanup error.
   */
  spawn (task: (signal: AbortSignal) => Promise<void>): void

  /**
   * Start and own a child lifecycle.
   *
   * The child must be `stopped` or cleanly `failed` and not owned by another
   * scope. Ownership is recorded before `child.start()` runs, and the child is
   * stopped in ledger order during retirement. The ownership reservation is
   * released only after that stop succeeds. When the child commits `failed`, or
   * `stopped` without this scope asking, this generation fails with the child's
   * error as `cause`. A child that restarts or recovers itself is not escalated.
   */
  start (child: Lifecycle): Promise<void>

  /** Set a condition declared on this lifecycle. Throws `TypeError` for a foreign one. */
  set (condition: LifecycleCondition): void

  /** Clear a condition declared on this lifecycle. Throws `TypeError` for a foreign one. */
  clear (condition: LifecycleCondition): void

  /**
   * Report that this generation can no longer run. The state goes to
   * `failed { phase: 'run' }` (or `'start'` before `running`) and no replacement
   * starts. The value is kept as given, falsy values included.
   */
  fail (error: unknown): void

  /**
   * Retire this generation and start a replacement, without counting as user
   * intent: `running → stopping → starting → running`.
   *
   * Accepted only while this generation is running. A user command that arrives
   * before the replacement starts wins, and the result is `'superseded'`; so is a
   * call from a retired or retiring scope. Before `running` it behaves like
   * `fail(reason)` and rejects with `reason`. Rejects when retirement is dirty or
   * the replacement fails. The returned promise is pre-handled, so
   * `void scope.recover()` never produces an unhandled rejection.
   */
  recover (reason?: unknown): Promise<RecoverResult>
}

/** Tier 2: what an implementer writes. */
interface LifecycleHooks {
  /**
   * Acquire what this run needs through the scope. Returning commits `running`;
   * throwing (any value, falsy included) fails the attempt and unwinds the scope.
   */
  onStart (scope: LifecycleScope): void | Promise<void>

  /**
   * Optional graceful goodbye. Called at most once per generation, only for a run
   * that reached `running`, before its scope aborts. A rejection is reported as a
   * cleanup error but is never retried. A partial start is rolled back by the
   * ledger alone.
   */
  onStop? (stop: LifecycleStop): void | Promise<void>

  /** Optional observer, called after commit. Exceptions are isolated. */
  onStateChange? (state: LifecycleState, previous: LifecycleState): void
}

/**
 * The timer source the kernel uses for deadlines. Injected so tests can run
 * deadlines deterministically. Defaults to the global timers.
 */
interface LifecycleClock {
  setTimeout (callback: () => void, ms: number): unknown
  clearTimeout (handle: unknown): void
}

/** Options for a lifecycle instance. */
interface LifecycleOptions {
  /** Diagnostics-only name. */
  readonly name?: string
  /** Start deadline. Expiry fails the attempt with `LifecycleTimeoutError` and unwinds. */
  readonly startTimeoutMs?: number
  /**
   * Retirement deadline, applied to one whole retirement pass (`onStop`, joining
   * `onStart`, the ledger unwind). Expiry commits `failed { cleanupComplete: false }`
   * and keeps the unfinished work tracked for the next `stop()`.
   */
  readonly stopTimeoutMs?: number
  /** Timer source for the deadlines. */
  readonly clock?: LifecycleClock
}

/** Tier 2: what the owner of a composed lifecycle holds. */
interface LifecycleController extends Lifecycle {
  /** Declare (or look up) a generation-bound condition by name. */
  condition (name: string): LifecycleCondition
}

export type {
  Lifecycle,
  LifecycleAcquireOptions,
  LifecycleClock,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecyclePhase,
  LifecycleScope,
  LifecycleState,
  LifecycleStateKind,
  LifecycleStop,
  LifecycleStopReason,
  LifecycleWaitOptions,
  RecoverResult,
}
