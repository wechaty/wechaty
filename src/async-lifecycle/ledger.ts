/**
 * Per-generation unified resource, listener, background-task, and child-lifecycle ledger.
 *
 * Architectural boundary:
 * - Implements pre-accounted `acquire()`, `use()`, `defer()`, `listen()`, `spawn()`, and
 *   exclusive child tracking within one strict LIFO registration stack.
 * - Executes dependency-safe two-phase retirement:
 *   1. `seal()` closes new admissions.
 *   2. `interruptAll()` invokes synchronous `interrupt(resource)` callbacks in LIFO order
 *      immediately upon `scope.signal` abort—BEFORE background tasks or in-flight startup
 *      work are joined—so blocked stream/socket loops wake up without deadlocking.
 *   3. `unwind(deadlineSignal)` joins tasks and releases resources in strict LIFO order,
 *      continuing past disposer throws while preserving failed disposers and timed-out
 *      in-flight promises in unresolved debt so a subsequent `stop()` retries/completes
 *      cleanup without double-invoking still-running disposers.
 */

import {
  getAbortReason,
  isCooperativeAbortError,
  settleBeforeDeadline,
} from './cancellable-wait.ts'
import type {
  AcquireOptions,
  EventEmitterLike,
  EventTargetLike,
  Lifecycle,
  ListenTarget,
  SpawnOptions,
} from './types.ts'

type ResourceEntry<T = unknown> = {
  readonly kind: 'resource'
  readonly label: string
  status: 'acquiring' | 'ready' | 'released'
  resource: T | undefined
  hasResource: boolean
  readonly interrupt: ((resource: T) => void | PromiseLike<void>) | undefined
  readonly release: (resource: T) => void | PromiseLike<void>
  acquiringPromise: Promise<void> | undefined
  releasingPromise: Promise<void> | undefined
  pendingLateError: unknown
  hasPendingLateError: boolean
}

type TaskEntry = {
  readonly kind: 'task'
  readonly label: string
  status: 'running' | 'settled'
  promise: Promise<void>
  unexpectedShutdownError: unknown
  hasUnexpectedShutdownError: boolean
}

type LedgerEntry = ResourceEntry<any> | TaskEntry

export interface UnwindResult {
  readonly cleanupComplete: boolean
  readonly errors: readonly unknown[]
}

export interface LedgerCallbacks {
  /** Invoked when a background `spawn()` task rejects unexpectedly while the generation is active. */
  onActiveTaskFailure (error: unknown): void
  /**
   * Invoked if a late registration after retirement fails its immediate release after the
   * generation had already committed clean `stopped`, allowing the kernel to surface the debt.
   */
  onPostRetirementDebt (error: unknown): void
}

function isEventEmitterLike (target: ListenTarget): target is EventEmitterLike {
  return (
    typeof target === 'object'
    && target !== null
    && 'on' in target
    && typeof target.on === 'function'
    && (
      ('off' in target && typeof target.off === 'function')
      || ('removeListener' in target && typeof target.removeListener === 'function')
    )
  )
}

function isEventTargetLike (target: ListenTarget): target is EventTargetLike {
  return (
    typeof target === 'object'
    && target !== null
    && 'addEventListener' in target
    && typeof target.addEventListener === 'function'
    && 'removeEventListener' in target
    && typeof target.removeEventListener === 'function'
  )
}

/**
 * Unified LIFO ownership ledger for a single lifecycle generation.
 */
export class GenerationLedger {
  readonly #abortController = new AbortController()
  readonly #entries: LedgerEntry[] = []
  readonly #callbacks: LedgerCallbacks
  #sealed = false
  #sealReason: unknown = undefined
  #interruptRan = false
  #interruptErrors: unknown[] = []
  /** Tracks an `onStart` promise that outlived a deadline so `hasUnresolvedDebt` stays accurate. */
  #inFlightStartPromise: Promise<void> | undefined = undefined
  /** Tracks an `onStop` promise that outlived `stopTimeoutMs` so retry `stop()` joins it first. */
  #inFlightStopPromise: Promise<void> | undefined = undefined
  #retiredCleanly = false

  constructor (callbacks: LedgerCallbacks) {
    this.#callbacks = callbacks
  }

  /** Cooperative cancellation signal for this generation. */
  get signal (): AbortSignal {
    return this.#abortController.signal
  }

  /** `true` once retirement has closed new admissions on this generation. */
  get isSealed (): boolean {
    return this.#sealed
  }

  /**
   * `true` when any hook (`onStart` / `onStop`), background `spawn()` task, in-flight
   * `acquire()`, or unreleased resource/disposer remains unfinished.
   */
  get hasUnresolvedDebt (): boolean {
    if (this.#inFlightStartPromise !== undefined || this.#inFlightStopPromise !== undefined) {
      return true
    }
    for (const entry of this.#entries) {
      if (entry.kind === 'resource' && entry.status !== 'released') {
        return true
      }
      if (entry.kind === 'task' && entry.status !== 'settled') {
        return true
      }
    }
    return false
  }

  /**
   * Tracks `onStart` execution so an uncooperative startup hook that outlives `stopTimeoutMs`
   * blocks new generations until it actually settles.
   */
  trackStartExecution (promise: Promise<void>): void {
    const tracked = promise.then(
      () => {
        if (this.#inFlightStartPromise === tracked) {
          this.#inFlightStartPromise = undefined
        }
      },
      () => {
        if (this.#inFlightStartPromise === tracked) {
          this.#inFlightStartPromise = undefined
        }
      },
    )
    this.#inFlightStartPromise = tracked
  }

  /**
   * Awaits any in-flight `onStart` execution up to `deadlineSignal`.
   */
  async joinStartExecution (deadlineSignal: AbortSignal): Promise<{
    readonly settled: boolean
    readonly timeoutReason?: unknown
  }> {
    if (!this.#inFlightStartPromise) {
      return { settled: true }
    }
    const result = await settleBeforeDeadline(this.#inFlightStartPromise, deadlineSignal)
    if (result.timedOut) {
      return { settled: false, timeoutReason: result.timeoutReason }
    }
    return { settled: true }
  }

  /**
   * Runs or joins an already-started graceful `onStop` execution up to `deadlineSignal`.
   */
  async runOrJoinStopHook (
    invokeOnStop: (() => Promise<void> | void) | undefined,
    deadlineSignal: AbortSignal,
  ): Promise<{
    readonly settled: boolean
    readonly hookError?: unknown
    readonly hasHookError: boolean
    readonly timeoutReason?: unknown
  }> {
    if (!this.#inFlightStopPromise && !invokeOnStop) {
      return { settled: true, hasHookError: false }
    }

    let hookFailed = false
    let hookError: unknown

    if (!this.#inFlightStopPromise && invokeOnStop) {
      const rawPromise = (async () => {
        await invokeOnStop()
      })()
      const tracked = rawPromise.then(
        () => {
          if (this.#inFlightStopPromise === tracked) {
            this.#inFlightStopPromise = undefined
          }
        },
        (err: unknown) => {
          if (this.#inFlightStopPromise === tracked) {
            this.#inFlightStopPromise = undefined
          }
          throw err
        },
      )
      this.#inFlightStopPromise = tracked
    }

    const activeStop = this.#inFlightStopPromise
    if (!activeStop) {
      return { settled: true, hasHookError: false }
    }

    const race = await settleBeforeDeadline(activeStop, deadlineSignal)
    if (race.timedOut) {
      return {
        settled: false,
        hasHookError: false,
        timeoutReason: race.timeoutReason,
      }
    }
    if (race.status === 'rejected') {
      hookFailed = true
      hookError = race.error
    }
    return {
      settled: true,
      hasHookError: hookFailed,
      ...(hookFailed ? { hookError } : {}),
    }
  }

  /**
   * Step 1 of retirement: closes the scope to new registrations without aborting `signal` yet
   * (preserving live resources during graceful `onStop`).
   */
  seal (reason: unknown): void {
    if (this.#sealed) {
      return
    }
    this.#sealed = true
    this.#sealReason = reason
  }

  /**
   * Step 3 & 4 of retirement: aborts `scope.signal` (if not already aborted) and invokes
   * every currently acquired resource's `interrupt(resource)` hook once in LIFO order.
   */
  async abortAndInterrupt (
    deadlineSignal: AbortSignal,
    reason?: unknown,
  ): Promise<{ readonly timedOut: boolean; readonly timeoutReason?: unknown }> {
    if (!this.#sealed) {
      this.seal(reason)
    }
    const effectiveReason = reason ?? this.#sealReason ?? new DOMException(
      'Lifecycle generation retired',
      'AbortError',
    )
    if (!this.#abortController.signal.aborted) {
      this.#abortController.abort(effectiveReason)
    }
    if (this.#interruptRan) {
      return { timedOut: false }
    }
    this.#interruptRan = true

    for (let index = this.#entries.length - 1; index >= 0; index--) {
      const entry = this.#entries[index]!
      if (
        entry.kind === 'resource'
        && entry.status === 'ready'
        && entry.hasResource
        && entry.interrupt
      ) {
        const interruptFn = entry.interrupt
        const resourceVal = entry.resource
        const interruptPromise = (async () => {
          await interruptFn(resourceVal)
        })()
        const race = await settleBeforeDeadline(interruptPromise, deadlineSignal)
        if (race.timedOut) {
          return { timedOut: true, timeoutReason: race.timeoutReason }
        }
        if (race.status === 'rejected') {
          this.#interruptErrors.push(race.error)
        }
      }
    }
    return { timedOut: false }
  }

  /**
   * Pre-accounted asynchronous resource acquisition (`scope.acquire`).
   */
  async acquire<T> (
    create: (signal: AbortSignal) => T | PromiseLike<T>,
    release: (resource: T) => void | PromiseLike<void>,
    options?: AcquireOptions<T>,
  ): Promise<T> {
    if (typeof create !== 'function' || typeof release !== 'function') {
      throw new TypeError('scope.acquire(create, release) requires create and release functions')
    }
    if (this.#sealed) {
      throw this.#currentAbortReason()
    }

    const entry: ResourceEntry<T> = {
      kind: 'resource',
      label: options?.name ?? 'acquire',
      status: 'acquiring',
      resource: undefined,
      hasResource: false,
      interrupt: options?.interrupt,
      release,
      acquiringPromise: undefined,
      releasingPromise: undefined,
      pendingLateError: undefined,
      hasPendingLateError: false,
    }
    this.#entries.push(entry)

    let createdResource!: T
    let createSucceeded = false
    let createError: unknown

    const settleAcquisition = (async () => {
      try {
        createdResource = await create(this.#abortController.signal)
        createSucceeded = true
      } catch (err) {
        createError = err
      } finally {
        entry.acquiringPromise = undefined
      }

      if (!createSucceeded) {
        entry.status = 'released'
        return
      }

      entry.resource = createdResource
      entry.hasResource = true
      entry.status = 'ready'

      // If retirement sealed the ledger while `create(signal)` was in flight, immediately
      // interrupt and release the late-arriving resource before rejecting the caller.
      if (this.#sealed) {
        if (entry.interrupt) {
          try {
            await entry.interrupt(createdResource)
          } catch (interruptErr) {
            this.#recordLateReleaseError(entry, interruptErr)
          }
        }
        await this.#startOrJoinResourceRelease(entry)
      }
    })()

    entry.acquiringPromise = settleAcquisition
    await settleAcquisition

    if (!createSucceeded) {
      throw createError
    }
    if (this.#sealed) {
      throw this.#currentAbortReason()
    }
    return createdResource
  }

  /**
   * Registers an `AsyncDisposable` or `Disposable` in LIFO order (`scope.use`).
   */
  use<T extends AsyncDisposable | Disposable> (resource: T): T {
    if (
      (typeof resource !== 'object' && typeof resource !== 'function')
      || resource === null
    ) {
      throw new TypeError('scope.use(resource) requires a non-null Disposable or AsyncDisposable object')
    }

    const asyncDispose = (resource as Partial<AsyncDisposable>)[Symbol.asyncDispose]
    const syncDispose = (resource as Partial<Disposable>)[Symbol.dispose]
    if (typeof asyncDispose !== 'function' && typeof syncDispose !== 'function') {
      throw new TypeError(
        'scope.use(resource) requires [Symbol.asyncDispose] or [Symbol.dispose]',
      )
    }

    const releaseFn = typeof asyncDispose === 'function'
      ? async (target: T) => {
        await asyncDispose.call(target)
      }
      : (target: T) => {
        syncDispose!.call(target)
      }

    this.#registerImmediateResource('use', resource, releaseFn)
    return resource
  }

  /**
   * Registers a sync/async cleanup callback in LIFO order (`scope.defer`).
   */
  defer (cleanup: () => void | PromiseLike<void>): void {
    if (typeof cleanup !== 'function') {
      throw new TypeError('scope.defer(cleanup) requires a cleanup function')
    }
    this.#registerImmediateResource('defer', undefined, () => cleanup())
  }

  /**
   * Attaches an event listener to an `EventEmitter`-like or `EventTarget`-like object and
   * schedules LIFO detachment (`scope.listen`).
   */
  listen (
    target: ListenTarget,
    event: string,
    listener: (...args: any[]) => void,
  ): void {
    if (typeof event !== 'string' || event.length === 0) {
      throw new TypeError('scope.listen(target, event, listener) requires a non-empty event name')
    }
    if (typeof listener !== 'function') {
      throw new TypeError('scope.listen(target, event, listener) requires a listener function')
    }

    if (isEventEmitterLike(target)) {
      if (this.#sealed) {
        throw this.#currentAbortReason()
      }
      target.on(event, listener)
      this.defer(() => {
        if (typeof target.off === 'function') {
          target.off(event, listener)
        } else if (typeof target.removeListener === 'function') {
          target.removeListener(event, listener)
        }
      })
      return
    }

    if (isEventTargetLike(target)) {
      if (this.#sealed) {
        throw this.#currentAbortReason()
      }
      target.addEventListener(event, listener)
      this.defer(() => {
        target.removeEventListener(event, listener)
      })
      return
    }

    throw new TypeError(
      'scope.listen() target must implement on/off (or removeListener) or addEventListener/removeEventListener',
    )
  }

  /**
   * Spawns a generation-owned background task (`scope.spawn`).
   */
  spawn (
    task: (signal: AbortSignal) => Promise<void>,
    options?: SpawnOptions,
  ): void {
    if (typeof task !== 'function') {
      throw new TypeError('scope.spawn(task) requires a task function')
    }
    if (this.#sealed) {
      throw this.#currentAbortReason()
    }

    const entry: TaskEntry = {
      kind: 'task',
      label: options?.name ?? 'spawn',
      status: 'running',
      promise: Promise.resolve(),
      unexpectedShutdownError: undefined,
      hasUnexpectedShutdownError: false,
    }

    const runPromise = (async () => {
      try {
        await task(this.#abortController.signal)
      } catch (err) {
        if (isCooperativeAbortError(err, this.#abortController.signal)) {
          return
        }
        if (!this.#sealed) {
          entry.status = 'settled'
          this.#callbacks.onActiveTaskFailure(err)
          return
        }
        entry.unexpectedShutdownError = err
        entry.hasUnexpectedShutdownError = true
      } finally {
        entry.status = 'settled'
      }
    })()

    entry.promise = runPromise
    this.#entries.push(entry)
  }

  /**
   * Pre-registers an owned child `Lifecycle` in LIFO order before `child.start()` runs, so
   * even a superseded/failed child startup is guaranteed to call `child.stop()` during unwind.
   */
  registerChild (
    child: Lifecycle,
    disarmWatcher: () => void,
  ): void {
    if (this.#sealed) {
      disarmWatcher()
      throw this.#currentAbortReason()
    }

    const entry: ResourceEntry<Lifecycle> = {
      kind: 'resource',
      label: 'child',
      status: 'ready',
      resource: child,
      hasResource: true,
      interrupt: () => {
        // Disarm the unexpected-exit watcher BEFORE stopping the child so parent-requested
        // retirement is never misclassified as an unrequested child stop.
        disarmWatcher()
      },
      release: async ownedChild => {
        disarmWatcher()
        await ownedChild.stop()
      },
      acquiringPromise: undefined,
      releasingPromise: undefined,
      pendingLateError: undefined,
      hasPendingLateError: false,
    }
    this.#entries.push(entry)
  }

  /**
   * Step 5 of retirement: walks all ledger entries in strict LIFO order, joining in-flight
   * acquisitions/tasks and releasing resources up to `deadlineSignal`.
   *
   * Behavioral guarantees:
   * - Continues unwinding earlier resources when a disposer throws.
   * - Stops and preserves remaining debt if `deadlineSignal` expires mid-unwind so a
   *   still-running higher-level task/disposer never has lower-level dependencies torn out
   *   from underneath it, and never double-invokes an already in-flight disposer on retry.
   */
  async unwind (deadlineSignal: AbortSignal): Promise<UnwindResult> {
    const errors: unknown[] = []
    if (this.#interruptErrors.length > 0) {
      errors.push(...this.#interruptErrors)
      this.#interruptErrors = []
    }

    for (let index = this.#entries.length - 1; index >= 0; index--) {
      const entry = this.#entries[index]!

      if (entry.kind === 'task') {
        if (entry.status !== 'settled') {
          const race = await settleBeforeDeadline(entry.promise, deadlineSignal)
          if (race.timedOut) {
            errors.push(race.timeoutReason)
            return { cleanupComplete: false, errors }
          }
        }
        if (entry.hasUnexpectedShutdownError) {
          errors.push(entry.unexpectedShutdownError)
          entry.hasUnexpectedShutdownError = false
          entry.unexpectedShutdownError = undefined
        }
        continue
      }

      if (entry.status === 'released') {
        continue
      }

      if (entry.acquiringPromise) {
        const acqRace = await settleBeforeDeadline(entry.acquiringPromise, deadlineSignal)
        if (acqRace.timedOut) {
          errors.push(acqRace.timeoutReason)
          return { cleanupComplete: false, errors }
        }
      }

      if (entry.hasPendingLateError) {
        errors.push(entry.pendingLateError)
        entry.hasPendingLateError = false
        entry.pendingLateError = undefined
        // Note: if `status` is still `'ready'`, the late release threw before completing;
        // do NOT re-invoke in the exact same unwind pass—leave `'ready'` for explicit retry `stop()`.
        continue
      }

      if (this.#isResourceReleased(entry)) {
        continue
      }

      const releasePromise = this.#startOrJoinResourceRelease(entry)
      const relRace = await settleBeforeDeadline(releasePromise, deadlineSignal)
      if (relRace.timedOut) {
        errors.push(relRace.timeoutReason)
        return { cleanupComplete: false, errors }
      }
      if (entry.hasPendingLateError) {
        errors.push(entry.pendingLateError)
        entry.hasPendingLateError = false
        entry.pendingLateError = undefined
      }
    }

    const cleanupComplete = !this.hasUnresolvedDebt
    this.#retiredCleanly = cleanupComplete
    return { cleanupComplete, errors }
  }

  #registerImmediateResource<T> (
    label: string,
    resource: T,
    release: (resource: T) => void | PromiseLike<void>,
  ): void {
    const entry: ResourceEntry<T> = {
      kind: 'resource',
      label,
      status: 'ready',
      resource,
      hasResource: true,
      interrupt: undefined,
      release,
      acquiringPromise: undefined,
      releasingPromise: undefined,
      pendingLateError: undefined,
      hasPendingLateError: false,
    }
    this.#entries.push(entry)

    if (this.#sealed) {
      const wasRetiredCleanly = this.#retiredCleanly
      this.#retiredCleanly = false
      void this.#startOrJoinResourceRelease(entry).then(() => {
        if (wasRetiredCleanly && entry.hasPendingLateError) {
          const lateErr = entry.pendingLateError
          entry.hasPendingLateError = false
          entry.pendingLateError = undefined
          this.#callbacks.onPostRetirementDebt(lateErr)
        }
      })
      throw this.#currentAbortReason()
    }
  }

  #isResourceReleased<T> (entry: ResourceEntry<T>): boolean {
    return entry.status === 'released'
  }

  #startOrJoinResourceRelease<T> (entry: ResourceEntry<T>): Promise<void> {
    if (entry.status === 'released') {
      return Promise.resolve()
    }
    if (entry.releasingPromise) {
      return entry.releasingPromise
    }

    let settleRelease!: () => void
    const promise = new Promise<void>(resolve => {
      settleRelease = resolve
    })
    entry.releasingPromise = promise

    const completeRelease = (): void => {
      if (entry.releasingPromise === promise) {
        entry.releasingPromise = undefined
      }
      settleRelease()
    }

    try {
      Promise.resolve(entry.release(entry.resource as T)).then(
        () => {
          entry.status = 'released'
          entry.resource = undefined
          entry.hasResource = false
          completeRelease()
        },
        err => {
          this.#recordLateReleaseError(entry, err)
          completeRelease()
        },
      )
    } catch (err) {
      this.#recordLateReleaseError(entry, err)
      completeRelease()
    }

    return promise
  }

  #recordLateReleaseError<T> (entry: ResourceEntry<T>, error: unknown): void {
    entry.status = 'ready'
    if (!entry.hasPendingLateError) {
      entry.pendingLateError = error
      entry.hasPendingLateError = true
    } else {
      entry.pendingLateError = new AggregateError(
        [ entry.pendingLateError, error ],
        'Multiple errors occurred while releasing lifecycle resource',
      )
    }
  }

  #currentAbortReason (): unknown {
    if (this.#abortController.signal.aborted) {
      return getAbortReason(this.#abortController.signal)
    }
    if (this.#sealReason !== undefined) {
      return this.#sealReason
    }
    return new DOMException('Lifecycle scope is already retiring', 'AbortError')
  }
}
