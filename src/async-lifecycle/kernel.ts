/**
 * Core lifecycle kernel that centralizes reconciliation, generation fencing, and
 * scoped resource ownership for async start/stop orchestration.
 *
 * This module is private to `src/async-lifecycle` and is shared by both public
 * entry points (`createLifecycle` and `AsyncLifecycle`). It intentionally avoids
 * any EventEmitter dependency; observers are callback- and diagnostics-driven.
 */
import { channel } from 'node:diagnostics_channel'

import {
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
} from './errors.ts'
import type {
  AsyncDisposable,
  Disposable,
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
} from './types.ts'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error?: unknown) => void
}

type AttemptKind = 'start' | 'stop' | 'restart'
type Attempt = {
  kind: AttemptKind
  revision: number
  deferred: Deferred<void>
  settled: boolean
}

type ConditionWaiter = {
  generation: number
  deferred: Deferred<void>
  abortCleanup?: () => void
}

type ConditionRecord = {
  name: string
  setByGeneration: Set<number>
  waiters: Set<ConditionWaiter>
}

type StateWaiter = {
  predicate: (state: LifecycleState) => boolean
  deferred: Deferred<LifecycleState>
  abortCleanup?: () => void
}

const diagnostics = channel('wechaty.async_lifecycle')

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) {
    return signal.reason
  }
  return new Error('Operation aborted')
}

function bindCallerAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise
  }
  if (signal.aborted) {
    return Promise.reject(makeAbortError(signal))
  }
  const deferred = createDeferred<T>()
  const onAbort = () => deferred.reject(makeAbortError(signal))
  signal.addEventListener('abort', onAbort, { once: true })
  promise.then(
    value => deferred.resolve(value),
    error => deferred.reject(error),
  ).finally(() => signal.removeEventListener('abort', onAbort))
  return deferred.promise
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number | undefined,
  name: 'start' | 'stop',
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return operation
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new LifecycleTimeoutError(name, timeoutMs)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

class ScopeImpl implements LifecycleScope {
  readonly signal: AbortSignal

  readonly #abortController: AbortController
  readonly #generation: number
  readonly #kernel: LifecycleKernel

  #retired = false
  #startEntered = false
  #startPromise?: Promise<void>
  #cleanupEntries: Array<() => Promise<void>> = []
  #pendingSet = new Set<Promise<void>>()
  #pendingErrors: unknown[] = []
  #runtimeFailure?: unknown
  #cleanupError?: unknown

  constructor(kernel: LifecycleKernel, generation: number) {
    this.#kernel = kernel
    this.#generation = generation
    this.#abortController = new AbortController()
    this.signal = this.#abortController.signal
  }

  /**
   * Marks that onStart entered for this generation and returns the hook promise.
   */
  setStartPromise(startPromise: Promise<void>): void {
    this.#startEntered = true
    this.#startPromise = startPromise
  }

  get generation(): number {
    return this.#generation
  }

  get retired(): boolean {
    return this.#retired
  }

  get runtimeFailure(): unknown | undefined {
    return this.#runtimeFailure
  }

  get cleanupError(): unknown | undefined {
    return this.#cleanupError
  }

  cleanupComplete(): boolean {
    return this.#cleanupEntries.length === 0 && this.#pendingSet.size === 0
  }

  startEntered(): boolean {
    return this.#startEntered
  }

  abort(reason: unknown): void {
    if (!this.signal.aborted) {
      this.#abortController.abort(reason)
    }
  }

  seal(): void {
    this.#retired = true
  }

  async waitForStartToSettle(): Promise<void> {
    if (this.#startPromise) {
      try {
        await this.#startPromise
      } catch {
        // Start failures are handled by the kernel's transition logic.
      }
    }
  }

  recordCleanupError(error: unknown): void {
    this.#cleanupError = this.#cleanupError
      ? new AggregateError([this.#cleanupError, error], 'Multiple cleanup errors')
      : error
  }

  use<T extends AsyncDisposable | Disposable>(resource: T): T {
    if (typeof resource === 'object' && resource !== null && Symbol.asyncDispose in resource) {
      return this.adopt(resource, async value => {
        const disposable = value as AsyncDisposable
        await disposable[Symbol.asyncDispose]()
      })
    }
    return this.adopt(resource, value => {
      const disposable = value as Disposable
      disposable[Symbol.dispose]()
    })
  }

  adopt<T>(resource: T, release: (resource: T) => void | PromiseLike<void>): T {
    const cleanup = async () => {
      await release(resource)
    }
    this.#registerCleanup(cleanup)
    return resource
  }

  defer(cleanup: () => void | PromiseLike<void>): void {
    this.#registerCleanup(async () => { await cleanup() })
  }

  spawn(task: (signal: AbortSignal) => Promise<void>): void {
    this.#assertOpen()
    const promise = Promise.resolve()
      .then(() => task(this.signal))
      .catch(error => {
        if (!this.signal.aborted || error !== this.signal.reason) {
          this.fail(error)
        }
      })
    this.#registerCleanup(async () => { await promise })
  }

  async start(child: Lifecycle): Promise<void> {
    this.#assertOpen()

    const childState = child.state
    if (
      childState.kind !== 'stopped'
      && !(childState.kind === 'failed' && childState.cleanupComplete)
    ) {
      throw new LifecycleUnsafeStateError(
        `Child lifecycle is not startable from state "${childState.kind}"`,
      )
    }

    this.defer(async () => { await child.stop() })
    await child.start()
    this.spawn(async signal => {
      const settled = await child.whenState(
        state => state.kind === 'failed' || state.kind === 'stopped' || state.kind === 'stopping',
        { signal },
      )
      if (signal.aborted) {
        return
      }
      if (settled.kind === 'failed') {
        this.fail(new Error('Owned child lifecycle failed', { cause: settled.error }))
        return
      }
      this.fail(new Error('Owned child lifecycle exited unexpectedly'))
    })
  }

  set(condition: LifecycleCondition): void {
    if (this.#retired) {
      return
    }
    this.#kernel.setConditionForGeneration(condition.name, this.#generation)
  }

  clear(condition: LifecycleCondition): void {
    if (this.#retired) {
      return
    }
    this.#kernel.clearConditionForGeneration(condition.name, this.#generation)
  }

  fail(error: unknown): void {
    if (this.#retired) {
      return
    }
    this.#runtimeFailure = error
    this.#kernel.failGeneration(this.#generation, error)
  }

  async drainPending(timeoutMs?: number): Promise<unknown[]> {
    if (this.#pendingSet.size === 0) {
      return this.#pendingErrors.splice(0)
    }
    const pending = [...this.#pendingSet]
    for (const promise of pending) {
      try {
        await withTimeout(promise, timeoutMs, 'stop')
        this.#pendingSet.delete(promise)
      } catch (error) {
        if (error instanceof LifecycleTimeoutError) {
          continue
        }
        this.#pendingSet.delete(promise)
        this.#pendingErrors.push(error)
      }
    }
    return this.#pendingErrors.splice(0)
  }

  async unwindLedger(): Promise<unknown[]> {
    const failures: unknown[] = []
    const nextEntries: Array<() => Promise<void>> = []

    while (this.#cleanupEntries.length > 0) {
      const cleanup = this.#cleanupEntries.pop()
      if (!cleanup) {
        continue
      }
      try {
        await cleanup()
      } catch (error) {
        failures.push(error)
        nextEntries.unshift(cleanup)
      }
    }

    this.#cleanupEntries = nextEntries
    return failures
  }

  trackPending(promise: Promise<void>): void {
    this.#pendingSet.add(promise)
    promise.finally(() => {
      if (!this.#pendingSet.has(promise)) {
        return
      }
      this.#pendingSet.delete(promise)
    })
  }

  #registerCleanup(cleanup: () => Promise<void>): void {
    if (!this.#retired) {
      this.#cleanupEntries.push(cleanup)
      return
    }

    const cleanupPromise = cleanup().catch(error => {
      this.recordCleanupError(error)
      throw error
    })
    this.trackPending(cleanupPromise)
    throw makeAbortError(this.signal)
  }

  #assertOpen(): void {
    if (!this.#retired) {
      return
    }
    throw makeAbortError(this.signal)
  }
}

/**
 * Private lifecycle engine used by both public entry points.
 */
export class LifecycleKernel implements LifecycleController {
  readonly #hooks: LifecycleHooks
  readonly #options: LifecycleOptions

  #state: LifecycleState = Object.freeze({ kind: 'stopped', generation: 0 })
  #stateRevision = 0
  #intentRevision = 0
  #desired: 'running' | 'stopped' = 'stopped'
  #generationCounter = 0
  #activeScope?: ScopeImpl
  #reconciler?: Promise<void>
  #reconcileRequested = false
  #lastAcceptedRecoveryRevision = -1

  #conditions = new Map<string, ConditionRecord>()
  #stateWaiters = new Set<StateWaiter>()
  #stateRevisionBySnapshot = new WeakMap<LifecycleState, number>()

  #startAttempt?: Attempt
  #stopAttempt?: Attempt
  #restartAttempt?: Attempt

  constructor(hooks: LifecycleHooks, options?: LifecycleOptions) {
    this.#hooks = hooks
    this.#options = options ?? {}
    this.#stateRevisionBySnapshot.set(this.#state, this.#stateRevision)
  }

  get state(): LifecycleState {
    return this.#state
  }

  start(options?: LifecycleCallOptions): Promise<void> {
    if (options?.signal?.aborted) {
      return Promise.reject(makeAbortError(options.signal))
    }

    if (this.#startAttempt && !this.#startAttempt.settled && this.#desired === 'running') {
      return bindCallerAbort(this.#startAttempt.deferred.promise, options?.signal)
    }

    if (this.#state.kind === 'running' && this.#desired === 'running') {
      return bindCallerAbort(Promise.resolve(), options?.signal)
    }

    this.#intentRevision++
    this.#desired = 'running'
    this.#supersedeAttempt(this.#stopAttempt)
    this.#stopAttempt = undefined

    this.#startAttempt = this.#createAttempt('start', this.#intentRevision)
    this.#requestReconcile()
    return bindCallerAbort(this.#startAttempt.deferred.promise, options?.signal)
  }

  stop(options?: LifecycleCallOptions): Promise<void> {
    if (options?.signal?.aborted) {
      return Promise.reject(makeAbortError(options.signal))
    }

    if (this.#stopAttempt && !this.#stopAttempt.settled && this.#desired === 'stopped') {
      return bindCallerAbort(this.#stopAttempt.deferred.promise, options?.signal)
    }

    if (this.#state.kind === 'stopped' && this.#desired === 'stopped') {
      return bindCallerAbort(Promise.resolve(), options?.signal)
    }

    this.#intentRevision++
    this.#desired = 'stopped'
    this.#activeScope?.abort(new LifecycleSupersededError('Lifecycle stop requested'))

    this.#supersedeAttempt(this.#startAttempt)
    this.#supersedeAttempt(this.#restartAttempt)
    this.#startAttempt = undefined
    this.#restartAttempt = undefined

    this.#stopAttempt = this.#createAttempt('stop', this.#intentRevision)
    this.#requestReconcile()
    return bindCallerAbort(this.#stopAttempt.deferred.promise, options?.signal)
  }

  restart(options?: LifecycleCallOptions): Promise<void> {
    if (options?.signal?.aborted) {
      return Promise.reject(makeAbortError(options.signal))
    }

    if (this.#restartAttempt && !this.#restartAttempt.settled) {
      return bindCallerAbort(this.#restartAttempt.deferred.promise, options?.signal)
    }

    this.#intentRevision++
    this.#desired = 'running'
    this.#activeScope?.abort(new LifecycleSupersededError('Lifecycle restart requested'))

    this.#supersedeAttempt(this.#stopAttempt)
    this.#stopAttempt = undefined
    this.#restartAttempt = this.#createAttempt('restart', this.#intentRevision)
    this.#requestReconcile()
    return bindCallerAbort(this.#restartAttempt.deferred.promise, options?.signal)
  }

  whenState(
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    if (options?.signal?.aborted) {
      return Promise.reject(makeAbortError(options.signal))
    }

    try {
      if (predicate(this.#state)) {
        return Promise.resolve(this.#state)
      }
    } catch (error) {
      return Promise.reject(error)
    }

    const deferred = createDeferred<LifecycleState>()
    const waiter: StateWaiter = { predicate, deferred }
    if (options?.signal) {
      const signal = options.signal
      const onAbort = () => {
        this.#stateWaiters.delete(waiter)
        deferred.reject(makeAbortError(signal))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      waiter.abortCleanup = () => signal.removeEventListener('abort', onAbort)
    }
    this.#stateWaiters.add(waiter)
    return deferred.promise
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.stop()
  }

  condition(name: string): LifecycleCondition {
    if (!this.#conditions.has(name)) {
      this.#conditions.set(name, {
        name,
        setByGeneration: new Set<number>(),
        waiters: new Set<ConditionWaiter>(),
      })
    }

    return {
      name,
      wait: options => this.#waitCondition(name, options),
    }
  }

  async recover(observed: LifecycleState): Promise<'recovered' | 'superseded'> {
    if (observed !== this.#state) {
      return 'superseded'
    }
    if (this.#state.kind !== 'failed') {
      return 'superseded'
    }

    const observedRevision = this.#stateRevisionBySnapshot.get(observed)
    if (observedRevision === undefined || observedRevision !== this.#stateRevision) {
      return 'superseded'
    }
    if (this.#lastAcceptedRecoveryRevision === this.#intentRevision) {
      return 'superseded'
    }

    this.#lastAcceptedRecoveryRevision = this.#intentRevision
    this.#desired = 'running'
    this.#requestReconcile()

    const nextState = await this.whenState(
      state => state.kind === 'running' || state.kind === 'failed',
    )
    return nextState.kind === 'running' ? 'recovered' : 'superseded'
  }

  setConditionForGeneration(name: string, generation: number): void {
    const condition = this.#conditions.get(name)
    if (!condition) {
      return
    }
    condition.setByGeneration.add(generation)

    for (const waiter of [...condition.waiters]) {
      if (waiter.generation !== generation) {
        continue
      }
      condition.waiters.delete(waiter)
      waiter.abortCleanup?.()
      waiter.deferred.resolve()
    }
  }

  clearConditionForGeneration(name: string, generation: number): void {
    const condition = this.#conditions.get(name)
    if (!condition) {
      return
    }
    condition.setByGeneration.delete(generation)
  }

  failGeneration(generation: number, _error: unknown): void {
    if (this.#activeScope?.generation !== generation) {
      return
    }
    this.#requestReconcile()
  }

  #createAttempt(kind: AttemptKind, revision: number): Attempt {
    return {
      kind,
      revision,
      deferred: createDeferred<void>(),
      settled: false,
    }
  }

  #settleAttemptSuccess(attempt: Attempt | undefined): void {
    if (!attempt || attempt.settled) {
      return
    }
    attempt.settled = true
    attempt.deferred.resolve()
  }

  #settleAttemptFailure(attempt: Attempt | undefined, error: unknown): void {
    if (!attempt || attempt.settled) {
      return
    }
    attempt.settled = true
    attempt.deferred.reject(error)
  }

  #supersedeAttempt(attempt: Attempt | undefined): void {
    this.#settleAttemptFailure(attempt, new LifecycleSupersededError())
  }

  #requestReconcile(): void {
    this.#reconcileRequested = true
    if (this.#reconciler) {
      return
    }
    this.#reconciler = this.#reconcileLoop()
      .catch(error => {
        this.#settleAttemptFailure(this.#startAttempt, error)
        this.#settleAttemptFailure(this.#stopAttempt, error)
        this.#settleAttemptFailure(this.#restartAttempt, error)
      })
      .finally(() => {
        this.#reconciler = undefined
        if (this.#reconcileRequested) {
          this.#requestReconcile()
        }
      })
  }

  async #reconcileLoop(): Promise<void> {
    while (this.#reconcileRequested) {
      this.#reconcileRequested = false
      await this.#reconcileStep()
    }
  }

  async #reconcileStep(): Promise<void> {
    const runtimeFailure = this.#activeScope?.runtimeFailure
    if (runtimeFailure && this.#activeScope) {
      await this.#retireActiveScope({
        phase: 'run',
        cause: runtimeFailure,
      })
      return
    }

    if (this.#desired === 'stopped') {
      if (this.#activeScope) {
        await this.#retireActiveScope({
          phase: 'stop',
        })
      } else if (this.#state.kind !== 'stopped') {
        this.#commitState(Object.freeze({
          kind: 'stopped',
          generation: this.#generationCounter,
        }))
      }
      this.#settleAttemptSuccess(this.#stopAttempt)
      this.#stopAttempt = undefined
      return
    }

    if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
      this.#settleAttemptFailure(
        this.#startAttempt,
        new LifecycleUnsafeStateError('Cannot start while failed cleanup remains'),
      )
      this.#settleAttemptFailure(
        this.#restartAttempt,
        new LifecycleUnsafeStateError('Cannot restart while failed cleanup remains'),
      )
      this.#startAttempt = undefined
      this.#restartAttempt = undefined
      return
    }

    if (this.#state.kind === 'running') {
      this.#settleAttemptSuccess(this.#startAttempt)
      this.#settleAttemptSuccess(this.#restartAttempt)
      this.#startAttempt = undefined
      this.#restartAttempt = undefined
      return
    }

    if (this.#activeScope) {
      await this.#retireActiveScope({ phase: 'stop' })
      return
    }

    await this.#beginStart()
  }

  async #beginStart(): Promise<void> {
    const generation = ++this.#generationCounter
    const scope = new ScopeImpl(this, generation)
    this.#activeScope = scope

    this.#commitState(Object.freeze({
      kind: 'starting',
      generation,
    }))

    const startPromise = Promise.resolve().then(() => this.#hooks.onStart(scope))
    scope.setStartPromise(startPromise)

    let startError: unknown
    try {
      await withTimeout(startPromise, this.#options.startTimeoutMs, 'start')
    } catch (error) {
      startError = error
    }

    if (this.#activeScope !== scope) {
      return
    }

    if (startError) {
      scope.abort(startError)
      if (startError instanceof LifecycleTimeoutError) {
        scope.trackPending(startPromise)
      }
      await this.#retireActiveScope({ phase: 'start', cause: startError })
      return
    }

    if (this.#desired !== 'running') {
      await this.#retireActiveScope({
        phase: 'stop',
        cause: new LifecycleSupersededError(),
      })
      return
    }

    const runtimeFailure = scope.runtimeFailure
    if (runtimeFailure) {
      await this.#retireActiveScope({
        phase: 'run',
        cause: runtimeFailure,
      })
      return
    }

    this.#settleAttemptSuccess(this.#startAttempt)
    this.#settleAttemptSuccess(this.#restartAttempt)
    this.#startAttempt = undefined
    this.#restartAttempt = undefined
    this.#commitState(Object.freeze({
      kind: 'running',
      generation,
    }))
  }

  async #retireActiveScope(options: { phase: 'start' | 'run' | 'stop'; cause?: unknown }): Promise<void> {
    const scope = this.#activeScope
    if (!scope) {
      return
    }

    this.#commitState(Object.freeze({
      kind: 'stopping',
      generation: scope.generation,
    }))
    scope.seal()

    const shouldRunOnStop = scope.startEntered()
    if (shouldRunOnStop && this.#hooks.onStop) {
      const stopPromise = Promise.resolve().then(() => this.#hooks.onStop?.(scope))
      try {
        await withTimeout(stopPromise, this.#options.stopTimeoutMs, 'stop')
      } catch (error) {
        if (error instanceof LifecycleTimeoutError) {
          scope.trackPending(stopPromise)
        } else {
          scope.recordCleanupError(error)
        }
      }
    }

    scope.abort(options.cause ?? new LifecycleSupersededError('Lifecycle retiring generation'))
    await scope.waitForStartToSettle()

    const unwindErrors = await scope.unwindLedger()
    for (const error of unwindErrors) {
      scope.recordCleanupError(error)
    }
    const pendingErrors = await scope.drainPending(this.#options.stopTimeoutMs)
    for (const error of pendingErrors) {
      scope.recordCleanupError(error)
    }

    this.#activeScope = scope.cleanupComplete() ? undefined : scope

    const cleanupComplete = scope.cleanupComplete()
    const cleanupError = scope.cleanupError

    if (options.phase === 'stop' && cleanupComplete) {
      this.#commitState(Object.freeze({
        kind: 'stopped',
        generation: scope.generation,
      }))
      this.#settleAttemptSuccess(this.#stopAttempt)
      this.#stopAttempt = undefined
      return
    }

    const phase = options.phase
    const error = options.cause ?? scope.cleanupError ?? new Error('Lifecycle failed')
    this.#commitState(Object.freeze({
      kind: 'failed',
      generation: scope.generation,
      phase,
      error,
      cleanupComplete,
      ...(cleanupError ? { cleanupError } : {}),
    }))

    if (phase === 'stop' && cleanupComplete) {
      this.#settleAttemptSuccess(this.#stopAttempt)
      this.#stopAttempt = undefined
      return
    }

    if (phase === 'stop') {
      this.#settleAttemptFailure(this.#stopAttempt, error)
      this.#stopAttempt = undefined
      return
    }

    this.#settleAttemptFailure(this.#startAttempt, error)
    this.#settleAttemptFailure(this.#restartAttempt, error)
    this.#startAttempt = undefined
    this.#restartAttempt = undefined
  }

  #waitCondition(name: string, options?: LifecycleCallOptions): Promise<void> {
    if (options?.signal?.aborted) {
      return Promise.reject(makeAbortError(options.signal))
    }

    const condition = this.#conditions.get(name)
    if (!condition) {
      return Promise.reject(new Error(`Unknown lifecycle condition: ${name}`))
    }

    const generation = this.#boundConditionGeneration()
    if (condition.setByGeneration.has(generation)) {
      return Promise.resolve()
    }

    const waiter: ConditionWaiter = {
      generation,
      deferred: createDeferred<void>(),
    }

    if (options?.signal) {
      const signal = options.signal
      const onAbort = () => {
        condition.waiters.delete(waiter)
        waiter.deferred.reject(makeAbortError(signal))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      waiter.abortCleanup = () => signal.removeEventListener('abort', onAbort)
    }

    condition.waiters.add(waiter)
    return waiter.deferred.promise
  }

  #boundConditionGeneration(): number {
    if (this.#state.kind === 'starting' || this.#state.kind === 'running') {
      return this.#state.generation
    }
    return this.#generationCounter + 1
  }

  #commitState(next: LifecycleState): void {
    const previous = this.#state
    this.#state = Object.freeze(next)
    this.#stateRevision++
    this.#stateRevisionBySnapshot.set(this.#state, this.#stateRevision)

    this.#settleConditionWaiters(previous, this.#state)
    this.#settleStateWaiters()

    try {
      this.#hooks.onStateChange?.(this.#state, previous)
    } catch {
      // Observer exceptions are isolated from reconciliation outcomes.
    }

    if (diagnostics.hasSubscribers) {
      diagnostics.publish({
        name: this.#options.name ?? 'Lifecycle',
        previous,
        state: this.#state,
      })
    }
  }

  #settleStateWaiters(): void {
    for (const waiter of [...this.#stateWaiters]) {
      try {
        if (!waiter.predicate(this.#state)) {
          continue
        }
        this.#stateWaiters.delete(waiter)
        waiter.abortCleanup?.()
        waiter.deferred.resolve(this.#state)
      } catch (error) {
        this.#stateWaiters.delete(waiter)
        waiter.abortCleanup?.()
        waiter.deferred.reject(error)
      }
    }
  }

  #settleConditionWaiters(previous: LifecycleState, next: LifecycleState): void {
    const retiredGeneration = previous.generation
    const generationRetired = (
      (previous.kind === 'starting' || previous.kind === 'running' || previous.kind === 'stopping')
      && (next.kind === 'failed' || next.kind === 'stopped')
      && next.generation === retiredGeneration
    )

    for (const condition of this.#conditions.values()) {
      if (generationRetired) {
        for (const waiter of [...condition.waiters]) {
          if (waiter.generation !== retiredGeneration) {
            continue
          }
          condition.waiters.delete(waiter)
          waiter.abortCleanup?.()
          waiter.deferred.reject(
            next.kind === 'failed'
              ? new Error(`Condition "${condition.name}" rejected by failed generation`, { cause: next.error })
              : new LifecycleSupersededError(`Condition "${condition.name}" not met before generation retired`),
          )
        }
      }

      if (!condition.setByGeneration.has(next.generation)) {
        continue
      }
      for (const waiter of [...condition.waiters]) {
        if (waiter.generation !== next.generation) {
          continue
        }
        condition.waiters.delete(waiter)
        waiter.abortCleanup?.()
        waiter.deferred.resolve()
      }
    }
  }
}
