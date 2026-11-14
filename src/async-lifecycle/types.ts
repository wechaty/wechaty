/**
 * Public Tier 1 (caller) and Tier 2 (implementer) contracts for the zero-dependency
 * `AsyncLifecycle` module.
 *
 * Architectural boundary:
 * - Owns all structural interfaces, discriminated-union state snapshots, option bags,
 *   and small pure state-classification predicates shared across the kernel, ledger,
 *   conditions, entry shells, and companion helpers.
 * - Imports zero runtime or Node-specific dependencies (`node:events` is intentionally
 *   absent so the module remains portable across Node.js, Deno, and Web runtimes).
 */

/**
 * Canonical string tag for every lifecycle snapshot variant.
 */
export type LifecycleStateKind =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'failed'

/**
 * Ordered list of all valid `LifecycleState['kind']` discriminants.
 */
export const LIFECYCLE_STATE_KINDS: readonly LifecycleStateKind[] = Object.freeze([
  'stopped',
  'starting',
  'running',
  'stopping',
  'failed',
])

/**
 * Lifecycle phase in which a generation entered `failed`.
 *
 * - `'start'`: `onStart` threw, timed out, failed via `scope.fail()`, or cleanup failed
 *   while aborting an incomplete startup.
 * - `'run'`: an active generation reported an unrecoverable runtime failure via
 *   `scope.fail()`, an unhandled `scope.spawn()` rejection, or an owned child failure.
 * - `'stop'`: retiring a running (or superseded starting) generation encountered a
 *   hook/disposer failure or exceeded `stopTimeoutMs`.
 */
export type LifecycleFailurePhase = 'start' | 'run' | 'stop'

/**
 * Why a running generation entered graceful `onStop(stop)`.
 *
 * - `'stop'`: explicit `stop()` or `[Symbol.asyncDispose]()`.
 * - `'restart'`: explicit `restart()`.
 * - `'recover'`: authority-checked `scope.recover()`.
 * - `'failure'`: runtime failure triggered retirement of a `running` generation.
 */
export type StopReason = 'stop' | 'restart' | 'recover' | 'failure'

/**
 * Non-throwing outcome returned by `scope.recover(reason?)`.
 *
 * - `'recovered'`: current generation retired cleanly and replacement generation `G + 1`
 *   committed `running`.
 * - `'superseded'`: recovery had lost authority before entry or lost a race against a
 *   newer caller command (`stop()`, `restart()`, or `stop() -> start()`) during retirement.
 * - `'failed'`: called before `running` committed (degraded to fail-fast `scope.fail()`),
 *   retirement of generation `G` left cleanup errors/debt, or replacement `G + 1` failed.
 */
export type RecoveryOutcome = 'recovered' | 'superseded' | 'failed'

/**
 * Idle snapshot committed initially (`generation: 0`) and after clean retirement.
 */
export interface StoppedLifecycleState {
  readonly kind: 'stopped'
  readonly generation: number
}

/**
 * Snapshot committed while `onStart(scope)` is executing for `generation`.
 */
export interface StartingLifecycleState {
  readonly kind: 'starting'
  readonly generation: number
}

/**
 * Snapshot committed once `onStart(scope)` resolves without supersession or failure.
 */
export interface RunningLifecycleState {
  readonly kind: 'running'
  readonly generation: number
}

/**
 * Snapshot committed while retiring an active or dirty generation.
 */
export interface StoppingLifecycleState {
  readonly kind: 'stopping'
  readonly generation: number
}

/**
 * Terminal generation failure snapshot carrying both primary and cleanup diagnostics.
 *
 * Invariant: when `cleanupComplete` is `false`, unreleased resources or unjoined work may
 * still exist; `start()` and `restart()` reject with `LifecycleUnsafeStateError` until an
 * explicit `stop()` finishes cleaning up the remaining debt.
 */
export interface FailedLifecycleState {
  readonly kind: 'failed'
  readonly generation: number
  readonly phase: LifecycleFailurePhase
  readonly error: unknown
  readonly cleanupComplete: boolean
  readonly cleanupError?: unknown
}

/**
 * Frozen discriminated-union snapshot describing the current state of a `Lifecycle`.
 */
export type LifecycleState =
  | StoppedLifecycleState
  | StartingLifecycleState
  | RunningLifecycleState
  | StoppingLifecycleState
  | FailedLifecycleState

/**
 * Per-call options accepted by Tier 1 lifecycle commands and condition/state waiters.
 */
export interface LifecycleCallOptions {
  /**
   * Cancels ONLY this caller's wait. Never aborts shared startup/shutdown work and never
   * revokes accepted desired-state intent once accepted. If already aborted on entry, the
   * call rejects immediately with `signal.reason` before any intent is accepted.
   */
  readonly signal?: AbortSignal | undefined
}

/**
 * Tier 1 public caller interface exposed identically by `AsyncLifecycle` and `createLifecycle()`.
 */
export interface Lifecycle extends AsyncDisposable {
  /**
   * Frozen current state snapshot. Transitions occur atomically inside the kernel.
   */
  readonly state: LifecycleState

  /**
   * Requests `desired = 'running'` synchronously and resolves when the resulting generation
   * genuinely commits `running`. Rejects on startup failure, supersession by `stop()` or
   * `restart()`, unsafe dirty `failed` state, or caller `options.signal` abort.
   */
  start (options?: LifecycleCallOptions): Promise<void>

  /**
   * Requests `desired = 'stopped'` synchronously, supersedes in-flight starts/restarts/recoveries,
   * and resolves once owned resources are released. Retries remaining cleanup when invoked on
   * `failed { cleanupComplete: false }`. Rejects if cleanup fails or times out.
   */
  stop (options?: LifecycleCallOptions): Promise<void>

  /**
   * Forces full retirement of any active run followed by a fresh generation reaching `running`.
   * Never no-ops when already `running`. Superseded by a later `stop()`.
   */
  restart (options?: LifecycleCallOptions): Promise<void>

  /**
   * Cross-generation state observer. Resolves with the frozen snapshot as soon as `predicate(state)`
   * returns `true` (checked synchronously against `this.state` first, then on subsequent commits).
   * Rejects only when `options.signal` aborts or `predicate` throws.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState>

  /**
   * Equivalent to `stop()`. Enables `await using` ownership while keeping the instance reusable.
   */
  [Symbol.asyncDispose] (): Promise<void>
}

/**
 * Context passed to graceful `onStop(stop)` before generation resources are aborted or unwound.
 */
export interface LifecycleStopContext {
  /** Generation number currently retiring from `running`. */
  readonly generation: number
  /** Transition trigger that initiated retirement. */
  readonly reason: StopReason
  /**
   * Deadline signal bounded by `stopTimeoutMs` (never `scope.signal`, which remains unaborted
   * throughout `onStop` so live channels/connections can flush goodbye frames).
   */
  readonly signal: AbortSignal
}

/**
 * Convenience alias matching the RFC shorthand `StopContext`.
 */
export type StopContext = LifecycleStopContext

/**
 * Options for pre-accounted resource acquisition via `scope.acquire()`.
 */
export interface AcquireOptions<T> {
  /** Diagnostic label for error context. */
  readonly name?: string | undefined
  /**
   * Optional interrupt callback invoked immediately when `scope.signal` aborts during
   * retirement—strictly BEFORE background `spawn()` tasks and in-flight startup work are
   * joined—to unblock pending reads/streams without destroying resource state early.
   */
  readonly interrupt?: ((resource: T) => void | PromiseLike<void>) | undefined
}

/**
 * Options for owned background tasks started via `scope.spawn()`.
 */
export interface SpawnOptions {
  /** Diagnostic label for error context. */
  readonly name?: string | undefined
}

/**
 * Structural contract for Node-style event emitters (`EventEmitter`, `TypedEventEmitter`, etc.).
 */
export interface EventEmitterLike {
  on (event: string, listener: (...args: any[]) => void): unknown
  off? (event: string, listener: (...args: any[]) => void): unknown
  removeListener? (event: string, listener: (...args: any[]) => void): unknown
}

/**
 * Structural contract for standard Web `EventTarget` objects.
 */
export interface EventTargetLike {
  addEventListener (type: string, callback: (event: any) => void): void
  removeEventListener (type: string, callback: (event: any) => void): void
}

/**
 * Structural union accepted by `scope.listen()` without importing `node:events`.
 */
export type ListenTarget = EventEmitterLike | EventTargetLike

/**
 * Generation-bound named condition (e.g. `'ready'`, `'login'`) declared via `condition(name)`.
 */
export interface LifecycleCondition {
  /** Condition identifier scoped to its owning lifecycle instance. */
  readonly name: string
  /** `true` iff an active (`starting` or `running`) generation has currently set this condition. */
  readonly isSet: boolean
  /**
   * Waits for this condition to be set on the currently active generation, or on the next
   * generation if currently idle/stopping/failed. Rejects if the bound generation fails or
   * stops first, if an explicit `stop()` invalidates a pre-start wait, or on caller abort.
   */
  wait (options?: LifecycleCallOptions): Promise<void>
}

/**
 * Per-generation capability facade passed to `onStart(scope)`.
 *
 * Every mutation on `LifecycleScope` is generation-fenced: stale callbacks holding a retired
 * `scope` cannot register resources into, set conditions on, fail, or recover a newer generation.
 */
export interface LifecycleScope {
  /** Monotonic positive integer (`1, 2, ...`) uniquely identifying this attempt. */
  readonly generation: number

  /**
   * Cooperative cancellation signal for this generation. Remains unaborted during graceful
   * `onStop(stop)` and aborts immediately before `interrupt` + LIFO ledger unwind.
   */
  readonly signal: AbortSignal

  /**
   * Reserves ledger ownership BEFORE invoking `create(signal)`. If the scope seals while
   * `create` is in flight, awaits settlement (bounded by `stopTimeoutMs`), immediately runs
   * `interrupt` + `release` on any late-arriving resource, tracks any release failure as debt,
   * and rejects with the abort reason.
   */
  acquire<T> (
    create: (signal: AbortSignal) => T | PromiseLike<T>,
    release: (resource: NoInfer<T>) => void | PromiseLike<void>,
    options?: AcquireOptions<NoInfer<T>>,
  ): Promise<T>

  /**
   * Registers an already-constructed `AsyncDisposable` or `Disposable` in LIFO order.
   * If called after retirement sealed the scope, disposes `resource` immediately and throws.
   */
  use<T extends AsyncDisposable | Disposable> (resource: T): T

  /**
   * Registers an arbitrary sync/async cleanup callback in LIFO order.
   * If called after retirement sealed the scope, runs `cleanup` immediately and throws.
   */
  defer (cleanup: () => void | PromiseLike<void>): void

  /**
   * Subscribes `listener` on an `EventEmitter`-like or `EventTarget`-like `target` and
   * registers automatic listener removal in LIFO order.
   */
  listen (
    target: ListenTarget,
    event: string,
    listener: (...args: any[]) => void,
  ): void

  /**
   * Starts an owned background task joined automatically during retirement.
   * Any non-abort rejection while the generation is active triggers `scope.fail(error)`.
   */
  spawn (
    task: (signal: AbortSignal) => Promise<void>,
    options?: SpawnOptions,
  ): void

  /**
   * Exclusively adopts and starts a child `Lifecycle` (or fresh factory `() => C`).
   * Refuses non-idle or dirty-failed children with `LifecycleUnsafeStateError`, stops the
   * child in reverse order on parent retirement, and escalates unexpected child `failed`
   * or unrequested `stopped` transitions to `scope.fail(cause)` while tolerating child
   * self-recovery (`running -> stopping -> starting -> running`).
   */
  start<C extends Lifecycle> (child: C | (() => C)): Promise<C>

  /** Marks `condition` satisfied for this generation. No-op if this generation is retired. */
  set (condition: LifecycleCondition): void

  /** Clears `condition` for subsequent waiters in this generation. No-op if retired. */
  clear (condition: LifecycleCondition): void

  /**
   * Reports an unrecoverable failure for this generation and triggers asynchronous retirement.
   * Idempotent and non-throwing; no-op if this generation has already retired.
   */
  fail (error: unknown): void

  /**
   * Authority-checked self-recovery (`running(G) -> stopping(G) -> starting(G + 1)`).
   * Validated against the user intent revision captured when generation `G` booted—both on
   * entry and again after `G` retires—so explicit caller commands always win.
   * If called before `running` is committed, degrades to fail-fast `scope.fail(reason)` and
   * resolves `'failed'`.
   */
  recover (reason?: unknown): Promise<RecoveryOutcome>
}

/**
 * Tier 2 hooks supplied to `createLifecycle(hooks, options)`.
 */
export interface LifecycleHooks {
  /**
   * Acquires all resources, listeners, tasks, and children for a single generation.
   * Resolving commits `running` iff intent and generation remain current.
   */
  onStart (scope: LifecycleScope): Promise<void> | void

  /**
   * Optional graceful pre-abort flush hook. Invoked ONLY when retiring a generation that
   * actually committed `running`. Partial startups unwindsolely via the `LifecycleScope` ledger.
   */
  onStop? (stop: LifecycleStopContext): Promise<void> | void

  /**
   * Optional post-commit state observer. Invoked after the frozen snapshot is installed and
   * eligible attempt/condition waiters are settled. Synchronous throws are isolated.
   */
  onStateChange? (state: LifecycleState, previous: LifecycleState): void
}

/**
 * Opaque timer handle returned by `LifecycleClock.setTimeout()`.
 */
export interface LifecycleTimerHandle {
  unref? (): unknown
}

/**
 * Injectable timer clock enabling deterministic unit tests without wall-clock sleeps.
 */
export interface LifecycleClock {
  now (): number
  setTimeout (callback: () => void, ms: number): LifecycleTimerHandle
  clearTimeout (handle: LifecycleTimerHandle): void
}

/**
 * Configuration options shared by `createLifecycle()` and `new AsyncLifecycle()`.
 */
export interface LifecycleOptions {
  /** Human-readable service name emitted in error messages and privacy-safe diagnostics. */
  readonly name?: string | undefined
  /** Maximum milliseconds allowed for `onStart(scope)` before aborting with `LifecycleTimeoutError`. */
  readonly startTimeoutMs?: number | undefined
  /**
   * Maximum milliseconds allowed for graceful `onStop` and for ledger unwind before committing
   * `failed { phase: 'stop', cleanupComplete: false }` with `LifecycleTimeoutError`.
   */
  readonly stopTimeoutMs?: number | undefined
  /** Custom clock implementation (defaults to platform `Date.now` / `setTimeout` / `clearTimeout`). */
  readonly clock?: LifecycleClock | undefined
}

/**
 * Composition controller returned by `createLifecycle(hooks, options)`.
 * Owners keep this reference private, delegate Tier 1 `Lifecycle` methods, and declare
 * domain conditions (such as `ready` or `login`) via `condition(name)`.
 */
export interface LifecycleController extends Lifecycle {
  condition (name: string): LifecycleCondition
}

/**
 * Options for the companion `createWatchdog(scope, options)` helper.
 */
export interface WatchdogOptions {
  /** Inactivity window in milliseconds (must be a finite positive number). */
  readonly timeoutMs: number
  /**
   * Action taken on expiry: `'recover'` (default) invokes `void scope.recover(err)`;
   * `'fail'` invokes `scope.fail(err)`.
   */
  readonly onTimeout?: 'recover' | 'fail' | undefined
  /** Optional label included in the generated timeout error message. */
  readonly name?: string | undefined
  /** Optional deterministic clock override. */
  readonly clock?: LifecycleClock | undefined
}

/**
 * Control handle returned by `createWatchdog(scope, options)`.
 */
export interface WatchdogHandle {
  /** Resets the inactivity deadline (optionally overriding `timeoutMs` for the next window). */
  feed (timeoutMs?: number): void
  /** Disarms the current timer without retiring the owning generation. */
  disarm (): void
}

/**
 * Returns `true` when `state` owns zero unreleased generation resources (`stopped`, or
 * `failed` with `cleanupComplete: true`), making it safe to start a fresh generation.
 */
export function isCleanIdleState (state: LifecycleState): boolean {
  return state.kind === 'stopped' || (state.kind === 'failed' && state.cleanupComplete)
}

/**
 * Returns `true` when `state` represents a live generation (`starting` or `running`).
 */
export function isActiveGenerationState (
  state: LifecycleState,
): state is StartingLifecycleState | RunningLifecycleState {
  return state.kind === 'starting' || state.kind === 'running'
}
