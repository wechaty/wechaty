/**
 * Async lifecycle public module exports.
 *
 * Keep this barrel small and stable: callers and implementers should consume
 * only contracts, errors, and the two adoption entry points.
 */
export {
  AsyncLifecycle,
  createLifecycle,
} from './async-lifecycle.ts'

export {
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
} from './errors.ts'

export type {
  AsyncDisposable,
  Disposable,
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
} from './types.ts'
