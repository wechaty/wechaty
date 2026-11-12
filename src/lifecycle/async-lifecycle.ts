/**
 * Provides an intent-driven asynchronous lifecycle controller with cancellation
 * and deterministic waiter semantics for start/stop/restart orchestration.
 *
 * The controller owns lifecycle transitions and exposes immutable observation.
 * Callers can await state without mutating lifecycle flags directly.
 */
import { channel } from 'node:diagnostics_channel'

type DesiredState = 'running' | 'stopped'

type AsyncLifecycleState =
  | { readonly kind: 'stopped' }
  | { readonly kind: 'starting', readonly generation: number }
  | { readonly kind: 'running', readonly generation: number }
  | { readonly kind: 'stopping', readonly generation: number }
  | {
    readonly kind: 'failed',
    readonly generation: number,
    readonly error: unknown,
    readonly cleanupComplete: boolean,
    readonly cleanupError?: unknown,
  }

interface AsyncLifecycleHooks {
  /**
   * Starts owned resources for a new generation. Hooks should cooperate with
   * `signal` cancellation where possible.
   */
  start: (context: { readonly generation: number, readonly signal: AbortSignal }) => Promise<void>

  /**
   * Stops and releases resources owned by the current generation.
   */
  stop: (context: { readonly generation: number }) => Promise<void>
}

interface AsyncLifecycleOptions {
  readonly name: string
  readonly hooks: AsyncLifecycleHooks
}

interface WaitOptions {
  readonly signal?: AbortSignal
}

type LegacyStateValue = boolean | 'pending'
type StableTarget = 'active' | 'inactive'

interface LegacyLifecycleState {
  active: () => LegacyStateValue
  inactive: () => LegacyStateValue
  stable: (target: StableTarget, options?: WaitOptions) => Promise<void>
}

interface Waiter {
  readonly revision: number
  readonly target: DesiredState
  readonly minGeneration?: number
  readonly resolve: () => void
  readonly reject: (reason: unknown) => void
  readonly signal?: AbortSignal
}

interface PredicateWaiter {
  readonly predicate: (state: AsyncLifecycleState) => boolean
  readonly resolve: (state: AsyncLifecycleState) => void
  readonly reject: (reason: unknown) => void
  readonly signal?: AbortSignal
}

const diagnostics = channel('wechaty.lifecycle')

const createAbortError = (message: string): Error => {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

const createSupersededError = (message: string): Error => {
  const error = new Error(message)
  error.name = 'LifecycleSupersededError'
  return error
}

/**
 * Coordinates asynchronous lifecycle transitions through desired-state
 * reconciliation, while preserving a compatibility read surface for callers
 * that still consume `active()/inactive()/stable()`.
 */
class AsyncLifecycleController {
  readonly #name: string
  readonly #hooks: AsyncLifecycleHooks

  #state: AsyncLifecycleState = Object.freeze({ kind: 'stopped' as const })
  #desired: DesiredState = 'stopped'
  #intentRevision = 0
  #generation = 0
  #restartRevision?: number
  #startAbort?: AbortController

  readonly #waiters = new Set<Waiter>()
  readonly #predicateWaiters = new Set<PredicateWaiter>()
  #wakeup?: () => void
  #worker?: Promise<void>

  readonly legacyState: LegacyLifecycleState

  constructor (options: AsyncLifecycleOptions) {
    this.#name = options.name
    this.#hooks = options.hooks

    this.legacyState = {
      active: () => {
        switch (this.#state.kind) {
          case 'running':
            return true
          case 'starting':
            return 'pending'
          default:
            return false
        }
      },
      inactive: () => {
        switch (this.#state.kind) {
          case 'stopped':
            return true
          case 'stopping':
            return 'pending'
          default:
            return false
        }
      },
      stable: (target, waitOptions) => this.whenState(
        state => target === 'active'
          ? state.kind === 'running'
          : state.kind === 'stopped' || (state.kind === 'failed' && state.cleanupComplete),
        waitOptions,
      ).then(() => {}),
    }
  }

  /**
   * Returns an immutable snapshot of the currently observed lifecycle state.
   */
  get state (): AsyncLifecycleState {
    return this.#state
  }

  /**
   * Requests the running target state and resolves when running is reached, or
   * rejects if this request is superseded, fails, or is aborted.
   */
  async start (options: WaitOptions = {}): Promise<void> {
    const revision = this.#setIntent('running')
    return this.#waitForTarget(revision, 'running', options.signal)
  }

  /**
   * Requests the stopped target state and resolves when resources are released,
   * or rejects if this request is superseded, fails, or is aborted.
   */
  async stop (options: WaitOptions = {}): Promise<void> {
    const revision = this.#setIntent('stopped')
    return this.#waitForTarget(revision, 'stopped', options.signal)
  }

  /**
   * Requests an explicit stop/start cycle. A later explicit stop or start can
   * supersede this request, and the returned promise rejects when superseded.
   */
  async restart (options: WaitOptions = {}): Promise<void> {
    const previousGeneration = this.#state.kind === 'running'
      ? this.#state.generation
      : undefined
    const revision = this.#setIntent('running', { restart: true })
    return this.#waitForTarget(
      revision,
      'running',
      options.signal,
      previousGeneration === undefined
        ? undefined
        : previousGeneration + 1,
    )
  }

  /**
   * Waits for an observed state predicate against immutable snapshots.
   */
  async whenState (
    predicate: (state: AsyncLifecycleState) => boolean,
    options: WaitOptions = {},
  ): Promise<AsyncLifecycleState> {
    if (predicate(this.#state)) {
      return this.#state
    }
    if (options.signal?.aborted) {
      throw createAbortError(`${this.#name}.whenState() aborted before waiting`)
    }

    return new Promise<AsyncLifecycleState>((resolve, reject) => {
      const waiter: PredicateWaiter = {
        predicate,
        resolve,
        reject,
        signal: options.signal,
      }
      this.#predicateWaiters.add(waiter)

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          if (!this.#predicateWaiters.delete(waiter)) {
            return
          }
          reject(createAbortError(`${this.#name}.whenState() aborted while waiting`))
        }, { once: true })
      }

      this.#settlePredicateWaiters()
    })
  }

  #setIntent (target: DesiredState, options: { restart?: boolean } = {}): number {
    this.#intentRevision += 1
    this.#desired = target

    if (options.restart) {
      this.#restartRevision = this.#intentRevision
    } else if (target === 'stopped') {
      this.#restartRevision = undefined
    }

    if (target === 'stopped' && this.#state.kind === 'starting') {
      this.#startAbort?.abort()
    }

    this.#publish('intent')
    this.#ensureWorker()
    this.#settleWaiters()
    this.#settlePredicateWaiters()
    return this.#intentRevision
  }

  #waitForTarget (
    revision: number,
    target: DesiredState,
    signal?: AbortSignal,
    minGeneration?: number,
  ): Promise<void> {
    if (signal?.aborted) {
      return Promise.reject(createAbortError(`${this.#name}.${target}() aborted before waiting`))
    }

    const immediate = this.#evaluateWaiter(revision, target, minGeneration)
    if (immediate.kind === 'resolve') {
      return Promise.resolve()
    }
    if (immediate.kind === 'reject') {
      return Promise.reject(immediate.reason)
    }

    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        revision,
        target,
        minGeneration,
        resolve,
        reject,
        signal,
      }
      this.#waiters.add(waiter)

      if (signal) {
        signal.addEventListener('abort', () => {
          if (!this.#waiters.delete(waiter)) {
            return
          }
          reject(createAbortError(`${this.#name}.${target}() aborted while waiting`))
        }, { once: true })
      }

      this.#settleWaiters()
    })
  }

  #ensureWorker (): void {
    if (this.#worker) {
      this.#wakeWorker()
      return
    }

    this.#worker = this.#runWorker()
      .finally(() => {
        this.#worker = undefined
        if (this.#hasPendingWork()) {
          this.#ensureWorker()
        }
      })
  }

  async #runWorker (): Promise<void> {
    while (true) {
      const stepped = await this.#reconcileOnce()
      this.#settleWaiters()

      if (stepped || this.#hasPendingWork()) {
        continue
      }

      await new Promise<void>(resolve => {
        this.#wakeup = resolve
      })
      this.#wakeup = undefined

      if (!this.#hasPendingWork()) {
        return
      }
    }
  }

  #wakeWorker (): void {
    this.#wakeup?.()
  }

  #hasPendingWork (): boolean {
    if (this.#state.kind === 'starting' || this.#state.kind === 'stopping') {
      return true
    }

    if (this.#desired === 'running') {
      if (this.#state.kind === 'stopped' || this.#state.kind === 'failed') {
        return true
      }

      if (this.#state.kind === 'running') {
        return this.#restartRevision === this.#intentRevision
      }
    }

    if (this.#desired === 'stopped') {
      return this.#state.kind === 'running'
    }

    return false
  }

  async #reconcileOnce (): Promise<boolean> {
    if (this.#desired === 'running') {
      if (this.#state.kind === 'stopped' || this.#state.kind === 'failed') {
        await this.#runStart()
        return true
      }

      if (
        this.#state.kind === 'running'
        && this.#restartRevision === this.#intentRevision
      ) {
        await this.#runStop()
        return true
      }
    }

    if (this.#desired === 'stopped' && this.#state.kind === 'running') {
      await this.#runStop()
      return true
    }

    return false
  }

  async #runStart (): Promise<void> {
    const generation = this.#generation + 1
    const abortController = new AbortController()
    this.#startAbort = abortController
    this.#setState({ kind: 'starting', generation })

    try {
      await this.#hooks.start({ generation, signal: abortController.signal })
      this.#generation = generation
      this.#setState({ kind: 'running', generation })

      if (this.#restartRevision === this.#intentRevision) {
        this.#restartRevision = undefined
      }
    } catch (error) {
      const cleanup = await this.#tryStopGeneration(generation)
      const canceledByIntent = abortController.signal.aborted && this.#desired === 'stopped'
      if (canceledByIntent && cleanup.cleanupComplete) {
        this.#setState({ kind: 'stopped' })
      } else {
        this.#desired = 'stopped'
        this.#setState({
          kind: 'failed',
          generation,
          error,
          cleanupComplete: cleanup.cleanupComplete,
          cleanupError: cleanup.cleanupError,
        })
      }
    } finally {
      this.#startAbort = undefined
      this.#publish('start')
    }
  }

  async #runStop (): Promise<void> {
    const generation = this.#generation
    this.#setState({ kind: 'stopping', generation })

    try {
      await this.#hooks.stop({ generation })
      this.#setState({ kind: 'stopped' })
    } catch (error) {
      this.#desired = 'stopped'
      this.#setState({
        kind: 'failed',
        generation,
        error,
        cleanupComplete: false,
      })
    } finally {
      this.#publish('stop')
    }
  }

  async #tryStopGeneration (
    generation: number,
  ): Promise<{ cleanupComplete: boolean, cleanupError?: unknown }> {
    try {
      await this.#hooks.stop({ generation })
      return { cleanupComplete: true }
    } catch (cleanupError) {
      return {
        cleanupComplete: false,
        cleanupError,
      }
    }
  }

  #setState (next: AsyncLifecycleState): void {
    this.#state = Object.freeze(next)
    this.#publish('state')
    this.#settleWaiters()
    this.#settlePredicateWaiters()
  }

  #evaluateWaiter (
    revision: number,
    target: DesiredState,
    minGeneration?: number,
  ): { kind: 'pending' } | { kind: 'resolve' } | { kind: 'reject', reason: unknown } {
    if (this.#intentRevision > revision && this.#desired !== target) {
      return {
        kind: 'reject',
        reason: createSupersededError(
          `${this.#name} ${target} request at revision ${revision} was superseded by revision ${this.#intentRevision}`,
        ),
      }
    }

    if (target === 'running') {
      if (
        this.#state.kind === 'running'
        && this.#desired === 'running'
        && (typeof minGeneration === 'undefined' || this.#state.generation >= minGeneration)
      ) {
        return { kind: 'resolve' }
      }
      if (this.#state.kind === 'failed' && this.#intentRevision === revision) {
        return { kind: 'reject', reason: this.#state.error }
      }
      return { kind: 'pending' }
    }

    if (this.#state.kind === 'stopped' && this.#desired === 'stopped') {
      return { kind: 'resolve' }
    }
    if (this.#state.kind === 'failed' && this.#desired === 'stopped' && this.#intentRevision === revision) {
      if (this.#state.cleanupComplete) {
        return { kind: 'resolve' }
      }
      return { kind: 'reject', reason: this.#state.error }
    }
    return { kind: 'pending' }
  }

  #settleWaiters (): void {
    for (const waiter of this.#waiters) {
      if (waiter.signal?.aborted) {
        this.#waiters.delete(waiter)
        waiter.reject(createAbortError(`${this.#name}.${waiter.target}() aborted while waiting`))
        continue
      }

      const outcome = this.#evaluateWaiter(waiter.revision, waiter.target, waiter.minGeneration)
      if (outcome.kind === 'pending') {
        continue
      }

      this.#waiters.delete(waiter)
      if (outcome.kind === 'resolve') {
        waiter.resolve()
      } else {
        waiter.reject(outcome.reason)
      }
    }
  }

  #settlePredicateWaiters (): void {
    for (const waiter of this.#predicateWaiters) {
      if (waiter.signal?.aborted) {
        this.#predicateWaiters.delete(waiter)
        waiter.reject(createAbortError(`${this.#name}.whenState() aborted while waiting`))
        continue
      }

      if (waiter.predicate(this.#state)) {
        this.#predicateWaiters.delete(waiter)
        waiter.resolve(this.#state)
        continue
      }

      if (this.#state.kind === 'failed') {
        this.#predicateWaiters.delete(waiter)
        waiter.reject(this.#state.error)
      }
    }
  }

  #publish (event: string): void {
    diagnostics.publish({
      event,
      name: this.#name,
      desired: this.#desired,
      revision: this.#intentRevision,
      state: this.#state,
    })
  }
}

export type {
  AsyncLifecycleHooks,
  AsyncLifecycleState,
  LegacyLifecycleState,
}
export {
  AsyncLifecycleController,
}
