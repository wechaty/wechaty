/**
 * Async lifecycle error types used by the public API.
 *
 * These classes are intentionally small and serializable so callers can classify
 * expected lifecycle control outcomes without depending on internal state.
 */

/**
 * Raised when a wait is replaced by a newer intent revision.
 */
export class LifecycleSupersededError extends Error {
  constructor(message = 'Lifecycle request superseded by newer intent') {
    super(message)
    this.name = 'LifecycleSupersededError'
  }
}

/**
 * Raised when a lifecycle deadline expires.
 */
export class LifecycleTimeoutError extends Error {
  readonly operation: 'start' | 'stop'
  readonly timeoutMs: number

  constructor(
    operation: 'start' | 'stop',
    timeoutMs: number,
  ) {
    super(`${operation} timed out after ${timeoutMs}ms`)
    this.operation = operation
    this.timeoutMs = timeoutMs
    this.name = 'LifecycleTimeoutError'
  }
}

/**
 * Raised when a command is unsafe for the current cleanup state.
 */
export class LifecycleUnsafeStateError extends Error {
  constructor(message = 'Lifecycle is in unsafe state for this operation') {
    super(message)
    this.name = 'LifecycleUnsafeStateError'
  }
}
