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
 * Every public shape of the async lifecycle module: the API that
 * `Wechaty`, `Puppet`, `PuppetService` and `Io` will share (wechaty/wechaty#2968).
 *
 * Two audiences:
 * - **Callers** (Tier 1) hold a {@link Lifecycle}: a frozen `state`, the commands
 *   `start` / `stop` / `restart`, `whenState`, and `Symbol.asyncDispose`.
 * - **Implementers** (Tier 2) write {@link LifecycleHooks}. Each run (generation)
 *   gets a {@link LifecycleScope}, which is the only way to register resources,
 *   tasks, children and conditions, or to report failure and ask for recovery.
 *   The owner of a composed lifecycle also holds a {@link LifecycleController}.
 *
 * This file is type-only. The normative behavior is `../README.md`; the `C-…`
 * IDs in this file point at its clauses. The kernel that implements them lands
 * in wechaty/wechaty#2972, behind two entry points with identical behavior:
 * `createLifecycle(hooks, options)` and `abstract class AsyncLifecycle`.
 *
 * Constraints for editors: `tsconfig.json` sets `erasableSyntaxOnly`, so no
 * `enum`, `namespace` or constructor parameter properties; use string unions.
 */

import type {
  Watchdog,
  WatchdogOptions,
}                           from './companions/watchdog.ts'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * When a `failed` state was entered (C-STATE-05):
 * - `'start'`: before this generation committed `running`.
 * - `'run'`: after it committed `running`.
 * - `'stop'`: retirement itself failed (an `onStop`, interrupt or release
 *   error, or the stop deadline).
 */
type LifecycleFailurePhase = 'start' | 'run' | 'stop'

/**
 * A frozen snapshot of a lifecycle (C-STATE-01 to C-STATE-07).
 *
 * `generation` numbers runs: every start attempt allocates the next one, whether
 * or not it succeeds, and the number never decreases. `stopped` before any start
 * has generation `0`.
 *
 * `failed` never means "safely stopped" by itself: `cleanupComplete: false`
 * means owned work may still be live, and it blocks every new generation until a
 * `stop()` finishes the cleanup.
 */
type LifecycleState =
  | { readonly kind: 'stopped',  readonly generation: number }
  | { readonly kind: 'starting', readonly generation: number }
  | { readonly kind: 'running',  readonly generation: number }
  | { readonly kind: 'stopping', readonly generation: number }
  | {
      readonly kind: 'failed'
      readonly generation: number
      readonly phase: LifecycleFailurePhase
      /** The primary failure, kept exactly as reported (falsy values included). */
      readonly error: unknown
      /** `true` when every obligation was released; see C-STATE-06. */
      readonly cleanupComplete: boolean
      /** Present when cleanup reported errors: one error, or an `AggregateError`. */
      readonly cleanupError?: unknown
    }

/** The discriminator values of {@link LifecycleState}. */
type LifecycleStateKind = LifecycleState['kind']

// ---------------------------------------------------------------------------
// Tier 1: callers
// ---------------------------------------------------------------------------

/**
 * Options for every waiting call (C-CMD-01, C-CMD-02).
 *
 * The signal cancels **this caller's wait only**. It never cancels shared work
 * and never revokes intent that was accepted. A signal that is already aborted
 * rejects the call with `signal.reason` before any intent is accepted.
 */
interface LifecycleWaitOptions {
  readonly signal?: AbortSignal
}

/**
 * The caller API. Both entry points expose exactly this.
 *
 * Commands accept intent synchronously, before their first `await`. Equivalent
 * concurrent calls share one outcome, each with its own promise (C-CMD-03).
 */
interface Lifecycle extends AsyncDisposable {

  /** The current frozen snapshot. Only the kernel replaces it (C-STATE-01). */
  readonly state: LifecycleState

  /**
   * Ask for a running service (C-CMD-04 to C-CMD-06, C-CMD-13, C-CMD-14,
   * C-CMD-17).
   *
   * Resolves when the attempt this call joined commits `running`, or at once if
   * a generation is running and not retiring. Rejects with the start error when
   * that attempt fails, as soon as the failure is decided rather than after its
   * cleanup (a start timeout rejects at the deadline), with `LifecycleSupersededError` when a later `stop()`, or a
   * `restart()` accepted while it is `starting`, supersedes it (C-CMD-07,
   * C-CMD-11), with `LifecycleUnsafeStateError` while the state is
   * `failed { cleanupComplete: false }`, or with the caller's abort reason.
   */
  start (options?: LifecycleWaitOptions): Promise<void>

  /**
   * Ask for the current run to be released (C-CMD-07 to C-CMD-10).
   *
   * Supersedes any pending start, restart or recovery. Resolves when the
   * generation this call captured is released, even if a newer `start()` is
   * already queued. On a clean `failed` state it commits `stopped`; on a dirty
   * one it retries only the obligations that are still unreleased. Rejects with
   * the cleanup error when retirement reports one (the state then says whether
   * cleanup completed), including an error from earlier unfinished work it
   * joined and retried successfully (C-TIME-03), or with the caller's abort reason.
   */
  stop (options?: LifecycleWaitOptions): Promise<void>

  /**
   * Release the current run, then start a replacement (C-CMD-11 to C-CMD-13).
   *
   * Never a no-op while running: `running → stopping → starting → running`.
   * From a clean idle state it behaves like `start()`. Resolves when the
   * replacement commits `running`. Rejects when either half fails, when a later
   * `stop()` supersedes it, while the state is dirty, or on caller abort.
   */
  restart (options?: LifecycleWaitOptions): Promise<void>

  /**
   * Wait for a matching snapshot, across generations (C-CMD-16).
   *
   * Resolves with the first snapshot, the current one included, for which
   * `predicate` returns `true`; `failed` snapshots are passed to it like any
   * other. Rejects only when the caller aborts or `predicate` throws.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState>

  /** Whether the lifecycle is currently running (kind === 'running'). */
  readonly isRunning: boolean

  /** Whether the lifecycle is active (state is 'starting' or 'running'). */
  readonly isActive: boolean

  /** Whether the lifecycle is currently starting (kind === 'starting'). */
  readonly isStarting: boolean

  /** Whether the lifecycle is currently stopping (kind === 'stopping'). */
  readonly isStopping: boolean

  /** Whether the lifecycle is currently stopped (kind === 'stopped'). */
  readonly isStopped: boolean

  /** Whether the lifecycle is currently failed (kind === 'failed'). */
  readonly isFailed: boolean

  /** Whether the lifecycle is settled (stopped, or failed with cleanupComplete). */
  readonly isSettled: boolean

  /**
   * Wait for a `running` snapshot, including the current snapshot (ADR-06).
   * Follows {@link Lifecycle.whenState} across generations and rejects on caller abort.
   */
  whenRunning (options?: LifecycleWaitOptions): Promise<void>

  /**
   * Wait for a `stopped` snapshot, including the current snapshot (ADR-06).
   * Follows {@link Lifecycle.whenState} across generations and rejects on caller abort.
   */
  whenStopped (options?: LifecycleWaitOptions): Promise<void>

  /**
   * Wait for a settled snapshot (`stopped`, or `failed` with `cleanupComplete === true`).
   * Follows {@link Lifecycle.whenState} across generations and rejects on caller abort.
   */
  whenSettled (options?: LifecycleWaitOptions): Promise<void>

  /** Same as {@link Lifecycle.stop}; the instance can start again (C-CMD-15). */
  [Symbol.asyncDispose] (): Promise<void>

}

// ---------------------------------------------------------------------------
// Tier 2: implementers
// ---------------------------------------------------------------------------

/**
 * A generation-bound named condition such as `ready` or `login`: the module's
 * generic replacement for `ready()` (C-COND-01 to C-COND-06).
 *
 * A controller declaration is shared by name. A scope-issued handle stays
 * bound to its issuing generation. A result never crosses generations.
 */
interface LifecycleCondition {

  readonly name: string

  /**
   * Whether the current live generation has set this condition (C-COND-06).
   * `false` while idle, retiring or failed. For synchronous getters such as
   * `isLoggedIn`, so they do not keep a second flag that can drift.
   */
  readonly isSet: boolean

  /**
   * Wait for the bound generation to set this condition (C-COND-02 to C-COND-04).
   *
   * A controller handle binds to the live or next generation, so
   * `const p = ready.wait(); await start()` works. A scope handle binds to its
   * issuing generation. Resolves at once if the bound generation has it set. Rejects
   * with `LifecycleSupersededError` when that generation retires first (its
   * failure, if any, is the `cause`) or when `stop()` is accepted before the
   * wait is bound, and with the caller's abort reason.
   */
  wait (options?: LifecycleWaitOptions): Promise<void>

}

/**
 * A self-sovereign handle for setting, clearing, and awaiting a condition (ADR-02).
 */
interface LifecycleConditionHandle extends LifecycleCondition {
  /** Set the bound condition. A controller requires a live generation. A retired scope ignores the call. */
  set (): void
  /** Clear the bound condition. A controller requires a live generation. A retired scope ignores the call. */
  clear (): void
  /**
   * Same binding as `wait()`, with an optional deadline on the lifecycle clock.
   * Rejects with `TimeoutError` on expiry or `RangeError` for an invalid duration.
   */
  when (timeoutMs?: number): Promise<void>
  /**
   * Wait until the bound generation's condition is clear. A controller with no
   * live generation resolves immediately. A bound wait rejects on retirement,
   * even if retirement itself removes the flag. Deadlines follow `when()`.
   */
  whenClear (timeoutMs?: number): Promise<void>
}

/** Options for {@link LifecycleScope.acquire}. */
interface LifecycleAcquireOptions<T> {
  /**
   * Unblock anything waiting on the resource, for example destroy a socket so a
   * task reading from it returns (C-SCOPE-05). Runs once, synchronously, during
   * retirement step 4, before any task is joined or anything is released. For a
   * resource still being created it runs as soon as the resource exists.
   * Interrupts never wait for each other. A returned promise-like is joined
   * with the tasks in step 6, under the stop deadline, and the resource is not
   * released before it settles; its rejection, like a synchronous throw, is a
   * cleanup error. Any other return value is ignored (D38).
   */
  readonly interrupt?: (resource: T) => unknown
}

/**
 * The decision {@link LifecycleScope.recover} returns, synchronously, when it
 * is called (D10, D42, C-REC-03). It says whether a recovery was started, not
 * how it ends: the replacement's outcome is read from the lifecycle (`state`,
 * `whenState`).
 *
 * - `'accepted'`: called from the live generation while it is `running`. It is
 *   retiring, and a replacement is queued. Acceptance does not promise that the
 *   replacement starts: a `stop()` or `restart()` accepted first supersedes it
 *   (C-REC-04), and a retirement that reports an error or times out ends
 *   `failed` with no replacement (C-REC-03).
 * - `'superseded'`: the calling scope was already retiring or retired. Nothing
 *   changed.
 * - `'failed'`: called before this generation reached `running`. It acted like
 *   `fail(reason)`, so a first boot fails fast.
 */
type LifecycleRecoverResult = 'accepted' | 'superseded' | 'failed'

/**
 * The per-generation scope passed to `onStart`: the only way an implementer
 * touches the lifecycle (C-SCOPE-01 to C-SCOPE-09).
 *
 * `acquire`, `use`, `defer`, `spawn` and `start` register obligations in one
 * ledger that retirement releases in a fixed order (C-RET-01). Once the
 * generation starts retiring the scope is **sealed** (C-SCOPE-02): `use` and
 * `defer` release their argument at once (tracked until that succeeds) and
 * throw the retirement reason; `acquire` and `start` reject and `spawn` throws,
 * with the retirement reason, without running anything; `set`, `clear` and
 * `fail` do nothing; `recover` returns
 * `'superseded'`. A stale callback holding an old scope therefore cannot affect
 * a newer run.
 */
interface LifecycleScope {

  /** The generation this scope belongs to. */
  readonly generation: number

  /**
   * Aborted during retirement, after `onStop` for a run that reached `running`
   * (C-RET-01 step 3). Pass it to I/O so abort unblocks it.
   */
  readonly signal: AbortSignal

  /**
   * True once this generation is sealed and retiring (`stop`, `restart`,
   * `recover`, `fail`, `watchdog`, or child crash). Becomes `true`
   * synchronously when retirement begins, before `signal.aborted`.
   */
  readonly isSealed: boolean

  /**
   * Record ownership, then create a resource (C-SCOPE-04, C-SCOPE-05).
   *
   * The release is registered before `create` runs. If `create` resolves after
   * retirement began, the resource is released and `acquire` rejects with the
   * retirement reason at once, without waiting for that release (D41). If
   * `create` rejects, `acquire` rejects with that error and
   * leaves no obligation behind, so retrying in a loop does not grow the ledger.
   *
   * `release` may return anything: a promise-like is awaited, any other value is
   * ignored (C-SCOPE-10), so `socket => socket.destroy()` works even though
   * `destroy()` returns the socket.
   */
  acquire<T> (
    create: (signal: AbortSignal) => T | PromiseLike<T>,
    release: (resource: NoInfer<T>) => unknown,
    options?: LifecycleAcquireOptions<NoInfer<T>>,
  ): Promise<T>

  /**
   * Own an existing disposable and return it unchanged (C-SCOPE-06). Uses
   * `Symbol.asyncDispose` when present, else `Symbol.dispose`; throws `TypeError`
   * for anything else.
   */
  use<T extends AsyncDisposable | Disposable> (resource: T): T

  /**
   * Register a cleanup action, such as removing a listener or clearing a timer.
   * It may return anything: a promise-like is awaited, any other value is ignored
   * (C-SCOPE-10), so `() => emitter.off(event, listener)` works even though
   * `off()` returns the emitter.
   */
  defer (cleanup: () => unknown): void

  /**
   * Start an owned background task, joined during retirement (C-SCOPE-07,
   * C-RET-01 step 6).
   *
   * The task gets `scope.signal` and must return once it aborts. A rejection
   * with `signal.reason` is its own cancellation. Any other rejection fails the
   * generation while it is live, or is reported as a cleanup error while it is
   * retiring.
   */
  spawn (task: (signal: AbortSignal) => Promise<void>): void

  /**
   * Start and own a child lifecycle (C-CHILD-01 to C-CHILD-06).
   *
   * Needs only the {@link Lifecycle} interface, so a child built with either
   * entry point, or another installed copy of this module, works. The child must
   * be `stopped` or cleanly `failed` and not owned by another scope; otherwise
   * this rejects with `LifecycleUnsafeStateError` and leaves the child untouched.
   * When the child fails, or stops without this scope asking, this generation
   * fails with `LifecycleChildFailureError`. A child that restarts or recovers
   * itself is not escalated.
   *
   * The wait uses `scope.signal` as its caller signal (C-CHILD-03): if this
   * generation retires while the child is still starting, it rejects with the
   * abort reason so `onStart` can settle, and the child stays owned until
   * retirement stops it.
   */
  start (child: Lifecycle): Promise<void>

  /** Set a condition declared on this lifecycle (C-COND-01, C-COND-05). */
  set (condition: LifecycleCondition): void

  /** Clear a condition declared on this lifecycle. */
  clear (condition: LifecycleCondition): void

  /**
   * Get the named condition bound to this generation (ADR-02). The same name
   * returns the same handle within this scope. When the scope retires, reads
   * are clear, updates do nothing, and waits reject with LifecycleSupersededError.
   */
  condition (name: string): LifecycleConditionHandle

  /**
   * Acquire a paired start/stop service (ADR-03).
   *
   * Registers `stop()` before starting the service. Startup failure rolls back
   * partial allocation, and a failed `stop()` remains owned for retry.
   *
   * On retirement during startup, `abort()` requests cancellation once, then
   * retirement joins startup and the abort hook before calling `stop()`.
   * With only two hooks, `stop()` runs early to unblock startup. Its successful
   * completion must prevent any further allocation by that startup, even if
   * the startup promise settles later. Supply `abort()` when final disposal
   * requires startup to have settled.
   *
   * A startup that completes during retirement rejects with the scope's
   * retirement reason. Retirement still owns its cleanup.
   */
  acquireService<T> (service: {
    readonly start: (signal: AbortSignal) => T | PromiseLike<T>
    readonly stop: () => unknown
    readonly abort?: () => unknown
  }): Promise<T>

  /**
   * Clock-aware, leak-free cancellation sleep (ADR-05).
   * Automatically unregisters when the scope retires or signal aborts.
   */
  sleep (ms: number): Promise<void>

  /**
   * Execute an operation bound to this generation (ADR-01).
   */
  operation<T> (work: (signal: AbortSignal) => T | PromiseLike<T>): Promise<T>

  /**
   * Listen to an EventTarget or EventEmitter for the duration of this generation (ADR-07).
   */
  listen (
    target: any,
    type: string,
    listener: (...args: any[]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void

  /**
   * Arm a watchdog timer for this generation (ADR-07).
   */
  watchdog (
    options: WatchdogOptions,
  ): Watchdog
  watchdog (
    timeoutMs: number,
    options: { readonly onTimeout: 'fail' | 'recover'; readonly clock?: LifecycleClock },
  ): Watchdog

  /**
   * Report that this generation can no longer run (C-REC-01). It retires with no
   * replacement and ends `failed`. The first failure wins; the value is kept as
   * given, falsy values included.
   */
  fail (error: unknown): void

  /**
   * Retire this generation and start a replacement, without counting as user
   * intent (C-REC-02 to C-REC-05). Returns the decision at once and never
   * throws; see {@link LifecycleRecoverResult}.
   *
   * There is nothing to await (D42): a task that calls it is joined like any
   * other task when this generation retires, so it returns once `scope.signal`
   * aborts (C-REC-05).
   */
  recover (reason?: unknown): LifecycleRecoverResult

}

/** Why a generation is being retired. Passed to `onStop`. */
type LifecycleStopReason = 'stop' | 'restart' | 'recover' | 'failure'

/**
 * The argument of `onStop` (D18).
 *
 * `signal` is the **stop deadline** (`stopTimeoutMs`), not `scope.signal`: when
 * `onStop` runs, the scope's signal is deliberately not aborted yet, so the hook
 * can still use its resources, for example to send a logout packet.
 */
interface LifecycleStop {
  readonly generation: number
  readonly reason: LifecycleStopReason
  readonly signal: AbortSignal
}

/** What an implementer writes. */
interface LifecycleHooks {

  /**
   * Acquire what this run needs, through the scope. Returning commits `running`;
   * throwing (any value, falsy included) fails the attempt, and the ledger rolls
   * the partial start back (C-RET-03).
   */
  onStart (scope: LifecycleScope): void | Promise<void>

  /**
   * Optional graceful goodbye (C-RET-02). Called at most once per generation, and
   * only for a run that reached `running`, before its scope's signal aborts. A
   * rejection is reported as a cleanup error and never retried.
   */
  onStop? (stop: LifecycleStop): void | Promise<void>

  /**
   * Optional observer, called after a snapshot is committed and its waiters are
   * settled (C-OBS-01). Exceptions are isolated (C-OBS-02). It may call commands.
   */
  onStateChange? (state: LifecycleState, previous: LifecycleState): void

}

/**
 * The timer source for deadlines (D12, C-TIME-04). Injected so tests run
 * deadlines without real time. The default uses the global timers.
 *
 * Its timers and `now()` must agree: a timer must not fire before `now()` has
 * reached its due time, apart from rounding to whole milliseconds, and must
 * not run its callback synchronously inside `setTimeout`. The engine judges a
 * deadline by `now()` and arms an early timer again (C-TIME-05), so a clock
 * whose `now()` stays behind its timers would never expire a deadline.
 */
interface LifecycleClock {
  /** Milliseconds on a monotonic scale; only differences are used. */
  now (): number
  setTimeout (callback: () => void, ms: number): unknown
  clearTimeout (handle: unknown): void
}

/** Options for one lifecycle instance. */
interface LifecycleOptions {

  /**
   * A label for diagnostics and error messages (C-SHELL-04). It is published on
   * the diagnostics channel, so it must not contain secrets.
   */
  readonly name?: string

  /**
   * Start deadline in milliseconds (C-TIME-01, C-TIME-02). Must be finite, greater
   * than 0 and at most 2³¹−1, or construction throws `RangeError` (D11). Omitted
   * means no deadline. It runs from the commit of `starting` until the attempt
   * can commit `running`, so it includes waiting for late releases (C-SCOPE-11).
   * Judged by `clock.now()` when an outcome would be committed, not only by its
   * timer firing (C-TIME-05).
   */
  readonly startTimeoutMs?: number

  /**
   * Deadline for one whole retirement pass, in milliseconds (C-TIME-01,
   * C-TIME-03, C-TIME-05). It starts when the retirement is requested, that is
   * when `stop()` or `restart()` is accepted, so `stop()` settles within this
   * budget of the call. Same validation as `startTimeoutMs`.
   */
  readonly stopTimeoutMs?: number

  /** Timer source for the deadlines. */
  readonly clock?: LifecycleClock

}

/** Options for {@link LifecycleController.operation}. */
interface LifecycleOperationOptions {
  /**
   * Allow the operation to run while the lifecycle is in `'starting'` as well
   * as `'running'` (defaults to `false`).
   */
  readonly allowStarting?: boolean
  /**
   * Optional `AbortSignal` from an enclosing active `operation()` on this
   * lifecycle. When recognized, the nested work reuses that signal directly
   * so multi-step domain calls drain cleanly during `'stopping'`.
   */
  readonly signal?: AbortSignal
}

/**
 * What the owner of a lifecycle holds: the caller API plus condition
 * declaration. Returned by `createLifecycle`; `AsyncLifecycle` offers
 * `condition` as a protected method instead.
 */
interface LifecycleController extends Lifecycle {
  /** Declare, or look up, the condition with this name (C-COND-01). */
  condition (name: string): LifecycleConditionHandle

  /**
   * Run `work` as an owned operation of the active generation (ADR-01).
   * Retirement aborts its signal and joins the operation before releasing resources.
   * Rejects with {@link LifecycleUnsafeStateError} outside a live running generation
   * unless `options.allowStarting` is `true` while `'starting'`.
   * A failure from `work` rejects the returned promise and leaves the lifecycle running.
   */
  operation<T> (
    work: (signal: AbortSignal) => T | PromiseLike<T>,
    options?: LifecycleOperationOptions,
  ): Promise<T>
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * The structural part of a snapshot that diagnostics publish. Never contains
 * `error` or `cleanupError` (C-OBS-04).
 */
type LifecycleDiagnosticState =
  | { readonly kind: Exclude<LifecycleStateKind, 'failed'>, readonly generation: number }
  | {
      readonly kind: 'failed'
      readonly generation: number
      readonly phase: LifecycleFailurePhase
      readonly cleanupComplete: boolean
    }

/**
 * A record on the `scopelet.state` diagnostics channel (D44,
 * C-OBS-04), published after each commit and only when the channel has
 * subscribers.
 */
interface LifecycleDiagnosticRecord {
  /** `LifecycleOptions.name`, if any. */
  readonly name: string | undefined
  readonly previous: LifecycleDiagnosticState
  readonly state: LifecycleDiagnosticState
}

export type {
  Lifecycle,
  LifecycleAcquireOptions,
  LifecycleClock,
  LifecycleCondition,
  LifecycleConditionHandle,
  LifecycleController,
  LifecycleDiagnosticRecord,
  LifecycleDiagnosticState,
  LifecycleFailurePhase,
  LifecycleHooks,
  LifecycleOperationOptions,
  LifecycleOptions,
  LifecycleRecoverResult,
  LifecycleScope,
  LifecycleState,
  LifecycleStateKind,
  LifecycleStop,
  LifecycleStopReason,
  LifecycleWaitOptions,
  Watchdog,
  WatchdogOptions,
}
