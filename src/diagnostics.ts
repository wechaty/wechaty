import { randomUUID } from 'node:crypto'
import { channel }    from 'node:diagnostics_channel'

type DiagnosticOperation =
  | 'start'
  | 'stop'
  | 'provider.resolve'
  | 'provider.start'
  | 'provider.ready'

type DiagnosticPhase = 'start' | 'end' | 'event'
type DiagnosticOutcome = 'resolved' | 'rejected' | 'timed-out' | 'ready'
type DiagnosticProvider = 'configured' | 'default'

type DiagnosticRecord = Readonly<{
  version: 1
  operation: DiagnosticOperation
  operationId: string
  phase: DiagnosticPhase
  outcome?: DiagnosticOutcome
  durationMs?: number
  provider?: DiagnosticProvider
}>

const diagnosticsChannel = channel('wechaty.lifecycle')

function publish (record: DiagnosticRecord): void {
  if (diagnosticsChannel.hasSubscribers) {
    diagnosticsChannel.publish(Object.freeze(record))
  }
}

async function diagnose<T> (
  operation: Exclude<DiagnosticOperation, 'provider.ready'>,
  action: () => Promise<T>,
  provider?: DiagnosticProvider,
  outcomeFromError: (error: unknown) => DiagnosticOutcome = () => 'rejected',
): Promise<T> {
  if (!diagnosticsChannel.hasSubscribers) {
    return action()
  }

  const operationId = randomUUID()
  const startTime = performance.now()
  const baseRecord = { version: 1 as const, operation, operationId, provider }
  publish({ ...baseRecord, phase: 'start' })

  let result: T
  try {
    result = await action()
  } catch (error) {
    publish({
      ...baseRecord,
      phase: 'end',
      outcome: outcomeFromError(error),
      durationMs: performance.now() - startTime,
    })
    throw error
  }

  publish({
    ...baseRecord,
    phase: 'end',
    outcome: 'resolved',
    durationMs: performance.now() - startTime,
  })
  return result
}

function diagnoseEvent (
  operation: 'provider.ready',
  provider: DiagnosticProvider,
): void {
  if (!diagnosticsChannel.hasSubscribers) {
    return
  }
  publish({
    version: 1,
    operation,
    operationId: randomUUID(),
    phase: 'event',
    outcome: 'ready',
    provider,
  })
}

export type {
  DiagnosticRecord,
}
export {
  diagnose,
  diagnoseEvent,
}
