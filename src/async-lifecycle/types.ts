/**
 * Async lifecycle contracts shared by inheritance and composition entry points.
 *
 * This module defines the public caller API, implementer hooks, and scope surface
 * without exposing reconciliation internals. The kernel owns transitions and
 * generation fencing; consumers only observe immutable snapshots.
 */

/**
 * Error-tolerant disposable resource shape for synchronous cleanups.
 */
export interface Disposable {
  [Symbol.dispose](): void
}

/**
 * Error-tolerant disposable resource shape for asynchronous cleanups.
 */
export interface AsyncDisposable {
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
  readonly state: LifecycleState

  start(options?: LifecycleCallOptions): Promise<void>
  stop(options?: LifecycleCallOptions): Promise<void>
  restart(options?: LifecycleCallOptions): Promise<void>

  whenState(
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState>

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
   * The wait rejects if that generation fails or retires first, or if the caller
   * aborts this wait.
   */
  wait(options?: LifecycleCallOptions): Promise<void>
}

/**
 * Implementer-facing scope for one lifecycle generation.
 */
export interface LifecycleScope {
  readonly signal: AbortSignal

  use<T extends AsyncDisposable | Disposable>(resource: T): T
  adopt<T>(resource: T, release: (resource: T) => void | PromiseLike<void>): T
  defer(cleanup: () => void | PromiseLike<void>): void

  spawn(task: (signal: AbortSignal) => Promise<void>): void
  start(child: Lifecycle): Promise<void>

  set(condition: LifecycleCondition): void
  clear(condition: LifecycleCondition): void

  fail(error: unknown): void
}

/**
 * Implementer hooks passed to the composition entry point.
 */
export interface LifecycleHooks {
  onStart(scope: LifecycleScope): Promise<void> | void
  onStop?(scope: LifecycleScope): Promise<void> | void
  onStateChange?(state: LifecycleState, previous: LifecycleState): void
}

/**
 * Lifecycle runtime options.
 */
export interface LifecycleOptions {
  readonly name?: string
  readonly startTimeoutMs?: number
  readonly stopTimeoutMs?: number
}

/**
 * Owner-only controller returned by the composition entry point.
 */
export interface LifecycleController extends Lifecycle {
  condition(name: string): LifecycleCondition
  recover(observed: LifecycleState): Promise<'recovered' | 'superseded'>
}
