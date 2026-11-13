/**
 * Revision-gated asynchronous lifecycle controller replacing `state-switch`.
 *
 * Separates three distinct identities:
 *   1. `revision` — authoritative user intent counter incremented only by
 *      explicit caller commands (`start`, `stop`, `restart`)
 *   2. `generation` — monotonic run identifier owning one `ResourceScope`
 *   3. `AttemptOutcome` — shared success/failure settlement for callers that
 *      joined a specific transition attempt, with independent per-caller
 *      `AbortSignal` wait cancellation
 *
 * Enforces mandatory retirement barriers (`stop` or `restart` must finish
 * releasing generation `G` before `G+1` can begin), prevents implicit retry
 * loops after failures, blocks unsafe overlapping starts when `cleanupComplete`
 * is `false`, allows retryable cleanup via explicit `stop()`, and provides
 * token-validated `recover()` for watchdogs/supervisors so automatic recovery
 * can never override a later user `stop()` or `stop() -> start()`.
 */
import { publishLifecycleDiagnostic } from './diagnostics.ts'
import {
  LifecycleAggregateCleanupError,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
  toAbortError,
} from './errors.ts'
import { ResourceScope } from './resource-scope.ts'

export type LifecycleFailurePhase = 'start' | 'run' | 'stop'

export type LifecycleState =
  | { readonly kind: 'stopped'; readonly generation: number }
  | { readonly kind: 'starting'; readonly generation: number }
  | { readonly kind: 'running'; readonly generation: number }
  | { readonly kind: 'stopping'; readonly generation: number }
  | {
      readonly kind: 'failed'
      readonly generation: number
      readonly phase: LifecycleFailurePhase
      readonly error: unknown
      readonly cleanupError?: unknown
      readonly cleanupComplete: boolean
    }

export interface LifecycleCallOptions {
  readonly signal?: AbortSignal
}

export interface RecoveryToken {
  readonly revision: number
  readonly generation: number
}

export type RecoveryOutcome = 'recovered' | 'superseded'

export interface LifecycleHookContext {
  readonly generation: number
  readonly signal: AbortSignal
  readonly scope: ResourceScope
  /**
   * Reports an unrequested child exit or fatal runtime failure for this
   * generation while it is `running`. Ignored if this generation is no longer
   * the active `running` generation (generation-fenced).
   */
  fail (error: unknown): void
}

export interface LifecycleStopContext {
  readonly generation: number
  readonly reason: 'stop' | 'rollback'
}

export interface LifecycleHooks {
  /**
   * Acquires resources and brings `context.generation` to `running`.
   */
  start (context: LifecycleHookContext): Promise<void> | void
  /**
   * Optional service-level teardown hook executed during retirement alongside
   * `context.scope` disposal. Should be idempotent if retried after a transient
   * stop failure.
   */
  stop? (context: LifecycleStopContext): Promise<void> | void
  /**
   * Optional observer invoked strictly *after* a state snapshot is committed
   * and internal operation waiters are settled. Observer exceptions are caught
   * and ignored so notifications never alter transition outcomes or cleanup.
   */
  onStateChange? (state: LifecycleState, previous: LifecycleState): void
}

export interface LifecycleControllerOptions {
  readonly name?: string
  readonly hooks: LifecycleHooks
  readonly startTimeoutMs?: number
  readonly stopTimeoutMs?: number
}

/**
 * Fan-out settlement primitive for one logical lifecycle attempt.
 *
 * Avoids creating unconsumed rejected Promises when zero callers are waiting,
 * and allows each attached caller to cancel its own wait via `AbortSignal`
 * without canceling work relied on by other callers.
 */
class AttemptOutcome<T> {

  #settled = false
  #succeeded = false
  #value!: T
  #error: unknown
  readonly #waiters = new Set<{
    resolve: (value: T) => void
    reject: (error: unknown) => void
    cleanup: () => void
  }>()

  get isSettled (): boolean {
    return this.#settled
  }

  /**
   * Resolves all currently attached and future waiters with `value`. Idempotent
   * once settled.
   */
  resolve (value: T): void {
    if (this.#settled) {
      return
    }
    this.#settled = true
    this.#succeeded = true
    this.#value = value
    const waiters = [ ...this.#waiters ]
    this.#waiters.clear()
    for (const waiter of waiters) {
      waiter.cleanup()
      waiter.resolve(value)
    }
  }

  /**
   * Rejects all currently attached and future waiters with `error` without
   * creating an unhandled rejection when zero waiters are attached.
   */
  reject (error: unknown): void {
    if (this.#settled) {
      return
    }
    this.#settled = true
    this.#succeeded = false
    this.#error = error
    const waiters = [ ...this.#waiters ]
    this.#waiters.clear()
    for (const waiter of waiters) {
      waiter.cleanup()
      waiter.reject(error)
    }
  }

  /**
   * Attaches a caller wait to this attempt outcome. Aborting `signal` detaches
   * and rejects only this caller's Promise without affecting other waiters.
   */
  wait (signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(toAbortError(signal.reason))
    }
    if (this.#settled) {
      return this.#succeeded
        ? Promise.resolve(this.#value)
        : Promise.reject(this.#error)
    }
    return new Promise<T>((resolve, reject) => {
      let onAbort: (() => void) | undefined
      const entry = {
        cleanup: () => {
          if (onAbort && signal) {
            signal.removeEventListener('abort', onAbort)
          }
        },
        reject,
        resolve,
      }
      if (signal) {
        onAbort = () => {
          this.#waiters.delete(entry)
          reject(toAbortError(signal.reason))
        }
        signal.addEventListener('abort', onAbort, { once: true })
      }
      this.#waiters.add(entry)
    })
  }

}

interface StateWaiter {
  readonly predicate: (state: LifecycleState) => boolean
  readonly resolve: (state: LifecycleState) => void
  readonly reject: (error: unknown) => void
  readonly cleanup: () => void
}

interface ActiveRun {
  readonly generation: number
  readonly scope: ResourceScope
  readonly startAttempt: AttemptOutcome<void>
  retireAttempt: AttemptOutcome<void>
  readonly startedAtMs: number
  startInvoked: boolean
  startInvocation?: Promise<void>
  startSettled: boolean
  stopInvocation?: Promise<void>
  stopDisposed: boolean
  interruptStartWait?: () => void
  triggerError?: unknown
  failurePhase?: 'start' | 'run'
}

interface PendingRecovery {
  readonly revision: number
  readonly outcome: AttemptOutcome<RecoveryOutcome>
}

/**
 * Collapses zero, one, or multiple cleanup errors into `undefined`, the single
 * error value, or a `LifecycleAggregateCleanupError`.
 */
function summarizeCleanupErrors (errors: readonly unknown[]): unknown {
  if (errors.length === 0) {
    return undefined
  }
  if (errors.length === 1) {
    return errors[0]
  }
  return new LifecycleAggregateCleanupError(errors)
}

/**
 * Awaits `promise` with an optional phase deadline. Suppresses unhandled
 * rejections on `promise` if `timeoutMs` expires before `promise` rejects.
 */
async function awaitWithOptionalTimeout (
  promise: Promise<void>,
  phase: 'start' | 'stop',
  timeoutMs: number | undefined,
): Promise<void> {
  if (timeoutMs === undefined) {
    await promise
    return
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new LifecycleTimeoutError(phase, timeoutMs))
    }, timeoutMs)
  })
  // Prevent unhandled rejection if `promise` rejects after `timeoutPromise` wins.
  promise.catch(() => {})

  try {
    await Promise.race([ promise, timeoutPromise ])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}

/**
 * Owns asynchronous startup, shutdown, restart, state observation, and
 * supervisor recovery for a single service instance.
 */
export class LifecycleController {

  readonly #name: string
  readonly #hooks: LifecycleHooks
  readonly #startTimeoutMs: number | undefined
  readonly #stopTimeoutMs: number | undefined

  #state: LifecycleState = Object.freeze({ generation: 0, kind: 'stopped' })
  #revision = 0
  #attemptedRevision = 0
  #generation = 0
  #desired: 'running' | 'stopped' = 'stopped'
  #retireBeforeGen: number | null = null

  #activeRun: ActiveRun | null = null
  #queuedStartAttempt: AttemptOutcome<void> | null = null
  #pendingRecovery: PendingRecovery | null = null
  readonly #stateWaiters = new Set<StateWaiter>()
  #loopRunning = false

  constructor (options: LifecycleControllerOptions) {
    this.#name = options.name ?? 'Service'
    this.#hooks = options.hooks
    this.#startTimeoutMs = options.startTimeoutMs
    this.#stopTimeoutMs = options.stopTimeoutMs
  }

  /**
   * Immutable snapshot of the current lifecycle state.
   */
  get state (): LifecycleState {
    return this.#state
  }

  /**
   * Current authoritative caller intent revision.
   */
  get revision (): number {
    return this.#revision
  }

  /**
   * `true` when a replacement generation is scheduled to start as soon as any
   * retiring generation finishes clean teardown.
   */
  get hasQueuedStart (): boolean {
    if (this.#desired !== 'running') {
      return false
    }
    if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
      return false
    }
    return (
      this.#attemptedRevision < this.#revision
      || (this.#pendingRecovery !== null && this.#pendingRecovery.revision === this.#revision)
    )
  }

  /**
   * Captures a `(revision, generation)` token that a supervisor or watchdog can
   * later pass to `recover()` to request a bounded restart without overriding
   * any subsequent user `stop()` or `start()`.
   */
  captureRecoveryToken (): RecoveryToken {
    return Object.freeze({
      generation: this.#state.generation,
      revision: this.#revision,
    })
  }

  /**
   * Requests transition to `running`.
   *
   * - Single-flight: joins an active or queued startup attempt.
   * - Caller cancellation: aborting `options.signal` cancels only this caller's
   *   wait without aborting shared startup work or revoking accepted intent.
   * - Safety gate: rejects immediately with `LifecycleUnsafeStateError` if the
   *   prior generation failed with `cleanupComplete: false`.
   */
  start (options?: LifecycleCallOptions): Promise<void> {
    if (options?.signal?.aborted) {
      return Promise.reject(toAbortError(options.signal.reason))
    }

    const current = this.#state
    switch (current.kind) {
      case 'running': {
        this.#revision++
        this.#attemptedRevision = this.#revision
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        return Promise.resolve()
      }

      case 'starting': {
        this.#revision++
        this.#attemptedRevision = this.#revision
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        return this.#activeRun!.startAttempt.wait(options?.signal)
      }

      case 'stopping': {
        this.#revision++
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        if (!this.#queuedStartAttempt) {
          this.#queuedStartAttempt = new AttemptOutcome<void>()
        }
        this.#ensureLoop()
        return this.#queuedStartAttempt.wait(options?.signal)
      }

      case 'failed': {
        if (!current.cleanupComplete) {
          return Promise.reject(
            new LifecycleUnsafeStateError(current.generation, undefined, {
              cause: current.cleanupError ?? current.error,
            }),
          )
        }
        // Clean failure: fall through to synchronous generation start.
        this.#revision++
        this.#attemptedRevision = this.#revision
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        const attempt = new AttemptOutcome<void>()
        this.#beginGenerationSync(attempt)
        this.#ensureLoop()
        return attempt.wait(options?.signal)
      }

      case 'stopped': {
        this.#revision++
        this.#attemptedRevision = this.#revision
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        const attempt = new AttemptOutcome<void>()
        this.#beginGenerationSync(attempt)
        this.#ensureLoop()
        return attempt.wait(options?.signal)
      }
    }
  }

  /**
   * Requests immediate transition to `stopped` and resolves only once owned
   * resources of the active run are verified released.
   *
   * If the controller is in `failed` with `cleanupComplete: false`, `stop()`
   * re-attempts remaining resource/hook teardown so transient stop errors can
   * recover without creating a new instance.
   */
  stop (options?: LifecycleCallOptions): Promise<void> {
    if (options?.signal?.aborted) {
      return Promise.reject(toAbortError(options.signal.reason))
    }

    const current = this.#state
    switch (current.kind) {
      case 'stopped': {
        // Bump revision even when already stopped so stale supervisor tokens become invalid.
        this.#revision++
        this.#desired = 'stopped'
        this.#supersedePendingRecovery()
        return Promise.resolve()
      }

      case 'starting': {
        this.#revision++
        this.#desired = 'stopped'
        this.#supersedePendingRecovery()
        const run = this.#activeRun!
        const superseded = new LifecycleSupersededError('start')
        this.#retireBeforeGen = run.generation
        run.scope.interrupt(superseded)
        if (this.#queuedStartAttempt) {
          this.#queuedStartAttempt.reject(new LifecycleSupersededError('start'))
          this.#queuedStartAttempt = null
        }
        this.#commitState(
          { generation: run.generation, kind: 'stopping' },
          () => run.startAttempt.reject(superseded),
        )
        run.interruptStartWait?.()
        this.#ensureLoop()
        return run.retireAttempt.wait(options?.signal)
      }

      case 'running': {
        this.#revision++
        this.#desired = 'stopped'
        this.#supersedePendingRecovery()
        const run = this.#activeRun!
        this.#retireBeforeGen = run.generation
        this.#commitState({ generation: run.generation, kind: 'stopping' })
        this.#ensureLoop()
        return run.retireAttempt.wait(options?.signal)
      }

      case 'stopping': {
        this.#revision++
        this.#desired = 'stopped'
        this.#supersedePendingRecovery()
        if (this.#queuedStartAttempt) {
          this.#queuedStartAttempt.reject(new LifecycleSupersededError('restart'))
          this.#queuedStartAttempt = null
        }
        return this.#activeRun!.retireAttempt.wait(options?.signal)
      }

      case 'failed': {
        this.#revision++
        this.#desired = 'stopped'
        this.#supersedePendingRecovery()
        if (current.cleanupComplete || !this.#activeRun) {
          this.#commitState({ generation: current.generation, kind: 'stopped' })
          return Promise.resolve()
        }
        // Retry remaining cleanup for dirty generation.
        const run = this.#activeRun
        run.retireAttempt = new AttemptOutcome<void>()
        run.triggerError = current.error
        run.failurePhase = undefined
        this.#retireBeforeGen = run.generation
        this.#commitState({ generation: run.generation, kind: 'stopping' })
        this.#ensureLoop()
        return run.retireAttempt.wait(options?.signal)
      }
    }
  }

  /**
   * Explicitly retires any active run and starts a fresh replacement generation.
   *
   * - When `stopped` or cleanly `failed`, behaves identically to `start()`.
   * - Overlapping `restart()` calls coalesce onto one replacement generation.
   * - A later `stop()` permanently supersedes the pending replacement.
   * - When `failed` with `cleanupComplete: false`, retries cleanup of `G` first
   *   and proceeds to `G+1` only if `G`'s cleanup succeeds.
   */
  restart (options?: LifecycleCallOptions): Promise<void> {
    if (options?.signal?.aborted) {
      return Promise.reject(toAbortError(options.signal.reason))
    }

    const current = this.#state
    switch (current.kind) {
      case 'stopped': {
        return this.start(options)
      }

      case 'failed': {
        if (current.cleanupComplete || !this.#activeRun) {
          return this.start(options)
        }
        this.#revision++
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        const run = this.#activeRun
        run.retireAttempt = new AttemptOutcome<void>()
        run.triggerError = current.error
        run.failurePhase = undefined
        this.#retireBeforeGen = run.generation
        if (!this.#queuedStartAttempt) {
          this.#queuedStartAttempt = new AttemptOutcome<void>()
        }
        this.#commitState({ generation: run.generation, kind: 'stopping' })
        this.#ensureLoop()
        return this.#queuedStartAttempt.wait(options?.signal)
      }

      case 'starting': {
        this.#revision++
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        const run = this.#activeRun!
        const superseded = new LifecycleSupersededError('start')
        this.#retireBeforeGen = run.generation
        run.scope.interrupt(superseded)
        if (!this.#queuedStartAttempt) {
          this.#queuedStartAttempt = new AttemptOutcome<void>()
        }
        this.#commitState(
          { generation: run.generation, kind: 'stopping' },
          () => run.startAttempt.reject(superseded),
        )
        run.interruptStartWait?.()
        this.#ensureLoop()
        return this.#queuedStartAttempt.wait(options?.signal)
      }

      case 'running': {
        this.#revision++
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        const run = this.#activeRun!
        this.#retireBeforeGen = run.generation
        if (!this.#queuedStartAttempt) {
          this.#queuedStartAttempt = new AttemptOutcome<void>()
        }
        this.#commitState({ generation: run.generation, kind: 'stopping' })
        this.#ensureLoop()
        return this.#queuedStartAttempt.wait(options?.signal)
      }

      case 'stopping': {
        this.#revision++
        this.#desired = 'running'
        this.#supersedePendingRecovery()
        if (!this.#queuedStartAttempt) {
          this.#queuedStartAttempt = new AttemptOutcome<void>()
        }
        this.#ensureLoop()
        return this.#queuedStartAttempt.wait(options?.signal)
      }
    }
  }

  /**
   * Supervisor-authorized recovery gated on `(token.revision, token.generation)`.
   *
   * Never increments `revision` (user authority) and revalidates `token.revision`
   * both on entry and after retiring `token.generation`. Returns `'superseded'`
   * cleanly without mutating state if the service is `stopped` or user intent
   * changed at any point.
   */
  recover (
    token: RecoveryToken,
    options?: LifecycleCallOptions,
  ): Promise<RecoveryOutcome> {
    if (options?.signal?.aborted) {
      return Promise.reject(toAbortError(options.signal.reason))
    }

    const current = this.#state
    if (
      token.revision !== this.#revision
      || token.generation !== current.generation
      || current.kind === 'stopped'
      || this.#desired === 'stopped'
    ) {
      return Promise.resolve('superseded')
    }

    if (this.#pendingRecovery && this.#pendingRecovery.revision === token.revision) {
      return this.#pendingRecovery.outcome.wait(options?.signal)
    }

    const recoveryOutcome = new AttemptOutcome<RecoveryOutcome>()
    this.#pendingRecovery = {
      outcome: recoveryOutcome,
      revision: token.revision,
    }

    switch (current.kind) {
      case 'starting': {
        const run = this.#activeRun!
        const superseded = new LifecycleSupersededError('start', 'Superseded by supervisor recovery')
        this.#retireBeforeGen = run.generation
        run.scope.interrupt(superseded)
        this.#commitState(
          { generation: run.generation, kind: 'stopping' },
          () => run.startAttempt.reject(superseded),
        )
        run.interruptStartWait?.()
        this.#ensureLoop()
        break
      }

      case 'running': {
        const run = this.#activeRun!
        this.#retireBeforeGen = run.generation
        this.#commitState({ generation: run.generation, kind: 'stopping' })
        this.#ensureLoop()
        break
      }

      case 'stopping': {
        this.#ensureLoop()
        break
      }

      case 'failed': {
        if (!current.cleanupComplete && this.#activeRun) {
          const run = this.#activeRun
          run.retireAttempt = new AttemptOutcome<void>()
          run.triggerError = current.error
          run.failurePhase = undefined
          this.#retireBeforeGen = run.generation
          this.#commitState({ generation: run.generation, kind: 'stopping' })
        }
        this.#ensureLoop()
        break
      }
    }

    return recoveryOutcome.wait(options?.signal)
  }

  /**
   * Read-only condition observation across lifecycle generations.
   *
   * Evaluates `predicate` against the current snapshot immediately and on every
   * subsequent committed state transition. Rejects only if `options.signal`
   * aborts or `predicate` throws.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    if (options?.signal?.aborted) {
      return Promise.reject(toAbortError(options.signal.reason))
    }

    try {
      if (predicate(this.#state)) {
        return Promise.resolve(this.#state)
      }
    } catch (error) {
      return Promise.reject(error)
    }

    const signal = options?.signal
    return new Promise<LifecycleState>((resolve, reject) => {
      let onAbort: (() => void) | undefined
      const waiter: StateWaiter = {
        cleanup: () => {
          if (onAbort && signal) {
            signal.removeEventListener('abort', onAbort)
          }
        },
        predicate,
        reject,
        resolve,
      }
      if (signal) {
        onAbort = () => {
          this.#stateWaiters.delete(waiter)
          reject(toAbortError(signal.reason))
        }
        signal.addEventListener('abort', onAbort, { once: true })
      }
      this.#stateWaiters.add(waiter)
    })
  }

  /**
   * Resolves any pending supervisor `recover()` call with `'superseded'` when a
   * newer explicit user command (`start`, `stop`, or `restart`) takes authority.
   */
  #supersedePendingRecovery (): void {
    if (this.#pendingRecovery) {
      const pending = this.#pendingRecovery
      this.#pendingRecovery = null
      pending.outcome.resolve('superseded')
    }
  }

  /**
   * Handles a generation-fenced `context.fail(error)` signal emitted while
   * `generation` is `running`, interrupting its scope and entering `stopping`
   * rollback without mutating newer generations.
   */
  #failActiveRun (generation: number, error: unknown): void {
    if (
      this.#state.kind !== 'running'
      || this.#state.generation !== generation
      || !this.#activeRun
    ) {
      return
    }
    const run = this.#activeRun
    run.triggerError = error
    run.failurePhase = 'run'
    run.scope.interrupt(error)
    this.#retireBeforeGen = generation
    this.#commitState({ generation, kind: 'stopping' })
    this.#ensureLoop()
  }

  /**
   * Allocates generation `G + 1` with a fresh `ResourceScope` and commits
   * `starting(G + 1)` synchronously before the first `await` so concurrent
   * callers and `ReadinessGate` observe the active generation immediately.
   *
   * `startSettled` begins as `true` until `#stepStarting` actually invokes
   * `hooks.start` so a reentrant `stop()` inside `onStateChange('starting')`
   * can retire the unstarted generation cleanly without hanging or failing.
   */
  #beginGenerationSync (startAttempt: AttemptOutcome<void>): void {
    const generation = ++this.#generation
    const scope = new ResourceScope()
    const retireAttempt = new AttemptOutcome<void>()
    this.#activeRun = {
      generation,
      retireAttempt,
      scope,
      startAttempt,
      startInvoked: false,
      startSettled: true,
      startedAtMs: performance.now(),
      stopDisposed: !this.#hooks.stop,
    }
    this.#retireBeforeGen = null
    this.#commitState({ generation, kind: 'starting' })
  }

  /**
   * Atomically publishes `next` as a frozen state snapshot, settles internal
   * attempt and `whenState` waiters *before* external observers run, emits
   * privacy-safe diagnostics, and isolates `onStateChange` exceptions.
   *
   * Invariant: reentrant calls inside `onStateChange` (such as calling `stop()`
   * upon observing `starting` or `running`) observe the committed snapshot and
   * cannot retroactively alter already-settled attempt outcomes.
   */
  #commitState (
    next: LifecycleState,
    settleAttempts?: () => void,
    durationMs?: number,
  ): void {
    const previous = this.#state
    const frozenNext: LifecycleState = Object.freeze({ ...next })
    this.#state = frozenNext

    // Commit state and settle attempt waiters BEFORE external observers so reentrant
    // callbacks cannot rewrite an already-completed operation outcome.
    settleAttempts?.()

    if (this.#stateWaiters.size > 0) {
      for (const waiter of [ ...this.#stateWaiters ]) {
        try {
          if (waiter.predicate(frozenNext)) {
            this.#stateWaiters.delete(waiter)
            waiter.cleanup()
            waiter.resolve(frozenNext)
          }
        } catch (error) {
          this.#stateWaiters.delete(waiter)
          waiter.cleanup()
          waiter.reject(error)
        }
      }
    }

    publishLifecycleDiagnostic({
      cleanupComplete: frozenNext.kind === 'failed' ? frozenNext.cleanupComplete : undefined,
      durationMs,
      generation: frozenNext.generation,
      kind: frozenNext.kind,
      phase: frozenNext.kind === 'failed' ? frozenNext.phase : undefined,
      previousKind: previous.kind,
      revision: this.#revision,
      service: this.#name,
    })

    try {
      this.#hooks.onStateChange?.(frozenNext, previous)
    } catch {
      // Invariant 13: observer failures must never corrupt lifecycle state or skip cleanup.
    }
  }

  /**
   * Starts the single asynchronous reconciliation loop if it is not already
   * running. Never queues unbounded Promise chains.
   */
  #ensureLoop (): void {
    if (this.#loopRunning) {
      return
    }
    this.#loopRunning = true
    void this.#runLoop()
  }

  /**
   * Drives `starting` and `stopping` steps and launches queued replacement
   * generations until the controller parks in `running`, `stopped`, or `failed`.
   */
  async #runLoop (): Promise<void> {
    try {
      for (;;) {
        if (this.#state.kind === 'starting') {
          await this.#stepStarting(this.#activeRun!)
          continue
        }

        if (this.#state.kind === 'stopping') {
          await this.#stepStopping(this.#activeRun!)
          continue
        }

        if (this.#state.kind === 'running') {
          if (this.#retireBeforeGen === this.#state.generation && this.#activeRun) {
            this.#commitState({
              generation: this.#state.generation,
              kind: 'stopping',
            })
            continue
          }
          break
        }

        // Current state is `stopped` or `failed`: check whether a new generation should start.
        if (!this.#stepMaybeLaunchNextGeneration()) {
          break
        }
      }
    } finally {
      this.#loopRunning = false
    }
  }

  /**
   * Executes `hooks.start` for `run`, racing it against external supersession
   * (`interruptStartWait`) and optional `startTimeoutMs`.
   *
   * On hook error or startup deadline expiry, marks `run.failurePhase = 'start'`,
   * interrupts `run.scope`, sets `#retireBeforeGen = run.generation`, and
   * transitions to `stopping` so `#stepStopping` performs LIFO rollback before
   * publishing `failed`.
   */
  async #stepStarting (run: ActiveRun): Promise<void> {
    if (this.#state.kind !== 'starting' || this.#retireBeforeGen === run.generation) {
      return
    }

    let hasStartError = false
    let startError: unknown

    if (!run.startInvocation) {
      run.startInvoked = true
      run.startSettled = false
      run.startInvocation = Promise.resolve()
        .then(() =>
          this.#hooks.start({
            fail: (error: unknown) => this.#failActiveRun(run.generation, error),
            generation: run.generation,
            scope: run.scope,
            signal: run.scope.signal,
          }),
        )
        .catch((error: unknown) => {
          hasStartError = true
          startError = error
        })
        .finally(() => {
          run.startSettled = true
        })
    }

    let interruptPromiseResolve: (() => void) | undefined
    const interruptPromise = new Promise<void>(resolve => {
      interruptPromiseResolve = resolve
    })
    run.interruptStartWait = interruptPromiseResolve

    let timer: ReturnType<typeof setTimeout> | undefined
    let timedOut = false
    const races: Promise<void>[] = [
      run.startInvocation,
      interruptPromise,
    ]
    if (this.#startTimeoutMs !== undefined) {
      races.push(
        new Promise<void>(resolve => {
          timer = setTimeout(() => {
            timedOut = true
            resolve()
          }, this.#startTimeoutMs)
        }),
      )
    }

    try {
      await Promise.race(races)
    } finally {
      run.interruptStartWait = undefined
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }

    // Superseded externally during `starting` (`stop()`, `restart()`, or `recover()`).
    if (this.#state.kind !== 'starting' || this.#retireBeforeGen === run.generation) {
      return
    }

    if (timedOut && !run.startSettled) {
      const timeoutError = new LifecycleTimeoutError('start', this.#startTimeoutMs!)
      run.triggerError = timeoutError
      run.failurePhase = 'start'
      run.scope.interrupt(timeoutError)
      this.#retireBeforeGen = run.generation
      this.#commitState({ generation: run.generation, kind: 'stopping' })
      return
    }

    if (hasStartError) {
      run.triggerError = startError
      run.failurePhase = 'start'
      run.scope.interrupt(startError)
      this.#retireBeforeGen = run.generation
      this.#commitState({ generation: run.generation, kind: 'stopping' })
      return
    }

    const durationMs = performance.now() - run.startedAtMs
    this.#commitState(
      { generation: run.generation, kind: 'running' },
      () => run.startAttempt.resolve(),
      durationMs,
    )
  }

  /**
   * Retires `run` across both normal shutdown (`stop`/`restart`/`recover`) and
   * failure rollback (`failurePhase === 'start' | 'run'`).
   *
   * Execution invariants:
   *   1. `run.scope.interrupt()` executes *before* awaiting `run.startInvocation`
   *      so startup hooks blocked on resource I/O wake up immediately, while
   *      async `dispose()` stays gated behind startup settlement.
   *   2. If `hooks.start` was never invoked (`!run.startInvoked`), `hooks.stop`
   *      is skipped and the empty scope closes cleanly.
   *   3. If `hooks.stop` times out, `run.stopInvocation` remains tracked so
   *      subsequent `stop()` calls join the in-flight invocation rather than
   *      launching overlapping stop hooks or reporting false cleanup completion.
   *   4. `run.retireAttempt` resolves whenever `cleanupComplete` is `true`
   *      (even if a newer `start()` flipped `#desired` back to `'running'`) and
   *      rejects whenever `!cleanupComplete`.
   */
  async #stepStopping (run: ActiveRun): Promise<void> {
    const retiringStartedAtMs = performance.now()
    const abortReason = run.triggerError ?? new LifecycleSupersededError('run')
    run.scope.interrupt(abortReason)

    // Wait for in-flight `hooks.start` after interrupting scoped resources unless
    // a startup deadline already expired on an uncooperative hook.
    if (run.startInvocation && !run.startSettled) {
      if (run.triggerError instanceof LifecycleTimeoutError) {
        await Promise.resolve()
      } else {
        try {
          await awaitWithOptionalTimeout(
            run.startInvocation,
            'stop',
            this.#stopTimeoutMs,
          )
        } catch {
          // Unsettled start invocation will be reflected via `!run.startSettled`.
        }
      }
    }

    const cleanupErrors: unknown[] = []

    if (!run.startInvoked) {
      run.stopDisposed = true
    } else if (this.#hooks.stop && !run.stopDisposed) {
      if (!run.stopInvocation) {
        let rawStop!: Promise<void>
        rawStop = Promise.resolve()
          .then(() =>
            this.#hooks.stop!({
              generation: run.generation,
              reason: run.failurePhase ? 'rollback' : 'stop',
            }),
          )
          .then(
            () => {
              if (run.stopInvocation === rawStop) {
                run.stopInvocation = undefined
                run.stopDisposed = true
              }
            },
            (err: unknown) => {
              if (run.stopInvocation === rawStop) {
                run.stopInvocation = undefined
              }
              throw err
            },
          )
        rawStop.catch(() => {})
        run.stopInvocation = rawStop
      }

      try {
        await awaitWithOptionalTimeout(
          run.stopInvocation,
          'stop',
          this.#stopTimeoutMs,
        )
      } catch (error) {
        cleanupErrors.push(error)
      }
    } else {
      run.stopDisposed = true
    }

    const scopeCloseResult = await run.scope.close({
      reason: abortReason,
      timeoutMs: run.startSettled ? this.#stopTimeoutMs : 0,
    })
    if (scopeCloseResult.errors.length > 0) {
      cleanupErrors.push(...scopeCloseResult.errors)
    }

    const cleanupError = summarizeCleanupErrors(cleanupErrors)
    const cleanupComplete =
      cleanupErrors.length === 0
      && scopeCloseResult.cleanupComplete
      && run.stopDisposed
      && run.stopInvocation === undefined
      && run.startSettled
    const durationMs = performance.now() - retiringStartedAtMs

    this.#retireBeforeGen = null

    if (cleanupComplete) {
      this.#activeRun = null
    } else {
      // Preserve `run` so explicit `stop()` or `restart()` can retry unfinished cleanup.
      this.#activeRun = run
    }

    // Subcase 1: Retirement was rolling back a failed `start` or `run`.
    if (run.failurePhase !== undefined) {
      const phase = run.failurePhase
      const primaryError = run.triggerError

      if (phase === 'run' && cleanupComplete && this.#desired === 'stopped') {
        this.#commitState(
          { generation: run.generation, kind: 'stopped' },
          () => run.retireAttempt.resolve(),
          durationMs,
        )
        return
      }

      const failedSnapshot: LifecycleState = {
        cleanupComplete,
        ...(cleanupError !== undefined ? { cleanupError } : {}),
        error: primaryError,
        generation: run.generation,
        kind: 'failed',
        phase,
      }

      if (!cleanupComplete) {
        this.#rejectQueuedStartDueToUnsafeState(
          run.generation,
          cleanupError ?? primaryError,
        )
      }

      this.#commitState(
        failedSnapshot,
        () => {
          if (phase === 'start') {
            run.startAttempt.reject(primaryError)
          }
          if (cleanupComplete) {
            run.retireAttempt.resolve()
          } else {
            run.retireAttempt.reject(cleanupError ?? primaryError)
          }
        },
        durationMs,
      )

      // If a user explicitly called `stop()` while startup rollback was running and
      // rollback succeeded cleanly, converge immediately to `stopped`.
      if (phase === 'start' && cleanupComplete && this.#desired === 'stopped') {
        this.#commitState({ generation: run.generation, kind: 'stopped' })
      }
      return
    }

    // Subcase 2: Normal retirement (`stop`, `restart`, or `recover`) succeeded.
    if (cleanupComplete) {
      this.#commitState(
        { generation: run.generation, kind: 'stopped' },
        () => run.retireAttempt.resolve(),
        durationMs,
      )
      return
    }

    // Subcase 3: Normal retirement failed (`cleanupComplete === false`).
    const stopFailure = cleanupError ?? new LifecycleUnsafeStateError(run.generation)
    this.#rejectQueuedStartDueToUnsafeState(run.generation, stopFailure)
    this.#commitState(
      {
        cleanupComplete: false,
        ...(cleanupError !== undefined ? { cleanupError } : {}),
        error: stopFailure,
        generation: run.generation,
        kind: 'failed',
        phase: 'stop',
      },
      () => run.retireAttempt.reject(stopFailure),
      durationMs,
    )
  }

  /**
   * Rejects any queued replacement `start()`/`restart()` or supervisor
   * `recover()` with `LifecycleUnsafeStateError` when generation `generation`
   * finishes retirement with unproven cleanup (`cleanupComplete === false`).
   */
  #rejectQueuedStartDueToUnsafeState (generation: number, cause: unknown): void {
    const unsafeError = new LifecycleUnsafeStateError(generation, undefined, {
      cause,
    })
    if (this.#queuedStartAttempt) {
      this.#queuedStartAttempt.reject(unsafeError)
      this.#queuedStartAttempt = null
    }
    if (this.#pendingRecovery) {
      const pending = this.#pendingRecovery
      this.#pendingRecovery = null
      pending.outcome.reject(unsafeError)
    }
    this.#attemptedRevision = this.#revision
  }

  /**
   * Evaluates whether a queued user `start`/`restart` (`#attemptedRevision < #revision`)
   * or an authorized supervisor `recover()` (`pendingRecovery.revision === #revision`)
   * should launch generation `G + 1` after generation `G` has cleanly retired.
   *
   * Returns `true` if generation `G + 1` was started synchronously, or `false`
   * if the loop should park without implicitly retrying a failed revision.
   */
  #stepMaybeLaunchNextGeneration (): boolean {
    const pendingRecovery = this.#pendingRecovery
    const hasUserStartIntent =
      this.#desired === 'running'
      && this.#attemptedRevision < this.#revision
    const hasValidRecovery =
      this.#desired === 'running'
      && pendingRecovery !== null
      && pendingRecovery.revision === this.#revision

    if (!hasUserStartIntent && !hasValidRecovery) {
      if (pendingRecovery) {
        this.#pendingRecovery = null
        pendingRecovery.outcome.resolve('superseded')
      }
      return false
    }

    if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
      this.#rejectQueuedStartDueToUnsafeState(
        this.#state.generation,
        this.#state.cleanupError ?? this.#state.error,
      )
      return false
    }

    this.#attemptedRevision = this.#revision
    const startAttempt = this.#queuedStartAttempt ?? new AttemptOutcome<void>()
    this.#queuedStartAttempt = null

    if (pendingRecovery) {
      this.#pendingRecovery = null
      if (pendingRecovery.revision === this.#revision) {
        startAttempt.wait().then(
          () => pendingRecovery.outcome.resolve('recovered'),
          (error: unknown) => {
            if (error instanceof LifecycleSupersededError) {
              pendingRecovery.outcome.resolve('superseded')
            } else {
              pendingRecovery.outcome.reject(error)
            }
          },
        )
      } else {
        pendingRecovery.outcome.resolve('superseded')
      }
    }

    this.#beginGenerationSync(startAttempt)
    return true
  }

}
