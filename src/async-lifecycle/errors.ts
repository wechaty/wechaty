/**
 * Typed error hierarchy for `AsyncLifecycle`.
 *
 * Architectural boundary:
 * - Provides deterministic, `instanceof`-checkable error subclasses with stable string
 *   `code` discriminants and standard `ErrorOptions` (`cause`) chaining.
 * - Multi-error cleanup failures intentionally use the standard ES `AggregateError` rather
 *   than a custom wrapper so callers can inspect `.errors` uniformly across runtimes.
 */

import type { LifecycleFailurePhase } from './types.ts'

/**
 * Stable machine-readable error codes emitted by `AsyncLifecycle`.
 */
export type LifecycleErrorCode =
  | 'LIFECYCLE_SUPERSEDED'
  | 'LIFECYCLE_TIMEOUT'
  | 'LIFECYCLE_UNSAFE_STATE'
  | 'LIFECYCLE_CHILD_FAILED'
  | 'LIFECYCLE_FINAL_METHOD_OVERRIDE'

/**
 * Base class for domain errors raised by `AsyncLifecycle` (except `LifecycleOverrideError`,
 * which extends `TypeError` to signal an API contract violation at subclass construction time).
 */
export class LifecycleError extends Error {
  readonly code: LifecycleErrorCode

  constructor (
    code: LifecycleErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = new.target.name
    this.code = code
  }
}

/**
 * Raised when an in-flight `start()`, `restart()`, or `LifecycleCondition.wait()` is
 * superseded by a newer lifecycle transition (`stop()`, `restart()`, or generation retirement)
 * before its target outcome is reached.
 */
export class LifecycleSupersededError extends LifecycleError {
  constructor (
    message = 'Lifecycle operation was superseded by a newer command or retirement',
    options?: ErrorOptions,
  ) {
    super('LIFECYCLE_SUPERSEDED', message, options)
  }
}

/**
 * Raised when `onStart` exceeds `startTimeoutMs`, when `onStop` or ledger unwind exceeds
 * `stopTimeoutMs`, or when a `createWatchdog()` timer expires.
 */
export class LifecycleTimeoutError extends LifecycleError {
  readonly phase: LifecycleFailurePhase
  readonly timeoutMs: number

  constructor (
    phase: LifecycleFailurePhase,
    timeoutMs: number,
    serviceName?: string,
    options?: ErrorOptions,
  ) {
    const prefix = serviceName ? `[${serviceName}] ` : ''
    super(
      'LIFECYCLE_TIMEOUT',
      `${prefix}Lifecycle ${phase} timed out after ${timeoutMs}ms`,
      options,
    )
    this.phase = phase
    this.timeoutMs = timeoutMs
  }
}

/**
 * Raised when starting a lifecycle from `failed { cleanupComplete: false }` before an
 * explicit `stop()` finishes releasing leaked resources, or when `scope.start(child)` is
 * handed a child that is already active/stopping or in a dirty `failed` state.
 */
export class LifecycleUnsafeStateError extends LifecycleError {
  constructor (message: string, options?: ErrorOptions) {
    super('LIFECYCLE_UNSAFE_STATE', message, options)
  }
}

/**
 * Used as the structured failure reason on a parent generation when an owned child started
 * via `scope.start(child)` enters `failed` or stops without parent request.
 */
export class LifecycleChildFailureError extends LifecycleError {
  readonly childGeneration: number

  constructor (
    message: string,
    childGeneration: number,
    options?: ErrorOptions,
  ) {
    super('LIFECYCLE_CHILD_FAILED', message, options)
    this.childGeneration = childGeneration
  }
}

/**
 * Thrown synchronously by the `AsyncLifecycle` constructor if a subclass overrides one of
 * the final Tier 1 lifecycle members (`start`, `stop`, `restart`, `whenState`, `state`, or
 * `[Symbol.asyncDispose]`).
 */
export class LifecycleOverrideError extends TypeError {
  readonly code: LifecycleErrorCode = 'LIFECYCLE_FINAL_METHOD_OVERRIDE'
  readonly memberName: string

  constructor (subclassName: string, memberName: string) {
    super(
      `${subclassName} must not override final AsyncLifecycle member "${memberName}"; implement onStart/onStop/onStateChange instead`,
    )
    this.name = 'LifecycleOverrideError'
    this.memberName = memberName
  }
}

/**
 * Collapses one or more cleanup errors into either the sole error (`length === 1`) or a
 * native `AggregateError` (`length > 1`), returning `undefined` when `errors` is empty.
 */
export function collapseCleanupErrors (
  errors: readonly unknown[],
  message = 'Multiple errors occurred during lifecycle cleanup',
): unknown {
  if (errors.length === 0) {
    return undefined
  }
  if (errors.length === 1) {
    return errors[0]
  }
  return new AggregateError(errors, message)
}
