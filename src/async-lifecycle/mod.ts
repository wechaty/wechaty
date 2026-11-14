/**
 * Public barrel entry point for the Wechaty 2.0 `AsyncLifecycle` module.
 *
 * Architectural boundary:
 * - Exports the two ergonomic lifecycle entry shells (`AsyncLifecycle` for inheritance and
 *   `createLifecycle` for composition), all Tier 1 & Tier 2 TypeScript contracts, typed
 *   errors, companion helpers (`listen`, `createWatchdog`), deterministic clock utilities,
 *   and `node:diagnostics_channel` constants/types.
 * - Zero runtime coupling to `Wechaty`, `Puppet`, `Io`, `state-switch`, or `node:events`,
 *   allowing this directory to be extracted into a standalone npm package unchanged.
 */

export { AsyncLifecycle } from './async-lifecycle.ts'
export {
  createManualClock,
  type ManualClock,
  SYSTEM_CLOCK,
} from './clock.ts'
export {
  createWatchdog,
  listen,
} from './companions.ts'
export { createLifecycle } from './create-lifecycle.ts'
export {
  LIFECYCLE_DIAGNOSTICS_CHANNEL,
  type LifecycleDiagnosticEvent,
} from './diagnostics.ts'
export {
  LifecycleChildFailureError,
  LifecycleError,
  type LifecycleErrorCode,
  LifecycleOverrideError,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
} from './errors.ts'
export {
  type AcquireOptions,
  type EventEmitterLike,
  type EventTargetLike,
  type FailedLifecycleState,
  isActiveGenerationState,
  isCleanIdleState,
  LIFECYCLE_STATE_KINDS,
  type Lifecycle,
  type LifecycleCallOptions,
  type LifecycleClock,
  type LifecycleCondition,
  type LifecycleController,
  type LifecycleFailurePhase,
  type LifecycleHooks,
  type LifecycleOptions,
  type LifecycleScope,
  type LifecycleState,
  type LifecycleStateKind,
  type LifecycleStopContext,
  type LifecycleTimerHandle,
  type ListenTarget,
  type RecoveryOutcome,
  type RunningLifecycleState,
  type SpawnOptions,
  type StartingLifecycleState,
  type StopContext,
  type StoppedLifecycleState,
  type StoppingLifecycleState,
  type StopReason,
  type WatchdogHandle,
  type WatchdogOptions,
} from './types.ts'
