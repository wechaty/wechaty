/**
 * Public entry point for Wechaty's standalone-ready asynchronous lifecycle
 * orchestration module.
 *
 * Exposes `LifecycleController`, `ResourceScope`, `ReadinessGate`, typed
 * lifecycle errors, and `node:diagnostics_channel` observability constants with
 * zero domain or third-party runtime dependencies.
 */
export {
  type LifecycleCallOptions,
  LifecycleController,
  type LifecycleControllerOptions,
  type LifecycleFailurePhase,
  type LifecycleHookContext,
  type LifecycleHooks,
  type LifecycleState,
  type LifecycleStopContext,
  type RecoveryOutcome,
  type RecoveryToken,
} from './controller.ts'
export {
  LIFECYCLE_DIAGNOSTICS_CHANNEL,
  type LifecycleDiagnosticRecord,
  type LifecycleStateKind,
  publishLifecycleDiagnostic,
} from './diagnostics.ts'
export {
  LifecycleAggregateCleanupError,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
  toAbortError,
} from './errors.ts'
export {
  ReadinessGate,
} from './readiness.ts'
export {
  type EventTargetLike,
  type ResourceContext,
  type ResourceDescriptor,
  ResourceScope,
  type ScopeCloseOptions,
  type ScopeCloseResult,
} from './resource-scope.ts'
