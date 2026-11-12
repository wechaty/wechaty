/**
 * Per-generation structured concurrency and resource ownership scope.
 *
 * Owns acquired resources, event subscriptions, timers, and background tasks
 * for a single service generation. Enforces three-phase retirement:
 *   1. Seal admission & signal cooperative `AbortController` cancellation
 *   2. Synchronous LIFO `interrupt()` to unblock pending sockets/streams/timers
 *   3. Bounded or cooperative task join + strict LIFO async `dispose()`
 *
 * Late acquisitions that resolve after cancellation are immediately interrupted
 * and disposed before rejecting. Hung in-flight creations and failed disposers
 * are tracked explicitly so callers can distinguish proven cleanup from dirty
 * failure states, and retryable cleanup skips already-disposed entries.
 */
import {
  LifecycleAggregateCleanupError,
  LifecycleTimeoutError,
  toAbortError,
} from './errors.ts'

export interface ResourceContext {
  readonly signal: AbortSignal
  readonly scope: ResourceScope
}

export interface ResourceDescriptor<T> {
  readonly name?: string
  /**
   * Acquires the resource. Receives the scope's cooperative `AbortSignal` and
   * `scope` for nested child registrations.
   */
  create (context: ResourceContext): Promise<T> | T
  /**
   * Optional fast synchronous interruption invoked in LIFO order before tasks
   * and disposers are awaited (e.g. closing sockets or clearing intervals so
   * blocked I/O tasks can exit without deadlocking shutdown).
   */
  interrupt? (resource: T): void
  /**
   * Asynchronous teardown executed in strict LIFO acquisition order. Should be
   * idempotent if explicit `stop()` retries a previously failed cleanup.
   */
  dispose? (resource: T): Promise<void> | void
}

export interface EventTargetLike {
  on (event: any, listener: (...args: any[]) => any): unknown
  off (event: any, listener: (...args: any[]) => any): unknown
}

export interface ScopeCloseOptions {
  readonly reason?: unknown
  /**
   * Optional bound (in milliseconds) for awaiting unsettled in-flight resource
   * creations and background tasks before running remaining disposers.
   * `undefined` waits until cooperative tasks settle; `0` checks after a
   * microtask turn whether uncooperative work remains in flight.
   */
  readonly timeoutMs?: number
}

export interface ScopeCloseResult {
  readonly cleanupComplete: boolean
  readonly errors: readonly unknown[]
  readonly error?: unknown
}

interface ScopeEntry<T> {
  readonly resource: T
  readonly interrupt: ((resource: T) => void) | undefined
  readonly dispose: ((resource: T) => Promise<void> | void) | undefined
  interrupted: boolean
  disposed: boolean
}

function summarizeErrors (errors: readonly unknown[]): unknown {
  if (errors.length === 0) {
    return undefined
  }
  if (errors.length === 1) {
    return errors[0]
  }
  return new LifecycleAggregateCleanupError(errors)
}

function isAbortSignalError (error: unknown, signal: AbortSignal): boolean {
  if (!signal.aborted) {
    return false
  }
  if (error === signal.reason) {
    return true
  }
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * Owns the resources, event listeners, and background tasks of one lifecycle
 * generation and releases them in reverse dependency order.
 */
export class ResourceScope {

  readonly #controller = new AbortController()
  readonly #entries: ScopeEntry<any>[] = []
  readonly #inFlightCreations = new Set<Promise<void>>()
  readonly #tasks = new Set<Promise<void>>()
  readonly #lateCleanupPromises = new Set<Promise<void>>()
  #pendingTaskErrors: unknown[] = []
  #pendingLateCleanupErrors: unknown[] = []
  #closed = false

  /**
   * Cooperative cancellation signal aborted as soon as scope retirement begins.
   */
  get signal (): AbortSignal {
    return this.#controller.signal
  }

  /**
   * `true` once `abort()` or `close()` has sealed this scope against new work.
   */
  get isClosed (): boolean {
    return this.#closed
  }

  /**
   * Number of `acquire()` calls whose `create()` hook has not yet settled.
   */
  get pendingCreationCount (): number {
    return this.#inFlightCreations.size
  }

  /**
   * Seals the scope against new acquisitions/tasks and triggers `signal` abort
   * synchronously without awaiting resource disposal.
   */
  abort (reason?: unknown): void {
    this.#closed = true
    if (!this.#controller.signal.aborted) {
      this.#controller.abort(toAbortError(reason))
    }
  }

  /**
   * Acquires a managed resource and registers its `interrupt` / `dispose` hooks
   * in LIFO order.
   *
   * If the scope is sealed while `create()` is in flight and `create()` still
   * resolves with a value, `interrupt` and `dispose` run immediately on that
   * late value before `acquire()` rejects so late completions cannot leak.
   */
  async acquire<T> (descriptor: ResourceDescriptor<T>): Promise<T> {
    if (this.#closed || this.#controller.signal.aborted) {
      throw toAbortError(this.#controller.signal.reason)
    }

    let resolveInFlight!: () => void
    const inFlight = new Promise<void>(resolve => {
      resolveInFlight = resolve
    })
    this.#inFlightCreations.add(inFlight)

    let resource: T
    try {
      resource = await descriptor.create({
        scope: this,
        signal: this.#controller.signal,
      })
    } catch (error) {
      this.#inFlightCreations.delete(inFlight)
      resolveInFlight()
      throw error
    }

    if (this.#closed || this.#controller.signal.aborted) {
      const lateCleanup = (async () => {
        try {
          descriptor.interrupt?.(resource)
        } catch (interruptErr) {
          this.#pendingLateCleanupErrors.push(interruptErr)
        }
        try {
          await descriptor.dispose?.(resource)
        } catch (disposeErr) {
          this.#pendingLateCleanupErrors.push(disposeErr)
        }
      })()
      this.#lateCleanupPromises.add(lateCleanup)
      try {
        await lateCleanup
      } finally {
        this.#lateCleanupPromises.delete(lateCleanup)
        this.#inFlightCreations.delete(inFlight)
        resolveInFlight()
      }
      throw toAbortError(this.#controller.signal.reason)
    }

    this.#entries.push({
      dispose: descriptor.dispose,
      disposed: false,
      interrupt: descriptor.interrupt,
      interrupted: false,
      resource,
    })
    this.#inFlightCreations.delete(inFlight)
    resolveInFlight()
    return resource
  }

  /**
   * Registers an owned teardown callback (and optional synchronous interrupter)
   * directly on this scope without wrapping a resource value.
   */
  onDispose (
    dispose: () => Promise<void> | void,
    interrupt?: () => void,
  ): void {
    if (this.#closed || this.#controller.signal.aborted) {
      throw toAbortError(this.#controller.signal.reason)
    }
    this.#entries.push({
      dispose: () => dispose(),
      disposed: false,
      interrupt: interrupt ? () => interrupt() : undefined,
      interrupted: false,
      resource: undefined,
    })
  }

  /**
   * Subscribes `listener` to `target` for the lifetime of this scope and
   * detaches the exact listener reference during Phase 2 (`interrupt`) and
   * Phase 3 (`dispose`) so restarts never accumulate duplicate observers.
   */
  listen<T extends EventTargetLike> (
    target: T,
    event: string,
    listener: (...args: any[]) => any,
  ): void {
    if (this.#closed || this.#controller.signal.aborted) {
      throw toAbortError(this.#controller.signal.reason)
    }
    target.on(event, listener)
    let detached = false
    const detach = () => {
      if (detached) {
        return
      }
      detached = true
      target.off(event, listener)
    }
    this.onDispose(detach, detach)
  }

  /**
   * Spawns a background task owned by this scope. Non-abort task rejections are
   * captured and surfaced during `close()` so no unhandled rejections escape.
   */
  spawn (task: (signal: AbortSignal) => Promise<void>): void {
    if (this.#closed || this.#controller.signal.aborted) {
      throw toAbortError(this.#controller.signal.reason)
    }

    const tracked = Promise.resolve()
      .then(() => task(this.#controller.signal))
      .catch((error: unknown) => {
        if (!isAbortSignalError(error, this.#controller.signal)) {
          this.#pendingTaskErrors.push(error)
        }
      })
      .finally(() => {
        this.#tasks.delete(tracked)
      })

    this.#tasks.add(tracked)
  }

  /**
   * Executes three-phase retirement (`seal+abort` -> LIFO `interrupt` ->
   * task join + LIFO `dispose`). Safe to call again to retry previously failed
   * disposers without re-running disposers that already succeeded.
   */
  async close (options?: ScopeCloseOptions): Promise<ScopeCloseResult> {
    this.abort(options?.reason)

    const errors: unknown[] = []

    // Phase 2: synchronous LIFO interruption to wake tasks blocked on sockets/timers.
    for (let i = this.#entries.length - 1; i >= 0; i--) {
      const entry = this.#entries[i]!
      if (!entry.interrupted && !entry.disposed) {
        entry.interrupted = true
        try {
          entry.interrupt?.(entry.resource)
        } catch (error) {
          errors.push(error)
        }
      }
    }

    // Phase 3a: await cooperative in-flight creations, background tasks, and late cleanups.
    await this.#joinPendingWork(options?.timeoutMs, errors)

    if (this.#pendingTaskErrors.length > 0) {
      errors.push(...this.#pendingTaskErrors)
      this.#pendingTaskErrors = []
    }
    if (this.#pendingLateCleanupErrors.length > 0) {
      errors.push(...this.#pendingLateCleanupErrors)
      this.#pendingLateCleanupErrors = []
    }

    // Phase 3b: strict LIFO async disposal. Every remaining disposer runs even if an earlier one fails.
    for (let i = this.#entries.length - 1; i >= 0; i--) {
      const entry = this.#entries[i]!
      if (!entry.disposed) {
        try {
          await entry.dispose?.(entry.resource)
          entry.disposed = true
        } catch (error) {
          errors.push(error)
        }
      }
    }

    // Drain any tasks or late cleanups unblocked during disposal itself.
    if (this.#tasks.size > 0 || this.#lateCleanupPromises.size > 0) {
      await this.#joinPendingWork(options?.timeoutMs, errors)
      if (this.#pendingTaskErrors.length > 0) {
        errors.push(...this.#pendingTaskErrors)
        this.#pendingTaskErrors = []
      }
      if (this.#pendingLateCleanupErrors.length > 0) {
        errors.push(...this.#pendingLateCleanupErrors)
        this.#pendingLateCleanupErrors = []
      }
    }

    const allDisposed = this.#entries.every(entry => entry.disposed)
    const cleanupComplete =
      errors.length === 0
      && allDisposed
      && this.#inFlightCreations.size === 0
      && this.#tasks.size === 0
      && this.#lateCleanupPromises.size === 0

    return {
      cleanupComplete,
      error: summarizeErrors(errors),
      errors,
    }
  }

  async #joinPendingWork (
    timeoutMs: number | undefined,
    errors: unknown[],
  ): Promise<void> {
    const pending = () => [
      ...this.#inFlightCreations,
      ...this.#tasks,
      ...this.#lateCleanupPromises,
    ]

    if (pending().length === 0) {
      return
    }

    if (timeoutMs === undefined) {
      while (pending().length > 0) {
        await Promise.allSettled(pending())
      }
      return
    }

    if (timeoutMs <= 0) {
      // Yield one microtask turn so synchronous abort listeners settle cleanly.
      await Promise.resolve()
      if (this.#lateCleanupPromises.size > 0) {
        await Promise.allSettled([ ...this.#lateCleanupPromises ])
      }
      return
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    let timedOut = false
    const deadline = new Promise<void>(resolve => {
      timer = setTimeout(() => {
        timedOut = true
        resolve()
      }, timeoutMs)
    })

    try {
      while (!timedOut && pending().length > 0) {
        await Promise.race([
          Promise.allSettled(pending()),
          deadline,
        ])
      }
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }

    if (timedOut && pending().length > 0) {
      errors.push(new LifecycleTimeoutError('stop', timeoutMs))
    }
  }

}
