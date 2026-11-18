/**
 * Single-flight `#private` lifecycle reconciliation kernel for `AsyncLifecycle`.
 *
 * Architectural boundary:
 * - Owns all mutable lifecycle authority: committed state snapshot, desired state, monotonic
 *   user-intent revision, generation counter, shared startup/retirement attempt waiters,
 *   active/dirty generation ledgers, cross-generation `whenState` watchers, and named
 *   `ConditionRegistry`.
 * - Enforces the six core invariants converged across RFC #2905 and #2911:
 *   1. Synchronous intent acceptance before the first `await` (pre-aborted caller signals
 *      reject prior to mutating state or revision).
 *   2. Single-flight reconciliation loop guarded before any hook or observer executes so
 *      reentrant `start()` / `stop()` / `restart()` calls join without spawning a second worker.
 *   3. Dependency-safe two-phase retirement (`seal -> graceful onStop -> abort + interrupt ->
 *      LIFO unwind -> truthful cleanupComplete tracking & stop() retry`).
 *   4. Generation-fenced `LifecycleScope` + double-checked `scope.recover()` authority.
 *   5. Spawn-task context lets recovery retirement avoid joining its own requesting task.
 *   6. Strict post-commit ordering: freeze snapshot -> settle eligible attempt & condition
 *      waiters -> publish privacy-safe diagnostics -> invoke isolated `onStateChange` and
 *      `whenState` predicates.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
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
  readonly requesterTaskIds: Set<symbol>
}

interface GenerationRun {
  readonly generation: number
  capturedRevision: number
  readonly ledger: GenerationLedger
  readonly scope: LifecycleScope
  stopAttempt: Deferred<void>
  readonly startupInterrupted: Deferred<void>
  stopRequested: boolean
  reachedRunning: boolean
  failureReported: boolean
  failurePhase: LifecycleFailurePhase
  failureError: unknown
  pendingRecovery: PendingRecovery | undefined
  /** Linked recovery deferred when this generation was booted by a prior generation's `recover()`. */
  linkedRecoveryOutcome: Deferred<RecoveryOutcome> | undefined
}

interface SpawnTaskContext {
  readonly run: GenerationRun
  readonly taskId: symbol
}

const CHILD_OWNERS = new WeakMap<object, object>()

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
  readonly #spawnTaskContext = new AsyncLocalStorage<SpawnTaskContext>()

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
  #dirtyRuns = new Map<number, GenerationRun>()
  #retryDirtyStopRequested = new Set<number>()
  #dirtyRetryInProgress: GenerationRun | undefined

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

  /** Returns the current immutable state snapshot. */
  get state (): LifecycleState {
    return this.#state
  }

  /** Declares or retrieves a generation-bound condition for this lifecycle. */
  condition (name: string): LifecycleCondition {
    return this.#conditions.condition(name)
  }

  /**
   * Accepts running intent synchronously and joins or creates its shared generation attempt.
   * Caller cancellation detaches only that caller's wait; it never cancels accepted work.
   */
  start (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(getAbortReason(signal))
    }

    // Refuse starting a new generation while any earlier generation still owns cleanup debt.
    if (this.#dirtyRuns.size > 0) {
      return Promise.reject(this.#createDirtyRunError(this.#dirtyRuns.values().next().value!))
    }

    // Refuse starting a new generation over unreleased debt when no cleanup is already running.
    if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
      return Promise.reject(this.#createDirtyStateError(this.#state))
    }

    // Idempotent fast path: already stably running with no pending retirement or failure.
    if (
      this.#state.kind === 'running'
      && this.#desired === 'running'
      && this.#activeRun !== undefined
      && !this.#activeRun.failureReported
      && !this.#activeRun.stopRequested
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
      && !this.#activeRun.stopRequested
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

    // A replacement start cannot retain a generation whose recovery retirement has begun.
    // Settle its requesters before unwind joins their tasks.
    if (this.#state.kind === 'stopping') {
      const pendingRecovery = this.#activeRun?.pendingRecovery
      if (pendingRecovery !== undefined) {
        this.#activeRun!.pendingRecovery = undefined
        pendingRecovery.outcome.resolve('superseded')
      }
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

  /**
   * Accepts stop authority synchronously, settles superseded recovery/start requests, and
   * joins retirement plus any explicitly requested dirty-generation retries.
   */
  stop (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(getAbortReason(signal))
    }

    this.#desired = 'stopped'
    this.#revision++
    this.#mustRetireGeneration = 0
    this.#conditions.rejectPreStartWaiters()

    const pendingRecovery = this.#activeRun?.pendingRecovery
    if (pendingRecovery !== undefined) {
      this.#activeRun!.pendingRecovery = undefined
      pendingRecovery.outcome.resolve('superseded')
    }

    // Immediately reject any queued replacement `start()` / `restart()` that has not booted yet.
    if (this.#queuedStartAttempt) {
      const supersededQueued = this.#queuedStartAttempt
      this.#queuedStartAttempt = undefined
      supersededQueued.reject(
        new LifecycleSupersededError('Queued start/restart was superseded by stop()'),
      )
    }

    // Retry every retained generation's cleanup debt without re-running an in-flight retry.
    const dirtyRetries: Promise<void>[] = []
    if (this.#dirtyRuns.size > 0) {
      const dirtyRuns = [ ...this.#dirtyRuns.values() ]
      for (const dirtyRun of dirtyRuns) {
        if (dirtyRun.stopAttempt.settled()) {
          dirtyRun.stopAttempt = createDeferred<void>()
        }
        if (this.#dirtyRetryInProgress !== dirtyRun) {
          this.#retryDirtyStopRequested.add(dirtyRun.generation)
        }
        dirtyRetries.push(dirtyRun.stopAttempt.promise)
      }
    }

    // Cleanly idle (`stopped` or `failed { cleanupComplete: true }`): resolve immediately.
    if (
      this.#activeRun === undefined
      && this.#dirtyRuns.size === 0
      && isCleanIdleState(this.#state)
    ) {
      return Promise.resolve()
    }

    if (this.#activeRun === undefined && this.#dirtyRuns.size > 0) {
      this.#ensureReconciling()
      return waitWithCallerSignal(Promise.all(dirtyRetries).then(() => {}), signal)
    }

    // Active generation (`starting`, `running`, or `stopping`).
    const run = this.#activeRun!
    run.stopRequested = true
    if (!run.reachedRunning) {
      run.startupInterrupted.resolve()
    }
    this.#ensureReconciling()
    return waitWithCallerSignal(
      Promise.all([ run.stopAttempt.promise, ...dirtyRetries ]).then(() => {}),
      signal,
    )
  }

  /**
   * Accepts replacement intent, retires the current generation, then starts exactly one
   * fresh generation. A superseded recovery is settled before its requester can be joined.
   */
  restart (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(getAbortReason(signal))
    }

    if (this.#dirtyRuns.size > 0) {
      return Promise.reject(this.#createDirtyRunError(this.#dirtyRuns.values().next().value!))
    }
    if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
      return Promise.reject(this.#createDirtyStateError(this.#state))
    }

    const pendingRecovery = this.#activeRun?.pendingRecovery
    if (pendingRecovery !== undefined) {
      this.#activeRun!.pendingRecovery = undefined
      pendingRecovery.outcome.resolve('superseded')
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

  /** Resolves on the first committed snapshot satisfying `predicate`, or rejects on wait cancellation. */
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

  /** Stops the lifecycle when it leaves an `await using` scope. */
  [Symbol.asyncDispose] (): Promise<void> {
    return this.stop()
  }

  /** Starts the single reconciler if no reconciliation worker is already running. */
  #ensureReconciling (): void {
    if (this.#reconciling) {
      return
    }
    this.#reconciling = true
    void this.#reconcileLoop()
  }

  /**
   * Serializes accepted intent into startup, retirement, and dirty-cleanup work.
   * Reentrant commands only update shared intent; this loop remains the sole worker.
   */
  async #reconcileLoop (): Promise<void> {
    try {
      while (true) {
        // 1. Retry only the dirty generations explicitly requested by stop().
        if (this.#activeRun === undefined && this.#retryDirtyStopRequested.size > 0) {
          const generation = this.#retryDirtyStopRequested.values().next().value!
          this.#retryDirtyStopRequested.delete(generation)
          const dirtyRun = this.#dirtyRuns.get(generation)
          if (dirtyRun) {
            this.#dirtyRetryInProgress = dirtyRun
            try {
              await this.#retryDirtyCleanup(dirtyRun)
            } finally {
              this.#dirtyRetryInProgress = undefined
            }
          }
          continue
        }

        // 2. Retire the active `running` generation when stop, restart, failure, or recovery requires it.
        if (this.#activeRun !== undefined) {
          const run = this.#activeRun
          const needsStop = this.#desired === 'stopped' || run.stopRequested
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
          if (this.#dirtyRuns.size > 0 || !isCleanIdleState(this.#state)) {
            this.#desired = 'stopped'
            if (this.#queuedStartAttempt) {
              const blocked = this.#queuedStartAttempt
              this.#queuedStartAttempt = undefined
              blocked.reject(
                this.#dirtyRuns.size > 0
                  ? this.#createDirtyRunError(this.#dirtyRuns.values().next().value!)
                  : this.#state.kind === 'failed'
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

  /**
   * Creates the next fenced generation, its ledger, and the scope capability facade.
   */
  #allocateGenerationRun (
    capturedRevision: number,
    linkedRecoveryOutcome: Deferred<RecoveryOutcome> | undefined,
  ): GenerationRun {
    const generation = ++this.#generationCounter

    const ledger = new GenerationLedger({
      onActiveTaskFailure: (error: unknown) => {
        this.#reportGenerationFailure(run, error)
      },
      onPostRetirementCleanupStarted: () => {
        // Reserve the retired ledger before a late async disposer can overlap a replacement.
        if (!this.#dirtyRuns.has(generation)) {
          if (run.stopAttempt.settled()) {
            run.stopAttempt = createDeferred<void>()
          }
          this.#dirtyRuns.set(generation, run)
        }

        if (this.#activeRun !== undefined && this.#activeRun !== run) {
          this.#reportGenerationFailure(
            this.#activeRun,
            new LifecycleUnsafeStateError(
              `[${this.#serviceName}] Generation ${generation} still has late cleanup in progress`,
            ),
          )
        }
      },
      onPostRetirementCleanupSucceeded: () => {
        if (run.ledger.hasUnresolvedDebt) {
          return
        }
        this.#dirtyRuns.delete(generation)
        this.#retryDirtyStopRequested.delete(generation)
        run.stopAttempt.resolve()

        if (this.#dirtyRuns.size === 0 && this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
          this.#commit({
            ...this.#state,
            cleanupComplete: true,
          })
        }
      },
      onPostRetirementDebt: (error: unknown) => {
        // Keep late debt attached to its original ledger even after a replacement starts.
        if (!this.#dirtyRuns.has(generation)) {
          run.stopAttempt = createDeferred<void>()
          this.#dirtyRuns.set(generation, run)
        }
        run.failureError = error
        run.failurePhase = 'stop'

        if (this.#activeRun !== undefined && this.#activeRun !== run) {
          this.#reportGenerationFailure(this.#activeRun, error)
        } else if (this.#activeRun === undefined) {
          const stateGeneration = Math.max(this.#state.generation, generation)
          this.#commit({
            kind: 'failed',
            generation: stateGeneration,
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
        const taskId = Symbol('lifecycle spawn task')
        ledger.spawn(
          signal => this.#spawnTaskContext.run({ run, taskId }, () => task(signal)),
          options,
          taskId,
        )
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
        const context = this.#spawnTaskContext.getStore()
        return this.#requestGenerationRecovery(
          run,
          reason,
          context?.run === run ? context.taskId : undefined,
        )
      },
    })

    const run: GenerationRun = {
      generation,
      capturedRevision,
      ledger,
      scope,
      stopAttempt: createDeferred<void>(),
      startupInterrupted: createDeferred<void>(),
      stopRequested: false,
      reachedRunning: false,
      failureReported: false,
      failurePhase: 'start',
      failureError: undefined,
      pendingRecovery: undefined,
      linkedRecoveryOutcome,
    }

    return run
  }

  /**
   * Starts one fresh generation and resolves or rejects its shared start attempt.
   * The generation is committed as running only after startup, intent, failure, and timeout
   * authority are revalidated together.
   */
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
      run.stopRequested
      || this.#desired !== 'running'
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
    let isSupersededAbort = superseded && !run.failureReported && !timedOut && (
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
          if (run.failureReported && isSupersededAbort) {
            isSupersededAbort = false
            cleanupErrors.push(run.failureError)
          }
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

    if (run.failureReported && isSupersededAbort) {
      isSupersededAbort = false
      cleanupErrors.push(run.failureError)
    }

    this.#activeRun = undefined
    if (!cleanupComplete) {
      this.#dirtyRuns.set(run.generation, run)
    }
    const allGenerationsClean = cleanupComplete && this.#dirtyRuns.size === 0

    if (isSupersededAbort && allGenerationsClean && cleanupErrors.length === 0) {
      // Clean supersession during `starting`: resolve `stop()` waiters on `G`!
      this.#mustRetireGeneration = 0
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
    const finalError = run.failureReported
      ? run.failureError
      : isSupersededAbort
        ? cleanupErrors.length > 0
          ? collapsedCleanupError
          : this.#dirtyRuns.values().next().value?.failureError ?? primaryStartError
        : primaryStartError

    if (!allGenerationsClean) {
      this.#desired = 'stopped'
      this.#mustRetireGeneration = 0
    } else if (!isSupersededAbort && this.#peekQueuedStartAttempt() === undefined) {
      // A failed attempt parks unless a newer `start()` / `restart()` was explicitly queued
      // after the failure began.
      this.#desired = 'stopped'
      this.#mustRetireGeneration = 0
    }

    const blockedQueuedStart = (!allGenerationsClean || isSupersededAbort)
      ? this.#takeQueuedStartAttempt()
      : undefined
    if (blockedQueuedStart) {
      this.#desired = 'stopped'
      this.#mustRetireGeneration = 0
    }

    const failedSnapshot: LifecycleState = {
      kind: 'failed',
      generation: run.generation,
      phase: run.failureReported ? run.failurePhase : failurePhase,
      error: finalError,
      cleanupComplete: allGenerationsClean,
      ...(cleanupErrors.length > 0
        ? { cleanupError: collapsedCleanupError }
        : {}),
    }

    this.#commit(failedSnapshot, () => {
      if (allGenerationsClean && cleanupErrors.length === 0) {
        run.stopAttempt.resolve()
      } else {
        run.stopAttempt.reject(cleanupErrors.length > 0 ? collapsedCleanupError : finalError)
      }
      if (blockedQueuedStart) {
        blockedQueuedStart.reject(
          !allGenerationsClean
            ? this.#createDirtyStateError(failedSnapshot)
            : (cleanupErrors.length > 0 ? collapsedCleanupError : finalError),
        )
      }
    })
  }

  /**
   * Retires a running generation with graceful stop, interruption, task joining, and LIFO
   * release. Accepted failure/stop/restart authority is rechecked after awaited hooks.
   */
  async #retireRunningGeneration (run: GenerationRun): Promise<void> {
    const recovery = run.pendingRecovery
    let isFailureRetirement = run.failureReported
    const isStopRetirement = !isFailureRetirement && (
      run.stopRequested
      || (this.#mustRetireGeneration < run.generation && this.#desired === 'stopped')
    )
    const isRestartRetirement = !isFailureRetirement
      && !isStopRetirement
      && this.#mustRetireGeneration >= run.generation

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
      if (
        this.#activeRun === run
        && this.#state.kind === 'running'
        && this.#desired === 'running'
        && this.#mustRetireGeneration < run.generation
      ) {
        run.capturedRevision = this.#revision
        this.#takeQueuedStartAttempt()?.resolve()
      }
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
          const unwindResult = await run.ledger.unwind(
            stopDeadline.signal,
            stopReason === 'recover'
                && recovery !== undefined
                && run.pendingRecovery === recovery
                && this.#revision === recovery.capturedRevision
                && this.#desired === 'running'
              ? recovery.requesterTaskIds
              : undefined,
          )
          if (!unwindResult.cleanupComplete) {
            cleanupComplete = false
          }
          cleanupErrors.push(...unwindResult.errors)
        }
      }
    } finally {
      stopDeadline.dispose()
    }

    // A failure reported by an owned task or child while retirement awaited user code
    // must not be hidden by the earlier stop/restart/recover decision.
    isFailureRetirement ||= run.failureReported
    this.#activeRun = undefined
    if (this.#mustRetireGeneration === run.generation) {
      this.#mustRetireGeneration = 0
    }

    const allStopErrors: unknown[] = [
      ...(hasOnStopError ? [ onStopError ] : []),
      ...cleanupErrors,
    ]
    const collapsedStopError = collapseCleanupErrors(allStopErrors)
    if (!cleanupComplete) {
      this.#dirtyRuns.set(run.generation, run)
    }
    const allGenerationsClean = cleanupComplete && this.#dirtyRuns.size === 0
    const retirementClean = allGenerationsClean && allStopErrors.length === 0

    // Runtime failure (`scope.fail()` / unhandled `spawn()` / child crash) ALWAYS commits `failed`.
    if (isFailureRetirement) {
      if (!allGenerationsClean) {
        this.#desired = 'stopped'
        this.#mustRetireGeneration = 0
      } else if (this.#queuedStartAttempt === undefined) {
        this.#desired = 'stopped'
      }

      const blockedQueuedStart = !allGenerationsClean ? this.#queuedStartAttempt : undefined
      if (blockedQueuedStart) {
        this.#queuedStartAttempt = undefined
      }

      const failedSnapshot: LifecycleState = {
        kind: 'failed',
        generation: run.generation,
        phase: 'run',
        error: run.failureError,
        cleanupComplete: allGenerationsClean,
        ...(allStopErrors.length > 0 ? { cleanupError: collapsedStopError } : {}),
      }

      this.#commit(failedSnapshot, () => {
        if (retirementClean) {
          run.stopAttempt.resolve()
        } else {
          run.stopAttempt.reject(
            allStopErrors.length > 0
              ? collapsedStopError
              : this.#dirtyRuns.values().next().value?.failureError ?? run.failureError,
          )
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
      this.#desired = 'stopped'
      this.#mustRetireGeneration = 0

      const failedQueuedStart = this.#queuedStartAttempt
      this.#queuedStartAttempt = undefined

      const retirementError = allStopErrors.length > 0
        ? collapsedStopError
        : this.#dirtyRuns.values().next().value?.failureError
          ?? new Error(`[${this.#serviceName}] Lifecycle cleanup did not complete`)
      const failedSnapshot: LifecycleState = {
        kind: 'failed',
        generation: run.generation,
        phase: 'stop',
        error: retirementError,
        cleanupComplete: allGenerationsClean,
        ...(hasOnStopError && cleanupErrors.length > 0
          ? { cleanupError: collapseCleanupErrors(cleanupErrors) }
          : {}),
      }

      this.#commit(failedSnapshot, () => {
        run.stopAttempt.reject(retirementError)
        recovery?.outcome.resolve('failed')
        if (failedQueuedStart) {
          failedQueuedStart.reject(
            !allGenerationsClean
              ? this.#createDirtyStateError(failedSnapshot)
              : retirementError,
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

  /**
   * Retries only the unfinished retirement work for one dirty generation and settles its
   * shared stop attempt with the exact remaining cleanup outcome.
   */
  async #retryDirtyCleanup (run: GenerationRun): Promise<void> {
    const stateGeneration = Math.max(this.#state.generation, run.generation)
    this.#commit({
      kind: 'stopping',
      generation: stateGeneration,
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

    if (cleanupComplete) {
      this.#dirtyRuns.delete(run.generation)
    } else {
      this.#dirtyRuns.set(run.generation, run)
    }
    const allGenerationsClean = cleanupComplete && this.#dirtyRuns.size === 0

    if (!cleanupComplete || allErrors.length > 0) {
      this.#desired = 'stopped'
      const blockedQueuedStart = this.#queuedStartAttempt
      this.#queuedStartAttempt = undefined
      const retirementError = allErrors.length > 0
        ? collapsedError
        : this.#dirtyRuns.values().next().value?.failureError
          ?? run.failureError
          ?? new Error(`[${this.#serviceName}] Lifecycle cleanup did not complete`)

      const failedSnapshot: LifecycleState = {
        kind: 'failed',
        generation: Math.max(this.#state.generation, run.generation),
        phase: 'stop',
        error: retirementError,
        cleanupComplete: allGenerationsClean,
      }

      this.#commit(failedSnapshot, () => {
        if (!cleanupComplete || allErrors.length > 0) {
          run.stopAttempt.reject(retirementError)
        } else {
          run.stopAttempt.resolve()
        }
        if (blockedQueuedStart) {
          blockedQueuedStart.reject(
            !allGenerationsClean
              ? this.#createDirtyStateError(failedSnapshot)
              : retirementError,
          )
        }
      })
      return
    }

    // All remaining debt has now been cleanly released!
    if (this.#dirtyRuns.size === 0 && this.#desired === 'running') {
      run.stopAttempt.resolve()
      await this.#bootAndRunGeneration(this.#revision, undefined)
      return
    }

    if (this.#dirtyRuns.size > 0) {
      const remainingDebt = this.#dirtyRuns.values().next().value!
      const failedSnapshot: LifecycleState = {
        kind: 'failed',
        generation: Math.max(this.#state.generation, run.generation),
        phase: 'stop',
        error: remainingDebt.failureError,
        cleanupComplete: false,
        ...(remainingDebt.failureError !== undefined
          ? { cleanupError: remainingDebt.failureError }
          : {}),
      }
      this.#commit(failedSnapshot, () => {
        run.stopAttempt.resolve()
      })
      return
    }

    this.#commit(
      {
        kind: 'stopped',
        generation: Math.max(this.#state.generation, run.generation),
      },
      () => {
        run.stopAttempt.resolve()
      },
    )
  }

  /** Records generation failure authority and wakes the single reconciler when it can retire. */
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

  /** Requests authority-fenced recovery and records any owned task awaiting that handoff. */
  #requestGenerationRecovery (
    run: GenerationRun,
    reason?: unknown,
    requesterTaskId?: symbol,
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
      if (requesterTaskId !== undefined) {
        run.pendingRecovery.requesterTaskIds.add(requesterTaskId)
        run.ledger.markRecoveryRequester(requesterTaskId)
      }
      return run.pendingRecovery.outcome.promise
    }

    const outcome = createDeferred<RecoveryOutcome>()
    run.pendingRecovery = {
      capturedRevision: run.capturedRevision,
      reason,
      outcome,
      requesterTaskIds: new Set(
        requesterTaskId === undefined ? [] : [ requesterTaskId ],
      ),
    }
    if (requesterTaskId !== undefined) {
      run.ledger.markRecoveryRequester(requesterTaskId)
    }
    this.#ensureReconciling()
    return outcome.promise
  }

  /**
   * Claims an idle child before startup and retains ownership until parent-led cleanup releases it.
   */
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

    if (CHILD_OWNERS.has(child)) {
      throw new LifecycleUnsafeStateError(
        `[${this.#serviceName}] Cannot adopt a child lifecycle that is still owned by another parent`,
      )
    }

    const ownership = {}
    CHILD_OWNERS.set(child, ownership)
    const releaseOwnership = (): void => {
      if (CHILD_OWNERS.get(child) === ownership) {
        CHILD_OWNERS.delete(child)
      }
    }

    const watcherAbort = new AbortController()
    const disarmWatcher = (): void => {
      if (!watcherAbort.signal.aborted) {
        watcherAbort.abort()
      }
    }

    try {
      run.ledger.registerChild(child, disarmWatcher, releaseOwnership)
    } catch (error) {
      releaseOwnership()
      throw error
    }

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

  /**
   * Waits for startup completion, accepted cancellation, or the startup deadline.
   */
  async #waitForStartOrInterruption (
    onStartExecution: Promise<void>,
    interruptedPromise: Promise<void>,
    deadlineSignal: AbortSignal,
  ): Promise<void> {
    const raceTarget = Promise.race([ onStartExecution, interruptedPromise ])
    await settleBeforeDeadline(raceTarget, deadlineSignal)
  }

  /**
   * Commits a frozen state before settling waiters, publishing diagnostics, and invoking
   * isolated observers; this ordering keeps reentrant callbacks from changing the commit.
   */
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

  /** Builds the caller-facing error for a failed snapshot that still owns cleanup debt. */
  #createDirtyStateError (failedState: LifecycleState & { readonly kind: 'failed' }): LifecycleUnsafeStateError {
    return new LifecycleUnsafeStateError(
      `[${this.#serviceName}] Generation ${failedState.generation} failed during ${failedState.phase} with cleanupComplete=false; call stop() to finish releasing resources before starting a new generation`,
      { cause: failedState.cleanupError ?? failedState.error },
    )
  }

  /** Builds the caller-facing error while a retired generation's ledger still has debt. */
  #createDirtyRunError (run: GenerationRun): LifecycleUnsafeStateError {
    return new LifecycleUnsafeStateError(
      `[${this.#serviceName}] Generation ${run.generation} still owns cleanup debt; call stop() to finish releasing resources before starting a new generation`,
      { cause: run.failureError },
    )
  }
}
