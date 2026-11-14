/**
 * Privacy-safe internal observability for `AsyncLifecycle` via `node:diagnostics_channel`.
 *
 * Architectural boundary:
 * - Publishes lightweight, frozen structural transition records on channel
 *   `'wechaty.async-lifecycle'` strictly after state snapshots commit.
 * - Allocates zero payload objects when `channel.hasSubscribers` is `false`.
 * - Never includes raw `Error` instances, error messages, tokens, endpoints, options, or
 *   mutable service references (per issue #2883 privacy contract).
 *
 * Subscriber contract:
 * - Diagnostic subscribers MUST be non-throwing and MUST unsubscribe when finished.
 *   Note: `publishLifecycleDiagnostic()` wraps `publish()` in `try / catch` so synchronous
 *   throws do not abort kernel reconciliation (e.g. under Deno), whereas Node.js forwards
 *   subscriber exceptions via `process.nextTick` to `uncaughtException` by platform design.
 */

import diagnosticsChannel from 'node:diagnostics_channel'

import type {
  LifecycleFailurePhase,
  LifecycleState,
  LifecycleStateKind,
} from './types.ts'

/**
 * Canonical `node:diagnostics_channel` name for `AsyncLifecycle` state commits.
 */
export const LIFECYCLE_DIAGNOSTICS_CHANNEL = 'wechaty.async-lifecycle'

/**
 * Versioned, privacy-safe payload published on `LIFECYCLE_DIAGNOSTICS_CHANNEL`.
 */
export interface LifecycleDiagnosticEvent {
  readonly version: 1
  /** Monotonic per-instance correlation identifier (`1, 2, ...`). */
  readonly instanceId: number
  /** Service label (`options.name` or `'AsyncLifecycle'`). */
  readonly service: string
  /** Snapshot generation number at commit time. */
  readonly generation: number
  /** Current monotonic user-intent revision at commit time. */
  readonly revision: number
  /** Previous committed `state.kind`. */
  readonly previousKind: LifecycleStateKind
  /** Newly committed `state.kind`. */
  readonly kind: LifecycleStateKind
  /** Wall/clock timestamp from `LifecycleClock.now()`. */
  readonly timestampMs: number
  /** Elapsed milliseconds spent in the preceding state, when measurable. */
  readonly durationMs: number
  /** Present only when `kind === 'failed'`. */
  readonly phase?: LifecycleFailurePhase
  /** Present only when `kind === 'failed'`. */
  readonly cleanupComplete?: boolean
}

const transitionChannel = diagnosticsChannel.channel(LIFECYCLE_DIAGNOSTICS_CHANNEL)

let nextInstanceId = 1

/**
 * Allocates a unique, monotonic numeric identifier for correlating concurrent lifecycle
 * instances in diagnostic subscribers without retaining object references.
 */
export function allocateLifecycleInstanceId (): number {
  return nextInstanceId++
}

/**
 * Publishes a frozen `LifecycleDiagnosticEvent` iff at least one subscriber is listening
 * on `LIFECYCLE_DIAGNOSTICS_CHANNEL`.
 */
export function publishLifecycleDiagnostic (params: {
  readonly instanceId: number
  readonly service: string
  readonly revision: number
  readonly previous: LifecycleState
  readonly current: LifecycleState
  readonly timestampMs: number
  readonly durationMs: number
}): void {
  if (!transitionChannel.hasSubscribers) {
    return
  }

  const base = {
    version: 1 as const,
    instanceId: params.instanceId,
    service: params.service,
    generation: params.current.generation,
    revision: params.revision,
    previousKind: params.previous.kind,
    kind: params.current.kind,
    timestampMs: params.timestampMs,
    durationMs: params.durationMs,
  }

  const payload: LifecycleDiagnosticEvent = params.current.kind === 'failed'
    ? Object.freeze({
      ...base,
      phase: params.current.phase,
      cleanupComplete: params.current.cleanupComplete,
    })
    : Object.freeze(base)

  try {
    transitionChannel.publish(payload)
  } catch {
    // Isolate synchronous subscriber faults in runtimes where Channel.publish rethrows.
  }
}
