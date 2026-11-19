/**
 * Async lifecycle contracts shared by inheritance and composition entry points.
 *
 * This module defines the public caller API, implementer hooks, and scope surface
 * without exposing reconciliation internals. The kernel owns transitions and
 * generation fencing; consumers only observe immutable snapshots.
 */

/**
 * Structural contract for a synchronous disposable resource.
 */
export interface Disposable {
  /** Release the resource before returning. */
  [Symbol.dispose](): void
}

/**
 * Structural contract for an asynchronous disposable resource.
 */
export interface AsyncDisposable {
  /** Resolve after release completes, or reject with its failure. */
  [Symbol.asyncDispose](): PromiseLike<void>
}

/**
 * Per-call options for caller-facing lifecycle methods.
 *
 * The signal aborts only the waiting caller. It never revokes accepted intent or
 * cancels shared lifecycle work.
 */
export interface LifecycleCallOptions {
  readonly signal?: AbortSignal
}

/**
 * Immutable lifecycle snapshot published by the kernel.
 */
export type LifecycleState =
  | Readonly<{ kind: 'stopped'; generation: number }>
  | Readonly<{ kind: 'starting'; generation: number }>
  | Readonly<{ kind: 'running'; generation: number }>
  | Readonly<{ kind: 'stopping'; generation: number }>
  | Readonly<{
    kind: 'failed'
    generation: number
    phase: 'start' | 'run' | 'stop'
    error: unknown
    cleanupComplete: boolean
    cleanupError?: unknown
  }>

/**
 * Minimal caller-facing lifecycle API shared by all layers.
 */
export interface Lifecycle extends AsyncDisposable {
  /** The current frozen snapshot. */
  readonly state: LifecycleState

  /** Request a run or join a pending one. Reject on failure, supersession, or caller abort. */
  start(options?: LifecycleCallOptions): Promise<void>

  /** Retire owned work and retry dirty cleanup. The result survives a queued start. */
  stop(options?: LifecycleCallOptions): Promise<void>

  /** Retire the current generation and start a fresh one. A later stop supersedes it. */
  restart(options?: LifecycleCallOptions): Promise<void>

  /** Observe the current and future snapshots. Caller abort and predicate errors reject this wait. */
  whenState(
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState>

  /** Request the same retirement as stop(). */
  [Symbol.asyncDispose](): Promise<void>
}

/**
 * Generation-bound condition primitive used by application-specific readiness APIs.
 */
export interface LifecycleCondition {
  readonly name: string

  /**
   * Waits until the bound generation sets this condition.
   *
   * Bind to an open generation, or to the next generation while idle or
   * retiring. Reject if the caller aborts or the bound generation retires
   * first. A new stop intent before that generation starts rejects the wait
   * with LifecycleSupersededError.
   */
  wait(options?: LifecycleCallOptions): Promise<void>
}

/**
 * Implementer-facing scope for one lifecycle generation.
 */
export interface LifecycleScope {
  /** Interrupt I/O on abort so owned tasks can finish while resources are still live. */
  readonly signal: AbortSignal

  /** Own a disposable and return it. Prefer asynchronous disposal when available. */
  use<T extends AsyncDisposable | Disposable>(resource: T): T
  /** Own a resource using its release callback and return that same resource. */
  adopt<T>(resource: T, release: (resource: T) => void | PromiseLike<void>): T
  /** Register release in reverse registration order. A sealed scope releases immediately and throws. */
  defer(cleanup: () => void | PromiseLike<void>): void

  /**
   * Run a task with the scope signal. Retirement aborts the signal and joins
   * the task before disposing resources. Use the signal to interrupt blocking
   * work so the task can finish. Active task failures fail this generation.
   */
  spawn(task: (signal: AbortSignal) => Promise<void>): void
  /**
   * Claim an idle child and fail this generation if it exits unexpectedly.
   * Children from either lifecycle entry point reject the claim while a command
   * or cleanup is pending. A refused claim leaves the child untouched.
   */
  start(child: Lifecycle): Promise<void>

  /** Resolve waits for a condition owned by this controller and bound to this generation. */
  set(condition: LifecycleCondition): void
  /** Clear the condition for future waits in this generation. */
  clear(condition: LifecycleCondition): void

  /** Record the first active failure and interrupt the generation. Sealed scopes ignore it. */
  fail(error: unknown): void
}

/**
 * Implementer hooks passed to the composition entry point.
 */
export interface LifecycleHooks {
  /** Acquire and register resources. Returning permits publication of the running state. */
  onStart(scope: LifecycleScope): Promise<void> | void
  /** Say goodbye once startup entered. Ordinary running stop calls this before abort. */
  onStop?(scope: LifecycleScope): Promise<void> | void
  /** Observe committed snapshots after attempt settlement. Exceptions are isolated. */
  onStateChange?(state: LifecycleState, previous: LifecycleState): void
}

/**
 * Lifecycle runtime options.
 */
export interface LifecycleOptions {
  /** Optional non-sensitive diagnostic label. */
  readonly name?: string
  /** Positive deadline for the start hook. The hook remains owned after timeout. */
  readonly startTimeoutMs?: number
  /** Positive deadline for a full retirement wait, including hooks, joins and releases. */
  readonly stopTimeoutMs?: number
}

/**
 * Owner-only controller returned by the composition entry point.
 */
export interface LifecycleController extends Lifecycle {
  /** Declare or retrieve an instance-owned named condition. */
  condition(name: string): LifecycleCondition
  /**
   * Request replacement for the current clean failure while intent still
   * permits running. Resolve when the replacement succeeds or report supersession.
   */
  recover(observed: LifecycleState): Promise<'recovered' | 'superseded'>
}
