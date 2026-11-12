/**
 * Privacy-safe internal observability for asynchronous lifecycle transitions.
 *
 * Publishes structural transition metadata on `node:diagnostics_channel`
 * (`wechaty.lifecycle`) only when subscribers are attached. Never exposes raw
 * error messages, credentials, provider options, user identifiers, or payloads,
 * and isolates subscriber exceptions so observability can never alter lifecycle
 * cleanup or operation outcomes (RFC §7 Invariant 13).
 */
import { channel } from 'node:diagnostics_channel'

export type LifecycleStateKind =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'failed'

export interface LifecycleDiagnosticRecord {
  readonly version: 1
  readonly service: string
  readonly generation: number
  readonly revision: number
  readonly previousKind: LifecycleStateKind
  readonly kind: LifecycleStateKind
  readonly phase?: 'start' | 'run' | 'stop'
  readonly cleanupComplete?: boolean
  readonly durationMs?: number
}

export const LIFECYCLE_DIAGNOSTICS_CHANNEL = 'wechaty.lifecycle'

const lifecycleDiagnosticsChannel = channel(LIFECYCLE_DIAGNOSTICS_CHANNEL)

/**
 * Publishes an immutable lifecycle transition record if any subscriber is
 * listening on `wechaty.lifecycle`.
 *
 * Preconditions: called strictly *after* controller state is committed and
 * internal operation waiters are settled. Subscribers run synchronously on the
 * host's `node:diagnostics_channel` and should be non-throwing, non-blocking
 * observers (Node.js forwards throwing `diagnostics_channel` subscribers to
 * `uncaughtException` on `nextTick`).
 */
export function publishLifecycleDiagnostic (
  record: Omit<LifecycleDiagnosticRecord, 'version'>,
): void {
  if (!lifecycleDiagnosticsChannel.hasSubscribers) {
    return
  }

  const frozenRecord: LifecycleDiagnosticRecord = Object.freeze({
    version: 1,
    ...record,
  })

  lifecycleDiagnosticsChannel.publish(frozenRecord)
}
