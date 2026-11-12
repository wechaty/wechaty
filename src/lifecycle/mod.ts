/**
 * Exposes Wechaty's internal lifecycle primitives.
 */
export {
  AwaitableState,
  type LegacyStateValue,
} from './awaitable-state.ts'

export {
  AsyncLifecycleController,
  type AsyncLifecycleHooks,
  type AsyncLifecycleState,
  type LegacyLifecycleState,
} from './async-lifecycle.ts'
