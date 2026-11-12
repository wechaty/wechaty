/**
 * Typed error contracts for asynchronous lifecycle orchestration.
 *
 * Owns the failure taxonomy shared by `LifecycleController`, `ResourceScope`,
 * and `ReadinessGate` so callers and supervisors can distinguish supersession,
 * cancellation, deadlines, unsafe dirty-cleanup states, and multi-error
 * rollbacks without parsing error message strings. Zero domain or third-party
 * dependencies.
 */

/**
 * Thrown when an in-flight or queued lifecycle attempt (`start`, `restart`, or
 * `ready`) is replaced by a newer authoritative command such as `stop()`.
 */
export class LifecycleSupersededError extends Error {

  readonly operation: string

  constructor (
    operation: string,
    message = `Lifecycle ${operation} attempt was superseded by a newer intent`,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'LifecycleSupersededError'
    this.operation = operation
    Object.setPrototypeOf(this, new.target.prototype)
  }

}

/**
 * Thrown when a transition cannot safely proceed because a prior generation's
 * cleanup failed or an uncooperative hook has not yet settled (`cleanupComplete: false`).
 */
export class LifecycleUnsafeStateError extends Error {

  readonly generation: number

  constructor (
    generation: number,
    message = `Lifecycle generation ${generation} has unproven resource cleanup; unsafe overlap is blocked`,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'LifecycleUnsafeStateError'
    this.generation = generation
    Object.setPrototypeOf(this, new.target.prototype)
  }

}

/**
 * Thrown when a bounded lifecycle phase (`start` or `stop`) exceeds its
 * configured deadline. A timeout requests cancellation and initiates cleanup;
 * it never implies that startup succeeded or that resources are released.
 */
export class LifecycleTimeoutError extends Error {

  readonly phase: 'start' | 'stop'
  readonly timeoutMs: number

  constructor (
    phase: 'start' | 'stop',
    timeoutMs: number,
    options?: ErrorOptions,
  ) {
    super(`Lifecycle ${phase} timed out after ${timeoutMs} ms`, options)
    this.name = 'LifecycleTimeoutError'
    this.phase = phase
    this.timeoutMs = timeoutMs
    Object.setPrototypeOf(this, new.target.prototype)
  }

}

/**
 * Aggregates one or more teardown/rollback failures while preserving an
 * optional triggering startup or runtime error via `cause`.
 */
export class LifecycleAggregateCleanupError extends AggregateError {

  constructor (
    errors: readonly unknown[],
    message = `Lifecycle cleanup failed with ${errors.length} error(s)`,
    options?: ErrorOptions,
  ) {
    super(errors, message, options)
    this.name = 'LifecycleAggregateCleanupError'
    Object.setPrototypeOf(this, new.target.prototype)
  }

}

/**
 * Normalizes an `AbortSignal.reason` into an `Error` / `DOMException` instance
 * consistently across Node.js and Deno.
 */
export function toAbortError (reason?: unknown): Error {
  if (reason instanceof Error) {
    return reason
  }
  const message = reason === undefined
    ? 'The operation was aborted.'
    : String(reason)
  return new DOMException(message, 'AbortError')
}
