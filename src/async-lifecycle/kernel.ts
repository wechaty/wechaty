/**
 * Shared reconciliation engine for both lifecycle entry points. It owns command
 * authority, state publication and conditions. GenerationScope owns the actual
 * hooks, tasks and resource retirement.
 */
import { channel } from 'node:diagnostics_channel'

import { LifecycleSupersededError, LifecycleTimeoutError, LifecycleUnsafeStateError } from './errors.ts'
import { combineErrors, type Outcome, waitWithSignal, within } from './operations.ts'
import { childIsIdle, GenerationScope } from './scope.ts'
import type {
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleState,
} from './types.ts'

type RunAttempt = {
  readonly kind: 'start' | 'restart' | 'recover'
  readonly result: PromiseWithResolvers<void>
}

type StateWaiter = {
  readonly predicate: (state: LifecycleState) => boolean
  readonly result: PromiseWithResolvers<LifecycleState>
  readonly signal?: AbortSignal
  readonly onAbort: () => void
}

type ConditionWaiter = {
  readonly generation: number
  readonly result: PromiseWithResolvers<void>
  readonly signal?: AbortSignal
  readonly onAbort: () => void
}

type ConditionRecord = {
  readonly condition: LifecycleCondition
  readonly waiters: Set<ConditionWaiter>
  setGeneration?: number
}

type Failure = {
  readonly phase: 'start' | 'run'
  readonly attempt?: RunAttempt
  readonly error: unknown
}

const diagnostics = channel('wechaty.async_lifecycle')

/** Compare only the fields that describe a transition, excluding application errors. */
function diagnosticState(state: LifecycleState) {
  const { kind, generation } = state
  return state.kind === 'failed'
    ? { kind, generation, phase: state.phase, cleanupComplete: state.cleanupComplete }
    : { kind, generation }
}

/** One worker reconciles accepted commands and never starts over unresolved cleanup. */
export class LifecycleKernel implements LifecycleController {
  readonly #hooks: LifecycleHooks
  readonly #options: LifecycleOptions
  readonly #conditions = new Map<string, ConditionRecord>()
  readonly #stateWaiters = new Set<StateWaiter>()
  readonly #lateScopes = new Set<GenerationScope>()

  #state: LifecycleState = Object.freeze({ kind: 'stopped', generation: 0 })
  #generation = 0
  #intentRevision = 0
  #desired: 'running' | 'stopped' = 'stopped'
  #observedIntent = 0
  #active?: GenerationScope
  #run?: RunAttempt
  #startingAttempt?: RunAttempt
  #stop?: PromiseWithResolvers<void>
  #lateCleanupFailure?: { error: unknown }
  #lateWait?: AbortController
  #stopDeadline?: number
  #working = false
  #requested = false

  /** The facade passes only its own hooks and configuration to the engine. */
  constructor(hooks: LifecycleHooks, options: LifecycleOptions = {}, facade?: Lifecycle) {
    this.#hooks = hooks
    this.#options = options
    childIsIdle.set(facade ?? this, () => !this.#run && !this.#stop && !this.#active && this.#lateScopes.size === 0)
  }

  /** @inheritdoc */
  get state(): LifecycleState {
    return this.#state
  }

  /** @inheritdoc */
  start(options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (this.#run && this.#run.kind !== 'recover') {
      return waitWithSignal(this.#run.result.promise, signal)
    }
    if (this.#state.kind === 'running' && !this.#active?.sealed && this.#lateScopes.size === 0) {
      return Promise.resolve()
    }
    if (this.#blockedByCleanup()) {
      return Promise.reject(new LifecycleUnsafeStateError('Cannot start while failed cleanup remains'))
    }

    const adoptRecovery = this.#run?.kind === 'recover' && this.#startingAttempt === this.#run && !this.#active?.sealed
    const attempt = this.#acceptRun('start')
    if (adoptRecovery) {
      this.#startingAttempt = attempt
    }
    this.#requestWork()
    return waitWithSignal(attempt.result.promise, signal)
  }

  /** @inheritdoc */
  stop(options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    const reason = new LifecycleSupersededError('Lifecycle stop requested')
    if (!this.#stop || this.#run) {
      this.#desired = 'stopped'
      this.#intentRevision++
      this.#supersedeRun()
      // Only a new stop intent supersedes waits for a generation that has
      // yet to start. Callers joining retirement preserve later waits.
      for (const record of this.#conditions.values()) {
        this.#settleConditions(record, this.#generation + 1, { error: reason })
      }
    }
    if (!this.#active && this.#lateScopes.size === 0 && this.#state.kind === 'stopped') {
      return Promise.resolve()
    }

    this.#beginStopBudget()
    const stop = this.#stop ??= Promise.withResolvers<void>()
    const wait = waitWithSignal(stop.promise, signal)
    this.#requestWork()
    this.#requestRetirement(reason)
    return wait
  }

  /** @inheritdoc */
  restart(options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (this.#run?.kind === 'restart') {
      return waitWithSignal(this.#run.result.promise, signal)
    }
    if (this.#blockedByCleanup()) {
      return Promise.reject(new LifecycleUnsafeStateError('Cannot restart while failed cleanup remains'))
    }

    const attempt = this.#acceptRun('restart')
    const wait = waitWithSignal(attempt.result.promise, signal)
    this.#requestWork()
    this.#requestRetirement(new LifecycleSupersededError('Lifecycle restart requested'))
    return wait
  }

  /** @inheritdoc */
  whenState(
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }

    const state = this.#state
    try {
      const matches = predicate(state)
      if (signal?.aborted) {
        return Promise.reject(signal.reason)
      }
      if (matches) {
        return Promise.resolve(state)
      }
    } catch (error) {
      return Promise.reject(error)
    }

    const result = Promise.withResolvers<LifecycleState>()
    const onAbort = () => {
      this.#stateWaiters.delete(waiter)
      result.reject(signal?.reason)
    }
    const waiter: StateWaiter = { predicate, result, signal, onAbort }
    this.#stateWaiters.add(waiter)
    signal?.addEventListener('abort', onAbort, { once: true })
    return result.promise
  }

  /** @inheritdoc */
  [Symbol.asyncDispose](): Promise<void> {
    return this.stop()
  }

  /** @inheritdoc */
  condition(name: string): LifecycleCondition {
    let record = this.#conditions.get(name)
    if (!record) {
      const condition = Object.freeze({
        name,
        wait: (options?: LifecycleCallOptions) => this.#waitCondition(condition, options),
      })
      record = { condition, waiters: new Set() }
      this.#conditions.set(name, record)
    }
    return record.condition
  }

  /** @inheritdoc */
  async recover(observed: LifecycleState): Promise<'recovered' | 'superseded'> {
    if (
      observed !== this.#state || observed.kind !== 'failed' || !observed.cleanupComplete
      || this.#desired !== 'running' || this.#intentRevision !== this.#observedIntent
      || this.#run || this.#stop || this.#lateScopes.size > 0
    ) {
      return 'superseded'
    }

    const attempt = this.#acceptRun('recover')
    this.#requestWork()
    try {
      await attempt.result.promise
      return 'recovered'
    } catch {
      return 'superseded'
    }
  }

  /** A stop already in progress can accept a queued replacement behind its cleanup. */
  #blockedByCleanup(): boolean {
    return this.#state.kind === 'failed' && !this.#state.cleanupComplete && !this.#stop
  }

  /** Install intent and its promise before any hook or abort listener can reenter. */
  #acceptRun(kind: RunAttempt['kind']): RunAttempt {
    if (kind !== 'recover') {
      this.#desired = 'running'
      this.#intentRevision++
      this.#supersedeRun()
    }
    const attempt = { kind, result: Promise.withResolvers<void>() }
    this.#run = attempt
    return attempt
  }

  /** Supersede the replacement request without canceling any retirement it required. */
  #supersedeRun(): void {
    const attempt = this.#run
    this.#run = undefined
    attempt?.result.reject(new LifecycleSupersededError())
  }

  /** A shared retirement has one monotonic deadline through hooks, tasks and detached releases. */
  #beginStopBudget(): void {
    const timeout = this.#options.stopTimeoutMs
    if (timeout !== undefined && Number.isFinite(timeout) && timeout > 0) {
      this.#stopDeadline ??= performance.now() + timeout
    }
  }

  /** Startup is interrupted immediately. Running hooks get a graceful stop first. */
  #requestRetirement(reason: unknown): void {
    if (this.#state.kind === 'starting') {
      this.#active?.interrupt(reason)
    } else {
      this.#active?.seal(reason)
    }
    this.#lateWait?.abort()
  }

  /** Claim the worker before it can publish state or invoke any user code. */
  #requestWork(): void {
    this.#requested = true
    if (!this.#working) {
      this.#working = true
      queueMicrotask(() => { void this.#reconcile() })
    }
  }

  /** Process work to quiescence. A failed run never creates its own next attempt. */
  async #reconcile(): Promise<void> {
    try {
      while (this.#requested) {
        this.#requested = false
        while (await this.#step()) {
          // Each step consumes a command, transitions state, or parks for new input.
        }
      }
    } catch (error) {
      this.#run?.result.reject(error)
      this.#stop?.reject(error)
      this.#run = undefined
      this.#stop = undefined
    } finally {
      this.#working = false
      if (this.#requested) {
        this.#requestWork()
      }
    }
  }

  /** Prioritize existing retirement and late resources over queued startup. */
  async #step(): Promise<boolean> {
    const scope = this.#active
    // Park a failed active pass until stop retries it. Detached releases can
    // still settle independently and contribute their own cleanup errors.
    if (scope?.sealed && (this.#state.kind !== 'failed' || this.#stop)) {
      const failure = this.#state.kind === 'running' ? scope.failure : undefined
      await this.#retire(scope, failure, this.#state.kind === 'failed')
      return true
    }
    if (this.#lateScopes.size > 0) {
      return this.#reconcileLateScopes()
    }
    if (this.#stop) {
      this.#finishStop()
      return true
    }
    if (scope && this.#state.kind === 'running' && this.#run?.kind === 'start') {
      // A start delayed by detached cleanup can now join the surviving generation.
      const attempt = this.#run
      this.#run = undefined
      attempt.result.resolve()
      return true
    }
    if (this.#run && !scope) {
      await this.#beginStart(this.#run)
      return true
    }
    return false
  }

  /** Publish running only for an unsealed generation with a successful startup. */
  async #beginStart(attempt: RunAttempt): Promise<void> {
    const generation = ++this.#generation
    const scope = new GenerationScope(generation, this.#hooks, {
      fail: () => {
        this.#lateWait?.abort()
        this.#requestWork()
      },
      lateFailure: error => {
        // A newer startup can be waiting for abort inside its hook. The worker
        // cannot poll the detached ledger until that hook returns.
        if (this.#active !== scope && this.#state.kind === 'starting') {
          this.#active?.fail(error, 'start')
        }
      },
      lateRegistration: () => {
        if (this.#active !== scope) {
          this.#lateScopes.add(scope)
          this.#requestWork()
        }
      },
      setCondition: (condition, value) => this.#setCondition(generation, condition, value),
    })
    this.#active = scope
    this.#startingAttempt = attempt
    const timeout = this.#options.startTimeoutMs ?? Infinity
    const deadline = timeout > 0 ? performance.now() + timeout : Infinity
    this.#commit({ kind: 'starting', generation })

    const startup = waitWithSignal(scope.boot(), scope.signal)
      .catch((error: unknown): Outcome => ({ ok: false, error }))
    let outcome = await within(startup, timeout, 'start', deadline)
    // A detached scope can acquire another release while the hook or a previous
    // batch is settling. Recheck in the same turn that commits running.
    while (!(outcome instanceof LifecycleTimeoutError) && outcome.ok && !scope.sealed && this.#lateScopes.size > 0) {
      outcome = await this.#collectLateReleases(false, scope.signal, 'start', deadline)
        .catch((error: unknown): Outcome => ({ ok: false, error }))
      if (!scope.sealed && !(outcome instanceof LifecycleTimeoutError) && !outcome.ok) {
        this.#lateCleanupFailure = { error: outcome.error }
      }
    }
    // Other microtasks can run after the last awaited deadline check. Keep
    // this check in the same continuation that settles start and commits running.
    if (!(outcome instanceof LifecycleTimeoutError) && outcome.ok && performance.now() >= deadline) {
      outcome = new LifecycleTimeoutError('start', timeout)
    }
    const startedBy = this.#startingAttempt
    this.#startingAttempt = undefined

    if (scope.failure) {
      await this.#retire(scope, { ...scope.failure, attempt: startedBy })
    } else if (scope.sealed) {
      await this.#retire(scope)
    } else if (outcome instanceof LifecycleTimeoutError) {
      // Abort listeners can synchronously issue stop or restart. The expired
      // attempt already owns its timeout before those commands are accepted.
      this.#run = undefined
      startedBy?.result.reject(outcome)
      scope.interrupt(outcome)
      await this.#retire(scope, { phase: 'start', error: outcome, attempt: startedBy }, false, outcome)
    } else if (!outcome.ok) {
      scope.interrupt(outcome.error)
      await this.#retire(scope, { phase: 'start', error: outcome.error, attempt: startedBy })
    } else {
      this.#run = undefined
      startedBy?.result.resolve()
      this.#commit({ kind: 'running', generation })
    }
  }

  /** Publish a single retirement outcome, preserving the pass across deadlines. */
  async #retire(
    scope: GenerationScope,
    failure?: Failure,
    retry = false,
    startTimeout?: LifecycleTimeoutError,
  ): Promise<void> {
    this.#beginStopBudget()
    scope.seal(failure ? failure.error : new LifecycleSupersededError('Lifecycle retiring generation'))
    this.#commit({ kind: 'stopping', generation: scope.generation })
    const work = scope.retire(retry)
    // After the expired attempt settles, a listener may queue a stop or a
    // replacement. Both need the actual retirement outcome under the stop budget.
    const result = startTimeout && !this.#stop && !this.#run
      ? startTimeout
      : await within(work, this.#options.stopTimeoutMs, 'stop', this.#stopDeadline)
    if (!(result instanceof LifecycleTimeoutError)) {
      scope.consumeRetirement()
    }

    const complete = !(result instanceof LifecycleTimeoutError) && !scope.hasCleanup
    const errors = result instanceof LifecycleTimeoutError ? [result] : [...result]
    if (this.#lateCleanupFailure && !retry) {
      errors.push(this.#lateCleanupFailure.error)
    }
    if (!complete && errors.length === 0) {
      errors.push(new LifecycleUnsafeStateError('A late release is still pending'))
    }
    if (complete) {
      this.#active = undefined
    }
    if (failure?.attempt && this.#run === failure.attempt) {
      this.#run = undefined
      failure.attempt.result.reject(failure.error)
    }

    if (errors.length > 0) {
      this.#stopDeadline = undefined
      const cleanupError = combineErrors(errors)
      const stop = this.#stop
      this.#stop = undefined
      stop?.reject(cleanupError)
      const attempt = this.#run
      this.#run = undefined
      attempt?.result.reject(attempt.kind === 'restart'
        ? cleanupError
        : new LifecycleUnsafeStateError('Cannot start while retirement failed'))
      this.#commit({
        kind: 'failed',
        generation: scope.generation,
        phase: failure?.phase ?? 'stop',
        error: failure ? failure.error : cleanupError,
        cleanupComplete: complete && this.#lateScopes.size === 0,
        ...(startTimeout === result ? {} : { cleanupError }),
      })
    } else if (failure) {
      if (!this.#stop && this.#lateScopes.size === 0) this.#stopDeadline = undefined
      this.#commit({
        kind: 'failed',
        generation: scope.generation,
        phase: failure.phase,
        error: failure.error,
        cleanupComplete: complete && this.#lateScopes.size === 0,
      })
    } else if (this.#lateScopes.size === 0) {
      this.#finishStop()
    }
  }

  /** Drain one batch under the waiting command's deadline. Interrupted work stays owned. */
  async #collectLateReleases(
    retry: boolean,
    signal: AbortSignal | undefined,
    operation: 'start' | 'stop',
    deadline: number | undefined,
  ): Promise<Outcome | LifecycleTimeoutError> {
    const checked = [...this.#lateScopes]
    const work = Promise.all(checked.map(scope => scope.finishLateReleases(retry)))
    const timeout = operation === 'start' ? this.#options.startTimeoutMs : this.#options.stopTimeoutMs
    const result = await within(waitWithSignal(work, signal), timeout, operation, deadline)
    if (result instanceof LifecycleTimeoutError) return result
    for (const scope of checked) {
      if (!scope.hasCleanup) this.#lateScopes.delete(scope)
    }
    const errors = result.flat()
    return errors.length ? { ok: false, error: combineErrors(errors) } : { ok: true, value: undefined }
  }

  /** Account for late releases from even a detached generation before starting again. */
  async #reconcileLateScopes(): Promise<boolean> {
    const retry = this.#stop !== undefined
    if (this.#lateCleanupFailure && !retry) {
      const attempt = this.#run
      this.#run = undefined
      attempt?.result.reject(new LifecycleUnsafeStateError('Cannot start while late cleanup remains'))
      return false
    }
    // An active stop or failure must be able to reclaim the worker while these
    // releases continue. Their scopes retain the obligations across this wait.
    const interrupt = retry ? undefined : new AbortController()
    this.#lateWait = interrupt
    let result
    try {
      result = await this.#collectLateReleases(retry, interrupt?.signal, 'stop', this.#stopDeadline)
    } catch (error) {
      if (interrupt?.signal.aborted) return true
      throw error
    } finally {
      this.#lateWait = undefined
    }
    if (!(result instanceof LifecycleTimeoutError) && result.ok) {
      this.#lateCleanupFailure = undefined
      if (this.#lateScopes.size === 0 && !this.#active) {
        if (this.#stop || this.#state.kind === 'stopping') {
          this.#finishStop()
        } else if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
          this.#stopDeadline = undefined
          this.#commit({ ...this.#state, cleanupComplete: true })
        }
      }
      return true
    }

    const error = result instanceof LifecycleTimeoutError ? result : result.error
    this.#lateCleanupFailure = { error }
    if (this.#active && this.#state.kind !== 'failed') {
      this.#active.fail(error)
      return true
    }
    this.#stopDeadline = undefined
    const stop = this.#stop
    this.#stop = undefined
    stop?.reject(error)
    const attempt = this.#run
    this.#run = undefined
    attempt?.result.reject(attempt.kind === 'restart'
      ? error
      : new LifecycleUnsafeStateError('Cannot start while late cleanup remains'))
    const failure = this.#state.kind === 'failed'
      ? this.#state
      : { kind: 'failed' as const, generation: this.#generation, phase: 'stop' as const, error }
    const cleanupError = !retry && 'cleanupError' in failure
      ? combineErrors([failure.cleanupError, error])
      : error
    this.#commit({ ...failure, cleanupComplete: false, cleanupError })
    return false
  }

  /** Resolve the stop before a stopped observer can enqueue another command. */
  #finishStop(): void {
    this.#stopDeadline = undefined
    this.#lateCleanupFailure = undefined
    const stop = this.#stop
    this.#stop = undefined
    stop?.resolve()
    this.#commit({ kind: 'stopped', generation: this.#generation })
  }

  /** Match conditions by owner identity as well as the active generation. */
  #setCondition(generation: number, condition: LifecycleCondition, value: boolean): void {
    const record = this.#conditions.get(condition.name)
    if (record?.condition === condition && this.#active?.generation === generation) {
      record.setGeneration = value ? generation : undefined
      if (value) {
        this.#settleConditions(record, generation)
      }
    }
  }

  /** Stopped, failed and retiring states bind new waits to the next generation. */
  #waitCondition(condition: LifecycleCondition, options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    const record = this.#conditions.get(condition.name)!
    const generation = this.#active && !this.#active.sealed ? this.#active.generation : this.#generation + 1
    if (record.setGeneration === generation) {
      return Promise.resolve()
    }

    const result = Promise.withResolvers<void>()
    const onAbort = () => {
      record.waiters.delete(waiter)
      result.reject(signal?.reason)
    }
    const waiter: ConditionWaiter = { generation, result, signal, onAbort }
    record.waiters.add(waiter)
    signal?.addEventListener('abort', onAbort, { once: true })
    return result.promise
  }

  /** Settle or reject only waits owned by the generation being updated. */
  #settleConditions(record: ConditionRecord, generation: number, failure?: { error: unknown }): void {
    for (const waiter of record.waiters) {
      if (waiter.generation === generation) {
        record.waiters.delete(waiter)
        waiter.signal?.removeEventListener('abort', waiter.onAbort)
        if (failure) {
          waiter.result.reject(failure.error)
        } else {
          waiter.result.resolve()
        }
      }
    }
  }

  /** Freeze state and settle observations before notifying user code or diagnostics. */
  #commit(next: LifecycleState): void {
    const previous = this.#state
    const state = this.#state = Object.freeze(next)
    this.#observedIntent = this.#intentRevision

    if (state.kind === 'stopping' && this.#active) {
      for (const record of this.#conditions.values()) {
        if (record.setGeneration === state.generation) {
          record.setGeneration = undefined
        }
        // A startup hook can itself await a condition. Reject bound waits before joining it.
        const reason = this.#active.reason
        const error = reason instanceof LifecycleSupersededError
          ? reason
          : new Error(`Condition "${record.condition.name}" rejected by failed generation`, { cause: reason })
        this.#settleConditions(record, state.generation, { error })
      }
    }

    for (const waiter of [...this.#stateWaiters]) {
      try {
        if (this.#stateWaiters.has(waiter) && waiter.predicate(state) && this.#stateWaiters.delete(waiter)) {
          waiter.signal?.removeEventListener('abort', waiter.onAbort)
          waiter.result.resolve(state)
        }
      } catch (error) {
        this.#stateWaiters.delete(waiter)
        waiter.signal?.removeEventListener('abort', waiter.onAbort)
        waiter.result.reject(error)
      }
    }

    try {
      this.#hooks.onStateChange?.(state, previous)
    } catch {
      // State observers cannot change a committed outcome by throwing.
    }

    if (diagnostics.hasSubscribers) {
      diagnostics.publish({
        name: this.#options.name ?? 'Lifecycle',
        previous: diagnosticState(previous),
        state: diagnosticState(state),
      })
    }
  }
}
