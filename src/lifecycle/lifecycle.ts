/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 * `Lifecycle` — the generic async lifecycle controller that retires
 * `state-switch`'s `serviceCtlMixin`/`StateSwitch` for Wechaty 2.0.
 *
 * It owns one async service's lifecycle by *desired-state reconciliation* rather
 * than by a mutable flag: callers declare the intent they want (`start`/`stop`),
 * and a single serialized reconciliation worker drives the service toward the
 * latest intent. This file is the mechanism only; recovery/supervision policy
 * (retry, backoff, watchdog) lives above it, and application resource ordering
 * lives in the hooks a consumer supplies.
 *
 * Why not a Promise-chain or `state-switch`? See RFC wechaty/wechaty#2905 §6 and
 * the reproduced defects §3. The key properties this implementation guarantees:
 *
 *   - Intent authority (inv. 1): a later user `stop()` always wins over an older
 *     in-flight `start()`; the start's signal aborts and its waiters reject with
 *     {@link LifecycleSupersededError}.
 *   - Observed truth (inv. 2): `running` is published only after `hooks.start()`
 *     resolved; `stopped` only after `hooks.stop()` resolved.
 *   - Single ownership / no public setter (inv. 3): `state` is a read-only
 *     snapshot; only reconciliation mutates it.
 *   - Single-flight (inv. 5): concurrent equivalent requests share one attempt
 *     yet keep independent, individually-abortable waiters.
 *   - Explicit failures (inv. 6): transitions reject with typed errors; no
 *     silent indefinite wait after a terminal failure.
 *   - Cleanup correctness (inv. 7): a failed start rolls back via `hooks.stop()`;
 *     `failed.cleanupComplete` records whether that rollback actually succeeded.
 *   - Stale completions fenced (inv. 9): a late-resolving superseded operation
 *     cannot publish state for a newer generation.
 *   - Observability independence (inv. 13): correctness never depends on whether
 *     an error/event listener exists — results flow through promises, not events.
 */

import type { LifecycleHooks } from './lifecycle-hooks.ts'
import type { LifecycleState } from './lifecycle-state.ts'
import {
  LifecycleStartError,
  LifecycleStopError,
  LifecycleSupersededError,
}                              from './lifecycle-errors.ts'

/** Internal desired state the reconciler converges toward. */
type DesiredState = 'running' | 'stopped'

/** A deferred promise exposed to a caller awaiting a reconciliation outcome. */
interface Deferred {
  readonly promise: Promise<void>
  resolve (): void
  reject (error: unknown): void
}

function defer (): Deferred {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, reject, resolve }
}

interface Lifecycle {
  readonly state: LifecycleState

  start (options?: { signal?: AbortSignal }): Promise<void>
  stop (options?: { signal?: AbortSignal }): Promise<void>
  restart (options?: { signal?: AbortSignal }): Promise<void>

  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: { signal?: AbortSignal },
  ): Promise<LifecycleState>
}

class LifecycleController implements Lifecycle {

  readonly #hooks: LifecycleHooks

  #state: LifecycleState = Object.freeze({ kind: 'stopped' })

  /**
   * Latest declared intent. Reconciliation always reads this (desired-state,
   * not a FIFO command log), so intermediate requests may be superseded (§6.3).
   */
  #desired: DesiredState = 'stopped'

  /**
   * Monotonic resource generation. Incremented when a run begins acquiring
   * resources (inv. 9).
   */
  #generation = 0

  /**
   * Monotonic intent revision. Incremented on every accepted start/stop request.
   * Supervisor recovery can be gated on the revision it observed so a late
   * restart cannot override a newer user stop (inv. 1, §6.4).
   */
  #revision = 0

  /**
   * Incremented on every `stop()` request, including idempotent ones. `restart()`
   * captures it so any later explicit stop invalidates the pending start phase.
   */
  #stopRevision = 0

  /**
   * The {@link #revision} for which the controller last published `failed`.
   * The loop does not re-attempt work for a request that already failed; a newer
   * request (higher revision) may.
   */
  #failedRevision = -1

  /** Aborts the in-flight `start()` hook when its run is superseded. */
  #runAbort?: AbortController

  /** The single reconciliation worker; undefined when idle. */
  #reconciling?: Promise<void>

  /**
   * Set when a request arrives while the worker is finishing, so it is re-run
   * once rather than losing the request.
   */
  #wakePending = false

  /**
   * Callers awaiting convergence to each desired state. Because a request that
   * flips intent rejects the opposite list immediately, only waiters matching
   * the *current* intent ever exist; settling one list never touches the other.
   */
  readonly #runningWaiters: Deferred[] = []
  readonly #stoppedWaiters: Deferred[] = []

  /** Observers registered via {@link whenState}, notified after every change. */
  readonly #observers = new Set<(state: LifecycleState) => void>()

  constructor (hooks: LifecycleHooks) {
    this.#hooks = hooks
  }

  /** Immutable snapshot (frozen); only reconciliation can change the controller. */
  get state (): LifecycleState {
    return this.#state
  }

  /**
   * Declare the intent to reach `running`.
   *
   * Resolves once the service genuinely reaches `running`. Rejects with
   * {@link LifecycleStartError} if the start hook fails, or
   * {@link LifecycleSupersededError} if a later `stop()` supersedes this request.
   * An already-aborted `signal` rejects immediately without changing intent.
   */
  async start (options: { signal?: AbortSignal } = {}): Promise<void> {
    return this.#request('running', this.#runningWaiters, options.signal)
  }

  /**
   * Declare the intent to reach `stopped`.
   *
   * Resolves only after owned resources are actually released; rejects with
   * {@link LifecycleStopError} if cleanup fails (never masquerades as stopped).
   * Calling it after a failed start/stop retries or finalizes cleanup.
   */
  async stop (options: { signal?: AbortSignal } = {}): Promise<void> {
    return this.#request('stopped', this.#stoppedWaiters, options.signal)
  }

  /**
   * Explicit stop-then-start cycle. Any `stop()` requested after this call
   * (even an otherwise idempotent one) cancels the pending start phase, so a
   * later user stop always wins (intent authority, inv. 1).
   */
  async restart (options: { signal?: AbortSignal } = {}): Promise<void> {
    const stopped = this.stop(options)
    const stopRevision = this.#stopRevision
    await stopped
    if (this.#stopRevision !== stopRevision) {
      throw new LifecycleSupersededError()
    }
    await this.start(options)
  }

  /**
   * Await the first state satisfying `predicate`.
   *
   * Read-only observation that never mutates intent. Rejects if the caller's
   * `signal` aborts, if `predicate` throws (only this observation fails), or —
   * to avoid the `state-switch` hang (§3.1/§3.4) — if the service is in, or
   * reaches, a terminal `failed` state that does not satisfy `predicate`.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options: { signal?: AbortSignal } = {},
  ): Promise<LifecycleState> {
    const { signal } = options

    if (signal?.aborted) {
      return Promise.reject(toAbortError(signal))
    }

    return new Promise<LifecycleState>((resolve, reject) => {
      const cleanup = () => {
        this.#observers.delete(observer)
        signal?.removeEventListener('abort', onAbort)
      }
      /** Returns true when the wait is finished (settled). */
      const observer = (state: LifecycleState): boolean => {
        try {
          if (predicate(state)) {
            cleanup()
            resolve(state)
            return true
          }
        } catch (error) {
          // A faulty predicate must only fail its own observation.
          cleanup()
          reject(error)
          return true
        }
        if (state.kind === 'failed') {
          cleanup()
          reject(new LifecycleStartError(state.error, state.cleanupComplete, state.cleanupError))
          return true
        }
        return false
      }
      const onAbort = () => {
        cleanup()
        reject(toAbortError(signal!))
      }

      // Evaluate the current snapshot first, then subscribe for changes.
      if (observer(this.#state)) {
        return
      }
      this.#observers.add(observer)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  /**
   * Register a caller's intent and its abortable waiter, then ensure the
   * reconciliation worker is running. Aborting `signal` cancels only this
   * caller's wait — it does not revoke the accepted service intent or other
   * callers' waits (§6.4).
   */
  #request (
    desired: DesiredState,
    waiters: Deferred[],
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted) {
      return Promise.reject(toAbortError(signal))
    }

    if (desired === 'stopped') {
      this.#stopRevision += 1
    }

    /**
     * Fast path: already settled at the desired state with no pending change.
     * Idempotent repeat requests resolve immediately (inv. 5).
     */
    if (this.#desired === desired && this.#isSettledAt(desired)) {
      return Promise.resolve()
    }

    this.#revision += 1
    this.#desired = desired

    /**
     * Supersession happens here, when intent changes — never as a side effect
     * of intermediate convergence. A new `stopped` intent also aborts the
     * in-flight start's signal so a cooperative hook can unwind (inv. 8); an
     * uncooperative hook is fenced on late completion (see #doStart).
     */
    if (desired === 'stopped') {
      this.#rejectWaiters(this.#runningWaiters, new LifecycleSupersededError())
      this.#runAbort?.abort(new LifecycleSupersededError())
    } else {
      this.#rejectWaiters(this.#stoppedWaiters, new LifecycleSupersededError())
    }

    const deferred = defer()
    waiters.push(deferred)

    if (signal) {
      const onAbort = () => {
        const index = waiters.indexOf(deferred)
        if (index >= 0) {
          waiters.splice(index, 1)
        }
        deferred.reject(toAbortError(signal))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      // Detach the listener once settled so the signal does not retain us.
      void deferred.promise.then(
        () => signal.removeEventListener('abort', onAbort),
        () => signal.removeEventListener('abort', onAbort),
      )
    }

    this.#ensureReconciling()

    return deferred.promise
  }

  #isSettledAt (desired: DesiredState): boolean {
    return this.#state.kind === (desired === 'running' ? 'running' : 'stopped')
  }

  /**
   * Start the reconciliation worker if it is not already running.
   *
   * The loop is entered from a promise continuation so `#reconciling` is
   * assigned *before* any consumer code (hooks, predicates) can run; a hook that
   * synchronously calls `stop()` therefore cannot spawn a second worker.
   */
  #ensureReconciling (): void {
    if (this.#reconciling) {
      this.#wakePending = true
      return
    }
    this.#wakePending = false
    this.#reconciling = Promise.resolve().then(() => this.#reconcileLoop()).finally(() => {
      this.#reconciling = undefined
      if (this.#wakePending) {
        this.#ensureReconciling()
      }
    })
  }

  /**
   * The single reconciliation worker. Each iteration reads the *latest* desired
   * state and takes one step toward it, so mid-flight supersession is honored
   * before any authoritative state is published (§6.4).
   */
  async #reconcileLoop (): Promise<void> {
    for (;;) {
      const state = this.#state

      if (this.#desired === 'running') {
        if (state.kind === 'running') {
          this.#resolveWaiters(this.#runningWaiters)
          return
        }
        /**
         * `failed` is terminal for the request that produced it (no auto-retry;
         * recovery is supervisor policy, inv. 12). A newer start request may
         * retry, but only if cleanup was verified complete (inv. 4/7).
         */
        if (state.kind === 'failed') {
          if (this.#revision === this.#failedRevision) {
            return
          }
          if (!state.cleanupComplete) {
            this.#rejectWaiters(
              this.#runningWaiters,
              new LifecycleStartError(state.error, false, state.cleanupError),
            )
            return
          }
        }
        await this.#doStart()
        continue
      }

      // desired === 'stopped'
      if (state.kind === 'stopped') {
        this.#resolveWaiters(this.#stoppedWaiters)
        return
      }
      if (state.kind === 'failed') {
        if (this.#revision === this.#failedRevision) {
          return // this request already failed and was reported
        }
        if (state.cleanupComplete) {
          // Rollback already released everything: finalize as stopped.
          this.#publish({ kind: 'stopped' }, () => this.#resolveWaiters(this.#stoppedWaiters))
          return
        }
        // Cleanup was incomplete: fall through and retry it.
      }
      await this.#doStop()
    }
  }

  /**
   * Execute one start attempt for a fresh generation. A run whose signal was
   * aborted is *retired*: whatever its hook returned, it never publishes
   * `running`, and its resources are released via {@link #doStop} before any
   * replacement generation starts (inv. 4/9).
   */
  async #doStart (): Promise<void> {
    const generation = ++this.#generation
    const runAbort = new AbortController()
    this.#runAbort = runAbort

    this.#publish({ generation, kind: 'starting' })

    try {
      await this.#hooks.start({ signal: runAbort.signal })
    } catch (error) {
      if (runAbort.signal.aborted) {
        await this.#doStop() // retired run: its start error is irrelevant
      } else {
        await this.#rollback(generation, error)
      }
      return
    } finally {
      if (this.#runAbort === runAbort) {
        this.#runAbort = undefined
      }
    }

    if (runAbort.signal.aborted) {
      await this.#doStop()
      return
    }

    this.#publish({ generation, kind: 'running' }, () => this.#resolveWaiters(this.#runningWaiters))
  }

  /** Roll back a failed (non-retired) start and record the cleanup outcome. */
  async #rollback (generation: number, error: unknown): Promise<void> {
    let cleanupError: unknown
    let cleanupComplete = true

    try {
      await this.#hooks.stop()
    } catch (e) {
      cleanupComplete = false
      cleanupError = e
    }

    this.#failedRevision = this.#revision
    this.#publish(
      cleanupComplete
        ? { cleanupComplete, error, generation, kind: 'failed' }
        : { cleanupComplete, cleanupError, error, generation, kind: 'failed' },
      () => this.#rejectWaiters(
        this.#runningWaiters,
        new LifecycleStartError(error, cleanupComplete, cleanupError),
      ),
    )
  }

  /** Execute one stop attempt, releasing the current run's resources. */
  async #doStop (): Promise<void> {
    const current = this.#state
    const generation = 'generation' in current ? current.generation : this.#generation

    this.#publish({ generation, kind: 'stopping' })

    try {
      await this.#hooks.stop()
    } catch (error) {
      this.#failedRevision = this.#revision
      this.#publish(
        { cleanupComplete: false, cleanupError: error, error, generation, kind: 'failed' },
        () => {
          const stopError = new LifecycleStopError(error)
          this.#rejectWaiters(this.#stoppedWaiters, stopError)
          this.#rejectWaiters(this.#runningWaiters, stopError)
        },
      )
      return
    }

    this.#publish({ kind: 'stopped' }, () => this.#resolveWaiters(this.#stoppedWaiters))
  }

  /**
   * Commit a frozen snapshot, settle eligible request waiters, and only then
   * notify `whenState` observers. Settling first means an observer that
   * reentrantly calls `start()`/`stop()` cannot supersede a request that has
   * already been satisfied by this very transition.
   */
  #publish (state: LifecycleState, settle?: () => void): void {
    this.#state = Object.freeze(state)
    settle?.()
    for (const observer of [ ...this.#observers ]) {
      observer(this.#state)
    }
  }

  #resolveWaiters (waiters: Deferred[]): void {
    for (const deferred of waiters.splice(0, waiters.length)) {
      deferred.resolve()
    }
  }

  /**
   * Reject waiters on a microtask. Supersession can reject a waiter in the very
   * tick a caller created it (e.g. `const p = lc.start(); lc.stop()`), before the
   * caller attaches `await`/`.catch`; deferring lets the handler register first.
   */
  #rejectWaiters (waiters: Deferred[], error: unknown): void {
    for (const deferred of waiters.splice(0, waiters.length)) {
      queueMicrotask(() => deferred.reject(error))
    }
  }

}

/** Build a DOMException-style AbortError from an aborted signal. */
function toAbortError (signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted', 'AbortError')
}

export {
  LifecycleController,
}
export type {
  Lifecycle,
}
