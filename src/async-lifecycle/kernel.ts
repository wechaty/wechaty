/**
 * Single-flight `#private` lifecycle reconciliation kernel for `AsyncLifecycle`.
 *
 * Architectural boundary:
 * - Owns all mutable lifecycle authority: committed state snapshot, desired state, monotonic
 *   user-intent revision, generation counter, shared startup/retirement attempt waiters,
 *   active/dirty generation ledgers, cross-generation `whenState` watchers, and named
 *   `ConditionRegistry`.
 * - Enforces the five core invariants converged across RFC #2905 and #2911:
 *   1. Synchronous intent acceptance before the first `await` (pre-aborted caller signals
 *      reject prior to mutating state or revision).
 *   2. Single-flight reconciliation loop guarded before any hook or observer executes so
 *      reentrant `start()` / `stop()` / `restart()` calls join without spawning a second worker.
 *   3. Dependency-safe two-phase retirement (`seal -> graceful onStop -> abort + interrupt ->
 *      LIFO unwind -> truthful cleanupComplete tracking & stop() retry`).
 *   4. Generation-fenced `LifecycleScope` + double-checked `scope.recover()` authority.
 *   5. Strict post-commit ordering: freeze snapshot -> settle eligible attempt & condition
 *      waiters -> publish privacy-safe diagnostics -> invoke isolated `onStateChange` and
 *      `whenState` predicates.
 */

import {
  getAbortReason,
  isCooperativeAbortError,
  settleBeforeDeadline,
  waitWithCallerSignal,
} from './cancellable-wait.ts'
import {
  assertValidTimeoutMs,
  createDeadlineController,
  SYSTEM_CLOCK,
} from './clock.ts'
import { ConditionRegistry } from './conditions.ts'
import {
  allocateLifecycleInstanceId,
  publishLifecycleDiagnostic,
} from './diagnostics.ts'
import {
  collapseCleanupErrors,
  LifecycleChildFailureError,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
} from './errors.ts'
import { GenerationLedger } from './ledger.ts'
import {
  type AcquireOptions,
  isCleanIdleState,
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
  type LifecycleStopContext,
  type ListenTarget,
  type RecoveryOutcome,
  type SpawnOptions,
  type StopReason,
} from './types.ts'

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly settled: () => boolean
  resolve (value: T): void
  reject (error: unknown): void
}

function createDeferred<T> (): Deferred<T> {
  let isSettled = false
  let resolveFn!: (value: T) => void
  let rejectFn!: (error: unknown) => void
  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })
  // Prevent unhandled-rejection warnings when a shared attempt rejects before or without
  // an external consumer (e.g. background failure or caller signal cancellation).
  promise.catch(() => {})

  return {
    promise,
    settled: () => isSettled,
    resolve (value: T): void {
      if (isSettled) {
        return
      }
      isSettled = true
      resolveFn(value)
    },
    reject (error: unknown): void {
      if (isSettled) {
        return
      }
      isSettled = true
      rejectFn(error)
    },
  }
}

interface StateWatcher {
  readonly predicate: (state: LifecycleState) => boolean
  readonly resolve: (state: LifecycleState) => void
  readonly reject: (error: unknown) => void
}

interface PendingRecovery {
  readonly capturedRevision: number
  readonly reason: unknown
  readonly outcome: Deferred<RecoveryOutcome>
}

interface GenerationRun {
  readonly generation: number
  readonly capturedRevision: number
  readonly ledger: GenerationLedger
  readonly scope: LifecycleScope
  stopAttempt: Deferred<void>
  readonly startupInterrupted: Deferred<void>
  reachedRunning: boolean
  failureReported: boolean
  failurePhase: LifecycleFailurePhase
  failureError: unknown
  pendingRecovery: PendingRecovery | undefined
  /** Linked recovery deferred when this generation was booted by a prior generation's `recover()`. */
  linkedRecoveryOutcome: Deferred<RecoveryOutcome> | undefined
}

/**
 * Private reconciliation engine backing both `createLifecycle()` and `AsyncLifecycle`.
 */
export class LifecycleKernel implements LifecycleController {
  readonly #hooks: LifecycleHooks
  readonly #serviceName: string
  readonly #startTimeoutMs: number | undefined
  readonly #stopTimeoutMs: number | undefined
  readonly #clock: LifecycleClock
  readonly #instanceId: number
  readonly #conditions = new ConditionRegistry()
  readonly #watchers = new Set<StateWatcher>()

  #state: LifecycleState
  #lastTransitionMs: number
  #desired: 'stopped' | 'running' = 'stopped'
  #revision = 0
  #generationCounter = 0
  /**
   * When positive, forces retirement of any active generation `<= #mustRetireGeneration`
   * before `#desired === 'running'` is considered satisfied (used by `restart()`).
   */
  #mustRetireGeneration = 0

  #reconciling = false
  #activeRun: GenerationRun | undefined = undefined
  #dirtyRun: GenerationRun | undefined = undefined
  #retryDirtyStopRequested = false

  /** Attempt bound to the currently `starting` generation. */
  #currentStartAttempt: Deferred<void> | undefined = undefined
  /** Attempt bound to the next generation queued behind an active retirement or `restart()`. */
  #queuedStartAttempt: Deferred<void> | undefined = undefined

  constructor (hooks: LifecycleHooks, options?: LifecycleOptions) {
    if (
      typeof hooks !== 'object'
      || hooks === null
      || typeof hooks.onStart !== 'function'
    ) {
      throw new TypeError('LifecycleHooks requires an onStart(scope) function')
    }
    if (hooks.onStop !== undefined && typeof hooks.onStop !== 'function') {
      throw new TypeError('LifecycleHooks.onStop must be a function when provided')
    }
    if (hooks.onStateChange !== undefined && typeof hooks.onStateChange !== 'function') {
      throw new TypeError('LifecycleHooks.onStateChange must be a function when provided')
    }

    assertValidTimeoutMs(options?.startTimeoutMs, 'startTimeoutMs')
    assertValidTimeoutMs(options?.stopTimeoutMs, 'stopTimeoutMs')

    this.#hooks = hooks
    this.#serviceName = options?.name ?? 'AsyncLifecycle'
    this.#startTimeoutMs = options?.startTimeoutMs
    this.#stopTimeoutMs = options?.stopTimeoutMs
    this.#clock = options?.clock ?? SYSTEM_CLOCK
    this.#instanceId = allocateLifecycleInstanceId()
    this.#lastTransitionMs = this.#clock.now()
    this.#state = Object.freeze({
      kind: 'stopped',
      generation: 0,
    })
  }

  get state (): LifecycleState {
    return this.#state
  }

  condition (name: string): LifecycleCondition {
    return this.#conditions.condition(name)
  }

  start (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(getAbortReason(signal))
    }

    // Refuse starting a new generation over unreleased debt when no cleanup is already running.
    if (
      this.#state.kind === 'failed'
      && !this.#state.cleanupComplete
      && this.#state.kind === 'failed'
    ) {
      return Promise.reject(this.#createDirtyStateError(this.#state))
    }

    // Idempotent fast path: already stably running with no pending retirement or failure.
    if (
      this.#state.kind === 'running'
      && this.#desired === 'running'
      && this.#activeRun !== undefined
      && !this.#activeRun.failureReported
      && this.#activeRun.pendingRecovery === undefined
      && this.#mustRetireGeneration < this.#activeRun.generation
    ) {
      return Promise.resolve()
    }

    // Join in-flight startup of the current generation when it is not slated for retirement.
    if (
      this.#state.kind === 'starting'
      && this.#desired === 'running'
      && this.#activeRun !== undefined
      && !this.#activeRun.failureReported
      && this.#mustRetireGeneration < this.#activeRun.generation
      && this.#currentStartAttempt !== undefined
    ) {
      return waitWithCallerSignal(this.#currentStartAttempt.promise, signal)
    }

    // If a replacement run is already desired (e.g. `restart()` or an earlier `start()`
    // queued during `stopping`), share that queued replacement attempt without disturbing
    // ongoing retirement or an active `recover()` revision.
    if (this.#desired === 'running' && this.#queuedStartAttempt !== undefined) {
      return waitWithCallerSignal(this.#queuedStartAttempt.promise, signal)
    }

    this.#desired = 'running'
    this.#revision++

    if (!this.#queuedStartAttempt) {
      this.#queuedStartAttempt = createDeferred<void>()
    }
    const attempt = this.#queuedStartAttempt
    this.#ensureReconciling()
    return waitWithCallerSignal(attempt.promise, signal)
  }

  stop (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(getAbortReason(signal))
    }

    this.#desired = 'stopped'
    this.#revision++
    this.#mustRetireGeneration = 0

    // Immediately reject any queued replacement `start()` / `restart()` that has not booted yet.
    if (this.#queuedStartAttempt) {
      const supersededQueued = this.#queuedStartAttempt
      this.#queuedStartAttempt = undefined
      supersededQueued.reject(
        new LifecycleSupersededError('Queued start/restart was superseded by stop()'),
      )
    }

    // Cleanly idle (`stopped` or `failed { cleanupComplete: true }`): cancel any unbound
    // pre-start condition waits and resolve immediately.
    if (
      this.#activeRun === undefined
      && this.#dirtyRun === undefined
      && isCleanIdleState(this.#state)
    ) {
      this.#conditions.rejectPreStartWaiters()
      return Promise.resolve()
    }

    // Dirty failed state: schedule a fresh cleanup retry pass on `#dirtyRun`.
    if (this.#activeRun === undefined && this.#dirtyRun !== undefined) {
      if (this.#dirtyRun.stopAttempt.settled()) {
        this.#dirtyRun.stopAttempt = createDeferred<void>()
      }
      this.#retryDirtyStopRequested = true
      const retryPromise = this.#dirtyRun.stopAttempt.promise
      this.#ensureReconciling()
      return waitWithCallerSignal(retryPromise, signal)
    }

    // Active generation (`starting`, `running`, or `stopping`).
    const run = this.#activeRun!
    if (!run.reachedRunning) {
      run.startupInterrupted.resolve()
    }
    this.#ensureReconciling()
    return waitWithCallerSignal(run.stopAttempt.promise, signal)
  }

  restart (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(getAbortReason(signal))
    }

    if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
      return Promise.reject(this.#createDirtyStateError(this.#state))
    }

    // If we are already retiring an earlier generation with a queued replacement that has
    // not booted yet, share that replacement outcome while bumping `#revision` so any
    // concurrent `scope.recover()` is superseded by explicit caller authority.
    if (this.#state.kind === 'stopping') {
      this.#desired = 'running'
      this.#revision++
      if (!this.#queuedStartAttempt) {
        this.#queuedStartAttempt = createDeferred<void>()
      }
      const attempt = this.#queuedStartAttempt
      this.#ensureReconciling()
      return waitWithCallerSignal(attempt.promise, signal)
    }

    this.#desired = 'running'
    this.#revision++

    if (this.#activeRun !== undefined) {
      this.#mustRetireGeneration = this.#activeRun.generation
      if (!this.#activeRun.reachedRunning) {
        this.#activeRun.startupInterrupted.resolve()
      }
    }

    if (!this.#queuedStartAttempt) {
      this.#queuedStartAttempt = createDeferred<void>()
    }
    const attempt = this.#queuedStartAttempt
    this.#ensureReconciling()
    return waitWithCallerSignal(attempt.promise, signal)
  }

  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    if (typeof predicate !== 'function') {
      return Promise.reject(new TypeError('whenState(predicate) requires a predicate function'))
    }
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(getAbortReason(signal))
    }

    try {
      if (predicate(this.#state)) {
        return Promise.resolve(this.#state)
      }
    } catch (err) {
      return Promise.reject(err)
    }

    let watcherRef: StateWatcher | undefined
    const rawPromise = new Promise<LifecycleState>((resolve, reject) => {
      watcherRef = { predicate, resolve, reject }
      this.#watchers.add(watcherRef)
    })

    return waitWithCallerSignal(rawPromise, signal, () => {
      if (watcherRef) {
        this.#watchers.delete(watcherRef)
      }
    })
  }

  [Symbol.asyncDispose] (): Promise<void> {
    return this.stop()
  }

  #ensureReconciling (): void {
    if (this.#reconciling) {
      return
    }
    this.#reconciling = true
    void this.#reconcileLoop()
  }

  async #reconcileLoop (): Promise<void> {
    try {
      while (true) {
        // 1. Retry cleanup on a previously parked dirty `failed { cleanupComplete: false }` run.
        if (this.#activeRun === undefined && this.#dirtyRun !== undefined && this.#retryDirtyStopRequested) {
          this.#retryDirtyStopRequested = false
          await this.#retryDirtyCleanup(this.#dirtyRun)
          continue
        }

        // 2. Retire the active `running` generation when stop, restart, failure, or recovery requires it.
        if (this.#activeRun !== undefined) {
          const run = this.#activeRun
          const needsStop = this.#desired === 'stopped'
          const needsRestart = this.#mustRetireGeneration >= run.generation
          const hasFailure = run.failureReported
          const hasRecovery = run.pendingRecovery !== undefined

          if (!needsStop && !needsRestart && !hasFailure && !hasRecovery) {
            break
          }

          await this.#retireRunningGeneration(run)
          continue
        }

        // 3. No active run: start a new generation iff desired is `'running'` and state is clean.
        if (this.#desired === 'running') {
          if (!isCleanIdleState(this.#state)) {
            this.#desired = 'stopped'
            if (this.#queuedStartAttempt) {
              const blocked = this.#queuedStartAttempt
              this.#queuedStartAttempt = undefined
              blocked.reject(
                this.#state.kind === 'failed'
                  ? this.#createDirtyStateError(this.#state)
                  : new LifecycleUnsafeStateError(
                    `[${this.#serviceName}] Cannot start new generation from state "${this.#state.kind}"`,
                  ),
              )
            }
            break
          }

          await this.#bootAndRunGeneration(this.#revision, undefined)
          continue
        }

        break
      }
    } finally {
      this.#reconciling = false
    }
  }

  #allocateGenerationRun (
    capturedRevision: number,
    linkedRecoveryOutcome: Deferred<RecoveryOutcome> | undefined,
  ): GenerationRun {
    const generation = ++this.#generationCounter

    const ledger = new GenerationLedger({
      onActiveTaskFailure: (error: unknown) => {
        this.#reportGenerationFailure(run, error)
      },
      onPostRetirementDebt: (error: unknown) => {
        // If this generation was the latest cleanly stopped generation and a detached callback
        // registered a resource after retirement whose immediate release failed, surface the
        // debt honestly so the next `stop()` retries it and `start()` refuses overlap.
        if (
          this.#activeRun === undefined
          && this.#dirtyRun === undefined
          && this.#state.kind === 'stopped'
          && this.#state.generation === generation
        ) {
          run.stopAttempt = createDeferred<void>()
          this.#dirtyRun = run
          this.#commit({
            kind: 'failed',
            generation,
            phase: 'stop',
            error,
            cleanupComplete: false,
            cleanupError: error,
          })
        }
      },
    })

    const scope: LifecycleScope = Object.freeze({
      get generation (): number {
        return generation
      },
      get signal (): AbortSignal {
        return ledger.signal
      },
      acquire: <T> (
        create: (signal: AbortSignal) => T | PromiseLike<T>,
        release: (resource: NoInfer<T>) => void | PromiseLike<void>,
        options?: AcquireOptions<NoInfer<T>>,
      ): Promise<T> => {
        return ledger.acquire(create, release, options)
      },
      use: <T extends AsyncDisposable | Disposable> (resource: T): T => {
        return ledger.use(resource)
      },
      defer: (cleanup: () => void | PromiseLike<void>): void => {
        ledger.defer(cleanup)
      },
      listen: (
        target: ListenTarget,
        event: string,
        listener: (...args: any[]) => void,
      ): void => {
        ledger.listen(target, event, listener)
      },
      spawn: (
        task: (signal: AbortSignal) => Promise<void>,
        options?: SpawnOptions,
      ): void => {
        ledger.spawn(task, options)
      },
      start: <C extends Lifecycle> (childOrFactory: C | (() => C)): Promise<C> => {
        return this.#startOwnedChild(run, childOrFactory)
      },
      set: (condition: LifecycleCondition): void => {
        this.#conditions.setForGeneration(generation, condition)
      },
      clear: (condition: LifecycleCondition): void => {
        this.#conditions.clearForGeneration(generation, condition)
      },
      fail: (error: unknown): void => {
        this.#reportGenerationFailure(run, error)
      },
      recover: (reason?: unknown): Promise<RecoveryOutcome> => {
        return this.#requestGenerationRecovery(run, reason)
      },
    })

    const run: GenerationRun = {
      generation,
      capturedRevision,
      ledger,
      scope,
      stopAttempt: createDeferred<void>(),
      startupInterrupted: createDeferred<void>(),
      reachedRunning: false,
      failureReported: false,
      failurePhase: 'start',
      failureError: undefined,
      pendingRecovery: undefined,
      linkedRecoveryOutcome,
    }

    return run
  }

  async #bootAndRunGeneration (
    capturedRevision: number,
    linkedRecoveryOutcome: Deferred<RecoveryOutcome> | undefined,
  ): Promise<void> {
    const run = this.#allocateGenerationRun(capturedRevision, linkedRecoveryOutcome)
    this.#activeRun = run

    // Promote any queued start/restart attempt to own this generation's startup outcome.
    const startAttempt = this.#takeQueuedStartAttempt() ?? createDeferred<void>()
    this.#currentStartAttempt = startAttempt

    this.#conditions.beginGeneration(run.generation)
    this.#commit({
      kind: 'starting',
      generation: run.generation,
    })

    const startDeadline = createDeadlineController(
      this.#clock,
      this.#startTimeoutMs,
      () => new LifecycleTimeoutError('start', this.#startTimeoutMs!, this.#serviceName),
    )

    let onStartFailed = false
    let onStartError: unknown

    const onStartExecution = (async () => {
      try {
        await this.#hooks.onStart(run.scope)
      } catch (err) {
        onStartFailed = true
        onStartError = err
      }
    })()

    run.ledger.trackStartExecution(onStartExecution)

    try {
      await this.#waitForStartOrInterruption(
        onStartExecution,
        run.startupInterrupted.promise,
        startDeadline.signal,
      )
    } finally {
      startDeadline.dispose()
    }

    const timedOut = startDeadline.didTimeout()
    const timeoutError = timedOut ? getAbortReason(startDeadline.signal) : undefined
    const superseded = (
      this.#desired !== 'running'
      || this.#mustRetireGeneration >= run.generation
    )

    // Revalidate intent, generation, timeout, and failure BEFORE ever publishing `running`.
    if (!onStartFailed && !run.failureReported && !timedOut && !superseded) {
      run.reachedRunning = true
      const resolvedStart = this.#currentStartAttempt
      this.#currentStartAttempt = undefined
      const resolvedRecovery = run.linkedRecoveryOutcome
      run.linkedRecoveryOutcome = undefined

      this.#commit(
        {
          kind: 'running',
          generation: run.generation,
        },
        () => {
          resolvedStart?.resolve()
          resolvedRecovery?.resolve('recovered')
        },
      )
      return
    }

    // Startup did NOT succeed: classify whether this was supersession or a startup failure.
    const isSupersededAbort = superseded && !run.failureReported && !timedOut && (
      !onStartFailed || isCooperativeAbortError(onStartError, run.ledger.signal)
    )

    const primaryStartError = run.failureReported
      ? run.failureError
      : timedOut
        ? timeoutError
        : isSupersededAbort
          ? new LifecycleSupersededError(
            `[${this.#serviceName}] Startup of generation ${run.generation} was superseded`,
          )
          : onStartError

    const pendingStart = this.#currentStartAttempt
    this.#currentStartAttempt = undefined
    const linkedRecovery = run.linkedRecoveryOutcome
    run.linkedRecoveryOutcome = undefined

    // Commit `stopping(G)` and immediately reject `G`'s startup & condition waiters BEFORE
    // observers run, then abort `scope.signal` + interrupt + join `onStart` + unwind ledger.
    this.#commit(
      {
        kind: 'stopping',
        generation: run.generation,
      },
      () => {
        this.#conditions.endGeneration(run.generation, primaryStartError)
        pendingStart?.reject(primaryStartError)
        linkedRecovery?.resolve(isSupersededAbort ? 'superseded' : 'failed')
      },
    )

    const stopDeadline = createDeadlineController(
      this.#clock,
      this.#stopTimeoutMs,
      () => new LifecycleTimeoutError('stop', this.#stopTimeoutMs!, this.#serviceName),
    )

    let cleanupComplete = true
    const cleanupErrors: unknown[] = []

    try {
      run.ledger.seal(primaryStartError)
      const interruptOutcome = await run.ledger.abortAndInterrupt(
        stopDeadline.signal,
        primaryStartError,
      )
      if (interruptOutcome.timedOut) {
        cleanupComplete = false
        cleanupErrors.push(interruptOutcome.timeoutReason)
      } else {
        const startJoin = await run.ledger.joinStartExecution(stopDeadline.signal)
        if (!startJoin.settled) {
          cleanupComplete = false
          cleanupErrors.push(startJoin.timeoutReason)
        } else {
          // If `onStart` had not failed yet when interrupted, check whether it threw a
          // non-cooperative error while exiting after abort; only record if superseded.
          if (
            isSupersededAbort
            && onStartFailed
            && !isCooperativeAbortError(onStartError, run.ledger.signal)
          ) {
            cleanupErrors.push(onStartError)
          }
          const unwindResult = await run.ledger.unwind(stopDeadline.signal)
          if (!unwindResult.cleanupComplete) {
            cleanupComplete = false
          }
          cleanupErrors.push(...unwindResult.errors)
        }
      }
    } finally {
      stopDeadline.dispose()
    }

    this.#activeRun = undefined

    if (isSupersededAbort && cleanupComplete && cleanupErrors.length === 0) {
      // Clean supersession during `starting`: resolve `stop()` waiters on `G`!
      if (this.#desired === 'running' && this.#mustRetireGeneration <= run.generation) {
        this.#mustRetireGeneration = 0
        run.stopAttempt.resolve()
        return
      }
      this.#commit(
        {
          kind: 'stopped',
          generation: run.generation,
        },
        () => {
          run.stopAttempt.resolve()
        },
      )
      return
    }

    // Either startup genuinely failed, or supersession encountered a cleanup failure/timeout.
    const collapsedCleanupError = collapseCleanupErrors(cleanupErrors)
    const failurePhase: LifecycleFailurePhase = isSupersededAbort ? 'stop' : 'start'
    const finalError = isSupersededAbort ? collapsedCleanupError : primaryStartError

    if (!cleanupComplete) {
      this.#dirtyRun = run
      this.#desired = 'stopped'
      this.#mustRetireGeneration = 0
    } else if (!isSupersededAbort && this.#peekQueuedStartAttempt() === undefined) {
      // A failed attempt parks unless a newer `start()` / `restart()` was explicitly queued
      // after the failure began.
      this.#desired = 'stopped'
      this.#mustRetireGeneration = 0
    }

    const blockedQueuedStart = (!cleanupComplete || isSupersededAbort)
      ? this.#takeQueuedStartAttempt()
      : undefined
    if (blockedQueuedStart) {
      this.#desired = 'stopped'
      this.#mustRetireGeneration = 0
    }

    const failedSnapshot: LifecycleState = {
      kind: 'failed',
      generation: run.generation,
      phase: failurePhase,
      error: finalError,
      cleanupComplete,
      ...(!isSupersededAbort && collapsedCleanupError !== undefined
        ? { cleanupError: collapsedCleanupError }
        : {}),
    }

    this.#commit(failedSnapshot, () => {
      if (cleanupComplete && cleanupErrors.length === 0) {
        run.stopAttempt.resolve()
      } else {
        run.stopAttempt.reject(collapsedCleanupError ?? finalError)
      }
      if (blockedQueuedStart) {
        blockedQueuedStart.reject(
          !cleanupComplete
            ? this.#createDirtyStateError(failedSnapshot)
            : (collapsedCleanupError ?? finalError),
        )
      }
    })
  }

  async #retireRunningGeneration (run: GenerationRun): Promise<void> {
    const recovery = run.pendingRecovery
    const isFailureRetirement = run.failureReported
    const isRestartRetirement = !isFailureRetirement && this.#mustRetireGeneration >= run.generation
    const isStopRetirement = !isFailureRetirement && !isRestartRetirement && this.#desired === 'stopped'

    const stopReason: StopReason = isFailureRetirement
      ? 'failure'
      : isStopRetirement
        ? 'stop'
        : isRestartRetirement
          ? 'restart'
          : 'recover'

    // If recovery was superseded before retirement even started (and nothing else asked to
    // retire `run`), settle recovery as `'superseded'` without tearing down `run`!
    if (
      stopReason === 'recover'
      && recovery !== undefined
      && recovery.capturedRevision !== this.#revision
    ) {
      run.pendingRecovery = undefined
      recovery.outcome.resolve('superseded')
      return
    }

    const conditionEndError = isFailureRetirement
      ? run.failureError
      : new LifecycleSupersededError(
        `[${this.#serviceName}] Generation ${run.generation} is retiring (${stopReason})`,
      )

    this.#commit(
      {
        kind: 'stopping',
        generation: run.generation,
      },
      () => {
        this.#conditions.endGeneration(run.generation, conditionEndError)
      },
    )

    const stopDeadline = createDeadlineController(
      this.#clock,
      this.#stopTimeoutMs,
      () => new LifecycleTimeoutError('stop', this.#stopTimeoutMs!, this.#serviceName),
    )

    let cleanupComplete = true
    let hasOnStopError = false
    let onStopError: unknown
    const cleanupErrors: unknown[] = []

    try {
      // Step 1: Seal new scope admissions while keeping `scope.signal` live for `onStop`.
      run.ledger.seal(conditionEndError)

      // Step 2: Graceful `onStop(stopContext)` with live resources and independent deadline signal.
      if (this.#hooks.onStop) {
        const stopContext: LifecycleStopContext = Object.freeze({
          generation: run.generation,
          reason: stopReason,
          signal: stopDeadline.signal,
        })
        const stopHookResult = await run.ledger.runOrJoinStopHook(
          () => this.#hooks.onStop!(stopContext),
          stopDeadline.signal,
        )
        if (!stopHookResult.settled) {
          cleanupComplete = false
          cleanupErrors.push(stopHookResult.timeoutReason)
        } else if (stopHookResult.hasHookError) {
          hasOnStopError = true
          onStopError = stopHookResult.hookError
        }
      }

      // Step 3 & 4: Cooperative abort + LIFO `interrupt()` hooks, then Step 5: LIFO unwind.
      if (cleanupComplete) {
        const interruptOutcome = await run.ledger.abortAndInterrupt(
          stopDeadline.signal,
          conditionEndError,
        )
        if (interruptOutcome.timedOut) {
          cleanupComplete = false
          cleanupErrors.push(interruptOutcome.timeoutReason)
        } else {
          const unwindResult = await run.ledger.unwind(stopDeadline.signal)
          if (!unwindResult.cleanupComplete) {
            cleanupComplete = false
          }
          cleanupErrors.push(...unwindResult.errors)
        }
      }
    } finally {
      stopDeadline.dispose()
    }

    this.#activeRun = undefined
    if (this.#mustRetireGeneration === run.generation) {
      this.#mustRetireGeneration = 0
    }

    const allStopErrors: unknown[] = [
      ...(hasOnStopError ? [ onStopError ] : []),
      ...cleanupErrors,
    ]
    const collapsedStopError = collapseCleanupErrors(allStopErrors)
    const retirementClean = cleanupComplete && allStopErrors.length === 0

    // Runtime failure (`scope.fail()` / unhandled `spawn()` / child crash) ALWAYS commits `failed`.
    if (isFailureRetirement) {
      if (!cleanupComplete) {
        this.#dirtyRun = run
        this.#desired = 'stopped'
        this.#mustRetireGeneration = 0
      } else if (this.#queuedStartAttempt === undefined) {
        this.#desired = 'stopped'
      }

      const blockedQueuedStart = !cleanupComplete ? this.#queuedStartAttempt : undefined
      if (blockedQueuedStart) {
        this.#queuedStartAttempt = undefined
      }

      const failedSnapshot: LifecycleState = {
        kind: 'failed',
        generation: run.generation,
        phase: 'run',
        error: run.failureError,
        cleanupComplete,
        ...(collapsedStopError !== undefined ? { cleanupError: collapsedStopError } : {}),
      }

      this.#commit(failedSnapshot, () => {
        if (retirementClean) {
          run.stopAttempt.resolve()
        } else {
          run.stopAttempt.reject(collapsedStopError ?? run.failureError)
        }
        recovery?.outcome.resolve('failed')
        if (blockedQueuedStart) {
          blockedQueuedStart.reject(this.#createDirtyStateError(failedSnapshot))
        }
      })
      return
    }

    // Stop / Restart / Recover retirement encountered an error or timed out -> `failed { phase: 'stop' }`.
    if (!retirementClean) {
      if (!cleanupComplete) {
        this.#dirtyRun = run
      }
      this.#desired = 'stopped'
      this.#mustRetireGeneration = 0

      const failedQueuedStart = this.#queuedStartAttempt
      this.#queuedStartAttempt = undefined

      const failedSnapshot: LifecycleState = {
        kind: 'failed',
        generation: run.generation,
        phase: 'stop',
        error: collapsedStopError,
        cleanupComplete,
        ...(hasOnStopError && cleanupErrors.length > 0
          ? { cleanupError: collapseCleanupErrors(cleanupErrors) }
          : {}),
      }

      this.#commit(failedSnapshot, () => {
        run.stopAttempt.reject(collapsedStopError)
        recovery?.outcome.resolve('failed')
        if (failedQueuedStart) {
          failedQueuedStart.reject(
            !cleanupComplete
              ? this.#createDirtyStateError(failedSnapshot)
              : collapsedStopError,
          )
        }
      })
      return
    }

    // Clean retirement!
    // Re-check recovery authority AFTER retirement completes (closing #2905 Race B).
    if (recovery !== undefined) {
      run.pendingRecovery = undefined
      if (this.#revision === recovery.capturedRevision && this.#desired === 'running') {
        run.stopAttempt.resolve()
        await this.#bootAndRunGeneration(recovery.capturedRevision, recovery.outcome)
        return
      }
      recovery.outcome.resolve('superseded')
    }

    // Clean retirement with an active replacement request (`restart()` or queued `start()`):
    // resolve `run.stopAttempt` immediately and transition `stopping(G) -> starting(G + 1)`.
    if (this.#desired === 'running') {
      run.stopAttempt.resolve()
      await this.#bootAndRunGeneration(this.#revision, undefined)
      return
    }

    this.#commit(
      {
        kind: 'stopped',
        generation: run.generation,
      },
      () => {
        run.stopAttempt.resolve()
      },
    )
  }

  async #retryDirtyCleanup (run: GenerationRun): Promise<void> {
    this.#commit({
      kind: 'stopping',
      generation: run.generation,
    })

    const stopDeadline = createDeadlineController(
      this.#clock,
      this.#stopTimeoutMs,
      () => new LifecycleTimeoutError('stop', this.#stopTimeoutMs!, this.#serviceName),
    )

    let cleanupComplete = true
    let hasOnStopError = false
    let onStopError: unknown
    const cleanupErrors: unknown[] = []

    try {
      // 1. Join any `onStop` hook that was still running from an earlier timed-out stop.
      const stopHookResult = await run.ledger.runOrJoinStopHook(undefined, stopDeadline.signal)
      if (!stopHookResult.settled) {
        cleanupComplete = false
        cleanupErrors.push(stopHookResult.timeoutReason)
      } else if (stopHookResult.hasHookError) {
        hasOnStopError = true
        onStopError = stopHookResult.hookError
      }

      // 2. Ensure `scope.signal` is aborted and `interrupt()` hooks have executed.
      if (cleanupComplete) {
        const interruptOutcome = await run.ledger.abortAndInterrupt(stopDeadline.signal)
        if (interruptOutcome.timedOut) {
          cleanupComplete = false
          cleanupErrors.push(interruptOutcome.timeoutReason)
        }
      }

      // 3. Join any `onStart` hook that outlived an earlier startup abort timeout.
      if (cleanupComplete) {
        const startJoin = await run.ledger.joinStartExecution(stopDeadline.signal)
        if (!startJoin.settled) {
          cleanupComplete = false
          cleanupErrors.push(startJoin.timeoutReason)
        }
      }

      // 4. Retry unwinding any remaining unreleased resources/tasks in LIFO order.
      if (cleanupComplete) {
        const unwindResult = await run.ledger.unwind(stopDeadline.signal)
        if (!unwindResult.cleanupComplete) {
          cleanupComplete = false
        }
        cleanupErrors.push(...unwindResult.errors)
      }
    } finally {
      stopDeadline.dispose()
    }

    const allErrors: unknown[] = [
      ...(hasOnStopError ? [ onStopError ] : []),
      ...cleanupErrors,
    ]
    const collapsedError = collapseCleanupErrors(allErrors)

    if (!cleanupComplete || allErrors.length > 0) {
      if (cleanupComplete) {
        this.#dirtyRun = undefined
      }
      this.#desired = 'stopped'
      const blockedQueuedStart = this.#queuedStartAttempt
      this.#queuedStartAttempt = undefined

      const failedSnapshot: LifecycleState = {
        kind: 'failed',
        generation: run.generation,
        phase: 'stop',
        error: collapsedError,
        cleanupComplete,
      }

      this.#commit(failedSnapshot, () => {
        run.stopAttempt.reject(collapsedError)
        if (blockedQueuedStart) {
          blockedQueuedStart.reject(
            !cleanupComplete
              ? this.#createDirtyStateError(failedSnapshot)
              : collapsedError,
          )
        }
      })
      return
    }

    // All remaining debt has now been cleanly released!
    this.#dirtyRun = undefined

    if (this.#desired === 'running') {
      run.stopAttempt.resolve()
      await this.#bootAndRunGeneration(this.#revision, undefined)
      return
    }

    this.#commit(
      {
        kind: 'stopped',
        generation: run.generation,
      },
      () => {
        run.stopAttempt.resolve()
      },
    )
  }

  #reportGenerationFailure (run: GenerationRun, error: unknown): void {
    if (this.#activeRun !== run || run.failureReported) {
      return
    }
    run.failureReported = true
    run.failurePhase = run.reachedRunning ? 'run' : 'start'
    run.failureError = error

    if (!run.reachedRunning) {
      run.startupInterrupted.resolve()
      return
    }
    this.#ensureReconciling()
  }

  #requestGenerationRecovery (
    run: GenerationRun,
    reason?: unknown,
  ): Promise<RecoveryOutcome> {
    if (this.#activeRun !== run) {
      return Promise.resolve('superseded')
    }

    // Fail-fast rule (#2905 truthy-pending fix): before `running` is committed, recovery
    // must NOT silently reconnect behind a failing `start()`—degrade to `scope.fail()`.
    if (!run.reachedRunning) {
      const failReason = reason ?? new Error(
        `[${this.#serviceName}] Recovery requested before generation ${run.generation} reached running`,
      )
      this.#reportGenerationFailure(run, failReason)
      return Promise.resolve('failed')
    }

    if (run.failureReported) {
      return Promise.resolve('failed')
    }

    if (this.#revision !== run.capturedRevision || this.#desired !== 'running') {
      return Promise.resolve('superseded')
    }

    if (run.pendingRecovery) {
      return run.pendingRecovery.outcome.promise
    }

    const outcome = createDeferred<RecoveryOutcome>()
    run.pendingRecovery = {
      capturedRevision: run.capturedRevision,
      reason,
      outcome,
    }
    this.#ensureReconciling()
    return outcome.promise
  }

  async #startOwnedChild<C extends Lifecycle> (
    run: GenerationRun,
    childOrFactory: C | (() => C),
  ): Promise<C> {
    if (run.ledger.isSealed) {
      throw getAbortReason(run.ledger.signal)
    }

    const child = typeof childOrFactory === 'function'
      ? (childOrFactory as () => C)()
      : childOrFactory

    if (
      typeof child !== 'object'
      || child === null
      || typeof child.start !== 'function'
      || typeof child.stop !== 'function'
      || typeof child.whenState !== 'function'
      || !('state' in child)
    ) {
      throw new TypeError('scope.start(child) requires a Lifecycle instance or factory returning a Lifecycle')
    }

    if ((child as unknown) === (this as unknown) || !isCleanIdleState(child.state)) {
      throw new LifecycleUnsafeStateError(
        `[${this.#serviceName}] Cannot adopt child lifecycle in state "${child.state.kind}" (generation ${child.state.generation}); child must be stopped or cleanly failed`,
      )
    }

    const watcherAbort = new AbortController()
    const disarmWatcher = (): void => {
      if (!watcherAbort.signal.aborted) {
        watcherAbort.abort()
      }
    }

    run.ledger.registerChild(child, disarmWatcher)

    await child.start({ signal: run.ledger.signal })

    if (!run.ledger.isSealed && !watcherAbort.signal.aborted) {
      void child.whenState(
        childState => childState.kind === 'failed' || childState.kind === 'stopped',
        { signal: watcherAbort.signal },
      ).then(
        terminalChildState => {
          if (watcherAbort.signal.aborted || run.ledger.isSealed) {
            return
          }
          if (terminalChildState.kind === 'failed') {
            this.#reportGenerationFailure(
              run,
              new LifecycleChildFailureError(
                `[${this.#serviceName}] Owned child lifecycle entered failed (${terminalChildState.phase}) in child generation ${terminalChildState.generation}`,
                terminalChildState.generation,
                { cause: terminalChildState.error },
              ),
            )
          } else {
            this.#reportGenerationFailure(
              run,
              new LifecycleChildFailureError(
                `[${this.#serviceName}] Owned child lifecycle stopped unexpectedly in child generation ${terminalChildState.generation}`,
                terminalChildState.generation,
              ),
            )
          }
        },
        () => {
          // Watcher aborted cleanly during parent-initiated retirement.
        },
      )
    }

    return child
  }

  async #waitForStartOrInterruption (
    onStartExecution: Promise<void>,
    interruptedPromise: Promise<void>,
    deadlineSignal: AbortSignal,
  ): Promise<void> {
    const raceTarget = Promise.race([ onStartExecution, interruptedPromise ])
    await settleBeforeDeadline(raceTarget, deadlineSignal)
  }

  #commit (
    nextUnfrozenState: LifecycleState,
    settleWaiters?: () => void,
  ): void {
    const previous = this.#state
    const current = Object.freeze({ ...nextUnfrozenState })
    const nowMs = this.#clock.now()
    const durationMs = Math.max(0, nowMs - this.#lastTransitionMs)
    this.#lastTransitionMs = nowMs
    this.#state = current

    // 1. Settle eligible attempt and condition waiters BEFORE observers execute.
    settleWaiters?.()

    // 2. Publish privacy-safe diagnostics if subscribed.
    publishLifecycleDiagnostic({
      instanceId: this.#instanceId,
      service: this.#serviceName,
      revision: this.#revision,
      previous,
      current,
      timestampMs: nowMs,
      durationMs,
    })

    // 3. Notify `onStateChange` observer with exceptions isolated.
    if (this.#hooks.onStateChange) {
      try {
        this.#hooks.onStateChange(current, previous)
      } catch {
        // Isolate observer throws so reconciliation and remaining watchers never break.
      }
    }

    // 4. Evaluate cross-generation `whenState` predicates with per-watcher error isolation.
    if (this.#watchers.size > 0) {
      const snapshotWatchers = [ ...this.#watchers ]
      for (const watcher of snapshotWatchers) {
        if (!this.#watchers.has(watcher)) {
          continue
        }
        try {
          if (watcher.predicate(current)) {
            this.#watchers.delete(watcher)
            watcher.resolve(current)
          }
        } catch (predicateErr) {
          this.#watchers.delete(watcher)
          watcher.reject(predicateErr)
        }
      }
    }
  }

  #peekQueuedStartAttempt (): Deferred<void> | undefined {
    return this.#queuedStartAttempt
  }

  #takeQueuedStartAttempt (): Deferred<void> | undefined {
    const attempt = this.#queuedStartAttempt
    this.#queuedStartAttempt = undefined
    return attempt
  }

  #createDirtyStateError (failedState: LifecycleState & { readonly kind: 'failed' }): LifecycleUnsafeStateError {
    return new LifecycleUnsafeStateError(
      `[${this.#serviceName}] Generation ${failedState.generation} failed during ${failedState.phase} with cleanupComplete=false; call stop() to finish releasing resources before starting a new generation`,
      { cause: failedState.cleanupError ?? failedState.error },
    )
  }
}
