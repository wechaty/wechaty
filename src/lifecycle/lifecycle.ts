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

  #state: LifecycleState = { kind: 'stopped' }

  /**
   * Latest declared intent. Reconciliation always reads this (desired-state,
   * not a FIFO command log), so intermediate requests may be superseded (§6.3).
   */
  #desired: DesiredState = 'stopped'

  /**
   * Monotonic resource generation. Incremented when a run begins acquiring
   * resources; used to fence stale completions (inv. 9).
   */
  #generation = 0

  /**
   * Monotonic intent revision. Incremented on every externally-driven intent
   * change (start/stop). Supervisor recovery can be gated on the revision it
   * observed so a late restart cannot override a newer user stop (inv. 1, §6.4).
   */
  #revision = 0

  /**
   * The {@link #revision} at which the controller last entered a `failed` state.
   * Used so the reconciliation loop does not auto-retry a start for the same
   * request, yet a newer request (higher revision) can re-attempt.
   */
  #failedRevision = -1

  /** Aborts the in-flight `start()` hook when its run is superseded. */
  #runAbort?: AbortController

  /** Serializes reconciliation: a single worker drains intent changes. */
  #reconciling?: Promise<void>

  /**
   * Set when a request arrives while the worker is between its loop exit and its
   * `.finally` cleanup, so the worker is re-run exactly once rather than lost.
   */
  #wakePending = false

  /**
   * Callers awaiting the next convergence to each desired state. Settled in
   * bulk when the reconciler reaches (or fails to reach) that state, so a single
   * attempt serves many waiters (single-flight) while each caller keeps its own
   * abortable wait registered via {@link whenState}.
   */
  readonly #runningWaiters: Deferred[] = []
  readonly #stoppedWaiters: Deferred[] = []

  /** Observers registered via {@link whenState}, checked after every change. */
  readonly #observers = new Set<(state: LifecycleState) => void>()

  constructor (hooks: LifecycleHooks) {
    this.#hooks = hooks
  }

  get state (): LifecycleState {
    return this.#state
  }

  /**
   * Declare the intent to reach `running`.
   *
   * Resolves once the service genuinely reaches `running` for the run that
   * satisfies *current* intent. Rejects with {@link LifecycleStartError} if the
   * start hook fails, or {@link LifecycleSupersededError} if a later `stop()`
   * supersedes this request before it reaches `running`. An already-aborted
   * `signal` rejects immediately without changing intent (§6.4).
   */
  async start (options: { signal?: AbortSignal } = {}): Promise<void> {
    return this.#request('running', this.#runningWaiters, options.signal)
  }

  /**
   * Declare the intent to reach `stopped`.
   *
   * Resolves only after owned resources are actually released; rejects with
   * {@link LifecycleStopError} if cleanup fails (never masquerades as stopped).
   */
  async stop (options: { signal?: AbortSignal } = {}): Promise<void> {
    return this.#request('stopped', this.#stoppedWaiters, options.signal)
  }

  /**
   * Explicit stop-then-start cycle. Unlike two independent calls, it is a single
   * intent sequence; a concurrent later `stop()` still wins (intent authority).
   */
  async restart (options: { signal?: AbortSignal } = {}): Promise<void> {
    await this.stop(options)
    await this.start(options)
  }

  /**
   * Await the first state satisfying `predicate`.
   *
   * Read-only observation that never mutates intent. Resolves with the matching
   * snapshot. Rejects if the caller's `signal` aborts, or — to avoid the
   * `state-switch` "wait forever after failure" hang (§3.1/§3.4) — if the
   * service reaches a terminal `failed` state that does not satisfy `predicate`.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options: { signal?: AbortSignal } = {},
  ): Promise<LifecycleState> {
    const { signal } = options

    if (signal?.aborted) {
      return Promise.reject(toAbortError(signal))
    }
    if (predicate(this.#state)) {
      return Promise.resolve(this.#state)
    }

    return new Promise<LifecycleState>((resolve, reject) => {
      const cleanup = () => {
        this.#observers.delete(observer)
        signal?.removeEventListener('abort', onAbort)
      }
      const observer = (state: LifecycleState) => {
        if (predicate(state)) {
          cleanup()
          resolve(state)
        } else if (state.kind === 'failed') {
          cleanup()
          reject(new LifecycleStartError(state.error, state.cleanupComplete, state.cleanupError))
        }
      }
      const onAbort = () => {
        cleanup()
        reject(toAbortError(signal!))
      }

      this.#observers.add(observer)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  /**
   * Register a caller's intent and its abortable waiter, then ensure the
   * reconciliation worker is running. Aborting `signal` cancels only this
   * caller's wait (rejecting with an AbortError) — it does not revoke the
   * accepted service intent or other callers' waits (§6.4).
   */
  #request (
    desired: DesiredState,
    waiters: Deferred[],
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted) {
      return Promise.reject(toAbortError(signal))
    }

    /**
     * Fast path: already in the desired terminal state and no pending change in
     * the other direction. Idempotent repeat requests resolve immediately
     * (inv. 5) without spawning a redundant attempt.
     */
    if (this.#desired === desired && this.#isSettledAt(desired)) {
      return Promise.resolve()
    }

    this.#revision += 1
    this.#desired = desired

    /**
     * Supersession: flipping desired state makes any callers still awaiting the
     * *opposite* convergence irrelevant. Reject them now with
     * {@link LifecycleSupersededError} (intent authority, inv. 1) instead of
     * leaving them pending behind an uncooperative in-flight hook. A newly-desired
     * `stopped` also aborts the in-flight start's signal so a cooperative hook can
     * unwind promptly (inv. 8); an uncooperative hook is fenced on late completion.
     */
    if (desired === 'stopped') {
      this.#rejectWaiters(this.#runningWaiters, new LifecycleSupersededError())
      if (this.#runAbort) {
        this.#runAbort.abort(new LifecycleSupersededError())
      }
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
    if (desired === 'running') {
      return this.#state.kind === 'running'
    }
    return this.#state.kind === 'stopped'
  }

  /**
   * Start the reconciliation worker if it is not already draining.
   *
   * If a request arrives while the worker is still settling (its terminating
   * `.finally` has not yet cleared `#reconciling`), record a pending wake so the
   * worker re-runs once instead of being lost to that race.
   */
  #ensureReconciling (): void {
    if (this.#reconciling) {
      this.#wakePending = true
      return
    }
    this.#wakePending = false
    this.#reconciling = this.#reconcileLoop().finally(() => {
      this.#reconciling = undefined
      if (this.#wakePending) {
        this.#ensureReconciling()
      }
    })
  }

  /**
   * The single reconciliation worker. Each iteration reads the *latest* desired
   * state and takes one step toward it, re-reading intent after every await so a
   * mid-flight supersession is honored before publishing an authoritative state
   * (§6.4). Exits only when the service already matches current intent.
   */
  async #reconcileLoop (): Promise<void> {
    for (;;) {
      const desired = this.#desired

      if (desired === 'running') {
        if (this.#state.kind === 'running') {
          this.#settleRunningWaiters()
          return
        }
        /**
         * A `failed` state is terminal for the request that produced it; the
         * loop does not auto-retry (recovery is the supervisor's policy, inv. 12).
         * A *new* start request (which advances `#revision`) is what re-enters a
         * start here. Block restart when prior cleanup is unverified, since the
         * old run's resources may still be live (inv. 4/7).
         */
        if (this.#state.kind === 'failed') {
          if (this.#revision === this.#failedRevision) {
            return
          }
          if (!this.#state.cleanupComplete) {
            const unsafe = new LifecycleStartError(
              this.#state.error,
              this.#state.cleanupComplete,
              this.#state.cleanupError,
            )
            this.#rejectWaiters(this.#runningWaiters, unsafe)
            return
          }
        }
        await this.#doStart()
        continue
      }

      // desired === 'stopped'
      if (this.#state.kind === 'stopped') {
        this.#settleStoppedWaiters()
        return
      }
      if (this.#state.kind === 'failed') {
        // Terminal failure already settled its waiters; nothing left to do
        // unless a new start intent arrives (which flips #desired to running).
        return
      }
      await this.#doStop()
    }
  }

  /**
   * Execute one start attempt for a fresh generation. On hook failure, roll back
   * via the stop hook and publish a `failed` state that records whether that
   * rollback actually completed.
   */
  async #doStart (): Promise<void> {
    const generation = ++this.#generation
    const runAbort = new AbortController()
    this.#runAbort = runAbort

    this.#setState({ generation, kind: 'starting' })

    try {
      await this.#hooks.start({ signal: runAbort.signal })
    } catch (error) {
      await this.#rollback(generation, error)
      return
    } finally {
      if (this.#runAbort === runAbort) {
        this.#runAbort = undefined
      }
    }

    /**
     * Fence stale completion: if intent flipped to stopped (or a newer run
     * began) while start was awaiting, do not publish `running`. The loop will
     * reconcile toward the current desired state next iteration.
     */
    if (this.#generation !== generation || this.#desired !== 'running') {
      // Resources for this generation were acquired; let the loop stop them.
      if (this.#state.kind === 'starting' && this.#state.generation === generation) {
        this.#setState({ generation, kind: 'running' })
      }
      return
    }

    this.#setState({ generation, kind: 'running' })
    this.#settleRunningWaiters()
  }

  /** Roll back a failed start and record cleanup outcome. */
  async #rollback (generation: number, error: unknown): Promise<void> {
    let cleanupComplete = true
    let cleanupError: unknown

    try {
      await this.#hooks.stop()
    } catch (e) {
      cleanupComplete = false
      cleanupError = e
    }

    const failed: LifecycleState = cleanupError === undefined
      ? { cleanupComplete, error, generation, kind: 'failed' }
      : { cleanupComplete, cleanupError, error, generation, kind: 'failed' }

    this.#setState(failed)
    this.#failedRevision = this.#revision

    const startError = new LifecycleStartError(error, cleanupComplete, cleanupError)
    this.#rejectWaiters(this.#runningWaiters, startError)
    // A stop requested during a failing start is satisfied once resources are
    // released; if cleanup failed, surface that instead.
    if (cleanupComplete) {
      this.#settleStoppedWaiters()
    } else {
      this.#rejectWaiters(this.#stoppedWaiters, new LifecycleStopError(cleanupError))
    }
  }

  /** Execute one stop attempt, releasing the current run's resources. */
  async #doStop (): Promise<void> {
    const current = this.#state
    const generation = 'generation' in current ? current.generation : this.#generation

    this.#setState({ generation, kind: 'stopping' })

    try {
      await this.#hooks.stop()
    } catch (error) {
      this.#setState({ cleanupComplete: false, cleanupError: error, error, generation, kind: 'failed' })
      this.#failedRevision = this.#revision
      this.#rejectWaiters(this.#stoppedWaiters, new LifecycleStopError(error))
      // Also reject any start waiters that were coalesced behind this stop.
      this.#rejectWaiters(this.#runningWaiters, new LifecycleStopError(error))
      return
    }

    this.#setState({ kind: 'stopped' })
    this.#settleStoppedWaiters()
  }

  #setState (state: LifecycleState): void {
    this.#state = state
    for (const observer of [ ...this.#observers ]) {
      observer(state)
    }
  }

  #settleRunningWaiters (): void {
    this.#resolveWaiters(this.#runningWaiters)
    // Anyone still waiting for stopped is, for now, superseded by running intent.
    this.#rejectWaiters(this.#stoppedWaiters, new LifecycleSupersededError())
  }

  #settleStoppedWaiters (): void {
    this.#resolveWaiters(this.#stoppedWaiters)
    this.#rejectWaiters(this.#runningWaiters, new LifecycleSupersededError())
  }

  #resolveWaiters (waiters: Deferred[]): void {
    const pending = waiters.splice(0, waiters.length)
    for (const deferred of pending) {
      deferred.resolve()
    }
  }

  /**
   * Reject waiters on a microtask. Supersession can reject a waiter in the very
   * tick a caller created it (e.g. `const p = lc.start(); lc.stop()`), before the
   * caller attaches `await`/`.catch`. Deferring one microtask lets the caller's
   * synchronous code register its handler first, avoiding spurious
   * unhandled-rejection reports without changing observable ordering.
   */
  #rejectWaiters (waiters: Deferred[], error: unknown): void {
    const pending = waiters.splice(0, waiters.length)
    for (const deferred of pending) {
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
