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
 * The private lifecycle engine: every invariant of the module lives here.
 *
 * Owns intent (user commands and the attempts they create), the caller
 * waits on them, generation allocation, the single reconciler, retirement and
 * its deadline, cleanup debt, late releases (obligations of the instance that
 * new runs and `stopped` wait for, C-SCOPE-11), and the commit step that
 * publishes snapshots. The two entry points (`create-lifecycle.ts`,
 * `async-lifecycle.ts`) are thin shells
 * over {@link LifecycleEngine}; the per-run scope lives in `generation.ts`, the
 * ownership ledger in `ledger.ts`, conditions in `condition.ts`.
 *
 * ## Model (keep these rules when changing this file)
 *
 * 1. **Commands only record intent.** `start` / `stop` / `restart` and the scope's
 *    `fail` / `recover` change intent synchronously: they create or supersede an
 *    {@link Attempt} and seal (and, before `running`, abort) the current
 *    generation. They never commit state and never run hooks. Every user command
 *    supersedes a pending recovery the moment it is accepted, which is the whole
 *    of recovery's authority check (a user command always wins).
 * 2. **One writer.** Only the reconciler ({@link LifecycleEngine.#reconcile})
 *    commits snapshots. It runs one step at a time, chosen from the current facts
 *    by {@link LifecycleEngine.#nextStep}, so there is no wake flag to leak and a
 *    reentrant command simply changes what the next step will be.
 * 3. **Attempts drive starting.** A generation starts only for a pending attempt.
 *    A failed attempt ends; nothing retries because "running is still wanted".
 * 4. **One retirement path.** Every retirement (stop, restart, recover, failure,
 *    cleanup retry) runs {@link LifecycleEngine.#retire} and ends in
 *    {@link LifecycleEngine.#finishRetirement}, which settles waiters before
 *    observers see the new snapshot. The one later commit for the same run is
 *    {@link LifecycleEngine.#settleAwaitingLate}: after a failure's retirement
 *    left only late releases running, it publishes the outcome once they end
 *    (C-SCOPE-11).
 * 5. **Cleanup truth.** Completion is read back from the ledgers and the hook
 *    promises, never inferred from "no error" or from a deadline.
 * 6. **Deadlines are judged by the clock.** A deadline's timer only wakes the
 *    reconciler. Every commit of an outcome a deadline bounds first checks
 *    `clock.now()` against it, in the same turn (C-TIME-05, D30). A start
 *    deadline runs from the commit of `starting`; a stop deadline from the
 *    request of the retirement, before any abort listener runs (C-TIME-02,
 *    C-TIME-03). Keep both checks next to their commits.
 */

import {
  defaultClock,
}                           from './clock.ts'
import {
  ConditionBoard,
  type Condition,
}                           from './condition.ts'
import {
  diagnosticState,
  publishStateChange,
}                           from './diagnostics.ts'
import {
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}                           from './errors.ts'
import {
  createScope,
  Generation,
  type ScopeHost,
}                           from './generation.ts'
import type {
  LifecycleClock,
  LifecycleCondition,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleState,
  LifecycleStopReason,
  LifecycleWaitOptions,
  LifecycleRecoverResult,
}                           from './types.ts'

const TIMEOUT = Symbol('timeout')

/**
 * One start request shared by every equivalent caller.
 *
 * `user` attempts come from `start()` / `restart()` and reject on supersession;
 * `recover` attempts come from `scope.recover()` and resolve `'superseded'`
 * instead. Settlement is idempotent: the first outcome wins, and an outcome
 * fixed by {@link Attempt.decide} wins over anything that would come later.
 */
class Attempt {

  readonly kind: 'user' | 'recover'
  /** Bound when the reconciler allocates a generation for this attempt. */
  generation: Generation | undefined = undefined
  #settled = false
  /** The failure fixed by {@link Attempt.decide}, delivered by {@link Attempt.fail}. */
  #decided: { readonly error: unknown } | undefined = undefined
  readonly #deferred = Promise.withResolvers<LifecycleRecoverResult | undefined>()

  constructor (kind: 'user' | 'recover') {
    this.kind = kind
    // Callers attach their own handlers; the shared promise must never be the
    // source of an unhandled rejection when every caller has detached.
    this.#deferred.promise.catch(() => {})
  }

  /** The shared outcome; each caller gets its own view of it (C-CMD-03). */
  get promise (): Promise<LifecycleRecoverResult | undefined> {
    return this.#deferred.promise
  }

  /** Whether an outcome was already chosen (delivered, or fixed by {@link Attempt.decide}). */
  get settled (): boolean {
    return this.#settled || this.#decided !== undefined
  }

  /**
   * Its run failed (C-CMD-17, D35): fix the outcome now, before the run's abort
   * listeners can issue commands, and deliver it at the next commit
   * ({@link Attempt.fail}). From here on a newer command does not supersede it,
   * so its callers get the failure, not `LifecycleSupersededError`.
   */
  decide (error: unknown): void {
    if (this.#settled || this.#decided) { return }
    this.#decided = { error }
  }

  /** The generation committed `running`: callers resolve, a recovery reports `'recovered'`. */
  succeed (): void {
    if (this.#settled || this.#decided) { return }
    this.#settled = true
    this.#deferred.resolve(this.kind === 'recover' ? 'recovered' : undefined)
  }

  /**
   * A newer command won (C-CMD-07): user callers reject with
   * `LifecycleSupersededError`, a recovery resolves `'superseded'`.
   */
  supersede (): void {
    if (this.#settled || this.#decided) { return }
    this.#settled = true
    if (this.kind === 'recover') {
      this.#deferred.resolve('superseded')
    } else {
      this.#deferred.reject(new LifecycleSupersededError())
    }
  }

  /**
   * The attempt failed: callers reject with `error`, kept as given (C-STATE-05),
   * or with the failure fixed earlier by {@link Attempt.decide}.
   */
  fail (error: unknown): void {
    if (this.#settled) { return }
    this.#settled = true
    this.#deferred.reject(this.#decided ? this.#decided.error : error)
  }

}

/**
 * Give one caller its own view of a shared promise: a fresh promise (so an
 * ignored rejection is still reported to that caller) that also rejects when the
 * caller's signal aborts. The abort listener is removed on settle.
 *
 * `shared` always gets a rejection handler, even when the caller has already
 * aborted: stop waiters are plain promises, and a later cleanup failure on an
 * unhandled one would surface as a process-level unhandled rejection.
 */
function waitFor<T> (shared: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) {
    return shared.then(value => value)
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    // Handlers first, abort check second (see above).
    shared.then(
      value => { signal.removeEventListener('abort', onAbort); resolve(value) },
      (error: unknown) => { signal.removeEventListener('abort', onAbort); reject(error) },
    )
    // The command may have aborted a starting run synchronously, and that run's
    // abort listeners may have aborted this caller's signal before we got here.
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Check a deadline option. A `NaN`, negative or infinite value would fire at
 * once (or never) instead of meaning a deadline, so it is refused.
 *
 * @throws RangeError when `value` is not a finite, non-negative number.
 */
function validTimeout (name: string, value: number | undefined): number | undefined {
  if (value !== undefined && !(Number.isFinite(value) && value >= 0)) {
    throw new RangeError(`${name} must be a finite, non-negative number of milliseconds, got ${String(value)}`)
  }
  return value
}

/** Combine cleanup errors: one error as itself, several as an `AggregateError`. */
function aggregate (errors: readonly unknown[]): unknown {
  return errors.length === 1
    ? errors[0]
    : new AggregateError(errors, 'lifecycle cleanup failed')
}

/**
 * One start or stop deadline. Its timer only wakes the reconciler: whether it
 * has passed is judged by the clock, with {@link Deadline.passed}, in the same
 * turn as the commit of the outcome it bounds (C-TIME-05, D30).
 */
interface Deadline {
  /** Resolves with {@link TIMEOUT} when the timer fires; never settles without a limit. */
  readonly expired: Promise<typeof TIMEOUT>
  /** Aborted when the timer fires, with a {@link LifecycleTimeoutError}. */
  readonly signal: AbortSignal
  /** Whether `clock.now()` has reached the deadline, even if its timer has not fired. */
  passed (): boolean
  cancel (): void
}

/**
 * The single lifecycle engine behind both entry points. Public methods are the
 * Tier 1 caller API plus `condition`; everything else is private.
 */
class LifecycleEngine {

  readonly #hooks: LifecycleHooks
  readonly #name: string | undefined
  readonly #startTimeoutMs: number | undefined
  readonly #stopTimeoutMs: number | undefined
  readonly #clock: LifecycleClock
  readonly #host: ScopeHost
  readonly #board = new ConditionBoard()

  #state: LifecycleState = Object.freeze({ kind: 'stopped', generation: 0 })
  readonly #stateWaiters = new Set<{
    readonly predicate: (state: LifecycleState) => boolean
    readonly resolve: (state: LifecycleState) => void
    readonly reject: (reason: unknown) => void
  }>()

  #generationSeq = 0
  /** The generation that is live, retiring, or dirty. `undefined` when idle. */
  #current: Generation | undefined = undefined
  /** The attempt the next `start()` joins, until it is settled. */
  #pending: Attempt | undefined = undefined
  /**
   * An explicit `stop()` (or a `restart()` joining idle late releases) targeting
   * a dirty or idle state. Set by {@link LifecycleEngine.#requestStop}, consumed
   * by {@link LifecycleEngine.#takeStop}.
   */
  #stopRequested = false
  /**
   * `clock.now()` when the first unconsumed stop request was accepted: where
   * the stop deadline of the pass serving it starts (C-TIME-03, D30).
   */
  #stopAcceptedAt: number | undefined = undefined
  /** Retired generations whose late releases failed: debt that blocks a new run. */
  readonly #debtors = new Set<Generation>()
  /**
   * `stop()` callers waiting while no generation is current: for debt cleanup,
   * or for a clean failure to commit `stopped`. Settled by that commit.
   */
  readonly #idleStopWaiters = new Set<PromiseWithResolvers<void>>()
  /** The attempt that allocated each generation, settled when that run ends. */
  readonly #attemptOf = new WeakMap<Generation, Attempt>()
  /** `stop()` callers waiting for a generation's release. */
  readonly #stopWaiters = new WeakMap<Generation, Set<PromiseWithResolvers<void>>>()
  /** Debt retirement work still running past a stop deadline. */
  #debtRetirement: Promise<unknown[]> | undefined = undefined
  /** A debt pass is in progress; a `stop()` arriving now joins it. */
  #debtPassActive = false
  /**
   * Late releases still running on retired generations (C-SCOPE-11, D31): each
   * entry settles (never rejects) when its release finishes. They are
   * obligations of the instance, so `stopped` and a new run wait for them.
   */
  readonly #late = new Set<Promise<void>>()
  /** Resolved, then cleared, when {@link LifecycleEngine.#late} becomes empty. */
  readonly #lateDrainWaiters = new Set<() => void>()
  /** Resolved, then cleared, when a late release fails and becomes debt. */
  readonly #debtWaiters = new Set<() => void>()
  /**
   * The idle snapshot (`stopped`, or a clean `failed`) that a late release
   * interrupted with `stopping`; restored when the late releases end (D31).
   */
  #idleBefore: LifecycleState | undefined = undefined
  #reconciling = false

  constructor (hooks: LifecycleHooks, options?: LifecycleOptions) {
    this.#hooks = hooks
    this.#name = options?.name
    this.#startTimeoutMs = validTimeout('startTimeoutMs', options?.startTimeoutMs)
    this.#stopTimeoutMs = validTimeout('stopTimeoutMs', options?.stopTimeoutMs)
    this.#clock = options?.clock ?? defaultClock
    this.#host = {
      fail              : (generation, error) => this.#fail(generation, error),
      recover           : (generation, reason) => this.#recover(generation, reason),
      lateRelease       : (generation, run) => this.#lateRelease(generation, run),
      setCondition      : (generation, condition, value) => this.#setCondition(generation, condition, value),
    }
  }

  // ===========================================================================
  // Tier 1: caller API
  // ===========================================================================

  get state (): LifecycleState {
    return this.#state
  }

  /** See {@link Lifecycle.start}. */
  start (options?: LifecycleWaitOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (this.#isDirty()) {
      return Promise.reject(new LifecycleUnsafeStateError('cannot start while cleanup is incomplete'))
    }

    const current = this.#current
    if (current && current.reachedRunning && !current.sealed) {
      return Promise.resolve() // already running, nothing to retire (#2905 §3.8 A)
    }
    const attempt = this.#joinableAttempt() ?? (this.#pending = new Attempt('user'))
    this.#schedule()
    return waitFor(attempt.promise, signal).then(result => {
      // A joined recovery reports supersession as a value; a user caller rejects.
      if (result === 'superseded') {
        throw new LifecycleSupersededError()
      }
    })
  }

  /** See {@link Lifecycle.stop}. */
  stop (options?: LifecycleWaitOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    this.#supersedePending()
    this.#board.rejectNext(new LifecycleSupersededError('stopped before the condition wait was bound'))

    const current = this.#current
    let waiter: PromiseWithResolvers<void>
    if (current) {
      if (current.dirty) {
        this.#requestStop()
      } else {
        this.#requestRetire(current, 'stop')
      }
      waiter = this.#stopWaiter(current)
    } else if (this.#debtors.size > 0 || this.#isDirty() || this.#debtPassActive || this.#late.size > 0) {
      // A stop() during a debt pass joins that pass; only a stop() after it
      // ends asks for another (retries need explicit intent). Late releases on
      // an idle instance are joined the same way (C-SCOPE-11).
      if (!this.#debtPassActive) {
        this.#requestStop()
      }
      waiter = Promise.withResolvers<void>()
      this.#idleStopWaiters.add(waiter)
    } else if (this.#state.kind === 'failed' || this.#state.kind === 'stopping') {
      // Clean failed → stopped. Resolve on that commit, not before it, so even
      // a reentrant observer sees `stopped` once its stop() resolves.
      //
      // `stopping` with no current generation and no debt is the gap between a
      // retirement and the replacement queued behind it: the retirement
      // committed nothing, leaving the next step to commit `starting`. This
      // stop() just superseded that replacement, so it must commit `stopped`
      // itself; resolving at once left the state `stopping` forever (B13).
      this.#requestStop()
      waiter = Promise.withResolvers<void>()
      this.#idleStopWaiters.add(waiter)
    } else {
      return Promise.resolve()
    }
    this.#schedule()
    return waitFor(waiter.promise, signal)
  }

  /** See {@link Lifecycle.restart}. */
  restart (options?: LifecycleWaitOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (this.#isDirty()) {
      return Promise.reject(new LifecycleUnsafeStateError('cannot restart while cleanup is incomplete'))
    }
    // Equivalent concurrent restarts share one attempt: a user attempt that has
    // no generation yet already promises a run that starts after this call.
    const pending = this.#pending
    let attempt: Attempt
    if (pending && pending.kind === 'user' && !pending.settled && !pending.generation) {
      attempt = pending
    } else {
      this.#supersedePending()
      attempt = this.#pending = new Attempt('user')
    }
    // Install the attempt before retiring: `#requestRetire` may abort a starting
    // run, and its abort listeners can call start() / stop() synchronously; they
    // must join or supersede this attempt, not one installed after them.
    const current = this.#current
    if (current && !current.sealed) {
      this.#requestRetire(current, 'restart')
    } else if (!current && this.#late.size > 0 && !this.#debtPassActive) {
      // Late releases on an idle instance: restart() joins them as a retirement
      // pass under its own stop deadline, then starts the replacement (C-SCOPE-11).
      this.#requestStop()
    }
    this.#schedule()
    return waitFor(attempt.promise, signal).then(() => {})
  }

  /** See {@link Lifecycle.whenState}. */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    try {
      if (predicate(this.#state)) {
        return Promise.resolve(this.#state)
      }
    } catch (error) {
      return Promise.reject(error)
    }
    if (signal?.aborted) {
      return Promise.reject(signal.reason) // the predicate aborted its own caller
    }

    const { promise, resolve, reject } = Promise.withResolvers<LifecycleState>()
    const onAbort = () => {
      this.#stateWaiters.delete(waiter)
      reject(signal!.reason)
    }
    const detach = () => signal?.removeEventListener('abort', onAbort)
    const waiter = {
      predicate,
      resolve : (state: LifecycleState) => { detach(); resolve(state) },
      reject  : (reason: unknown) => { detach(); reject(reason) },
    }
    this.#stateWaiters.add(waiter)
    signal?.addEventListener('abort', onAbort, { once: true })
    return promise
  }

  [Symbol.asyncDispose] (): Promise<void> {
    return this.stop()
  }

  // ===========================================================================
  // Tier 2: owner API
  // ===========================================================================

  /** See {@link LifecycleController.condition}. */
  condition (name: string): LifecycleCondition {
    return this.#board.declare(name, (condition, options) => this.#waitCondition(condition, options))
  }

  #waitCondition (condition: Condition, options?: LifecycleWaitOptions): Promise<void> {
    const current = this.#current
    const target = current && !current.sealed ? current.number : 'next'
    return this.#board.wait(condition, target, options)
  }

  #setCondition (generation: Generation, condition: LifecycleCondition, value: boolean): void {
    if (!this.#board.owns(condition)) {
      throw new TypeError(`condition '${condition.name}' was not declared on this lifecycle`)
    }
    if (generation.sealed) {
      return
    }
    if (value) {
      this.#board.set(generation.number, condition)
    } else {
      this.#board.clear(generation.number, condition)
    }
  }

  // ===========================================================================
  // Intent helpers (synchronous; never commit, never run hooks)
  // ===========================================================================

  #isDirty (): boolean {
    return this.#state.kind === 'failed' && !this.#state.cleanupComplete
  }

  /**
   * The pending attempt a new `start()` may join, if any. A recovery that has not
   * started its replacement is superseded by user intent; once the replacement is
   * live, `start()` joins its outcome. An attempt whose generation is already
   * retiring will fail or be superseded, so a new request gets its own attempt.
   */
  #joinableAttempt (): Attempt | undefined {
    const pending = this.#pending
    if (!pending) {
      return undefined
    }
    if (pending.kind === 'recover' && !(pending.generation && !pending.generation.sealed)) {
      // Not started yet: user intent supersedes the recovery. Once its
      // replacement is live, a start() joins that run's outcome instead.
      pending.supersede()
      this.#pending = undefined
      return undefined
    }
    if (pending.generation?.sealed) {
      this.#pending = undefined // still settled through its generation
      return undefined
    }
    return pending
  }

  /**
   * Record an explicit stop request for the reconciler. The first unconsumed
   * request fixes where the stop deadline of the pass serving it starts: at
   * acceptance (C-TIME-03, D30).
   */
  #requestStop (): void {
    this.#stopRequested = true
    this.#stopAcceptedAt ??= this.#clock.now()
  }

  /** Consume the stop request; returns where its stop deadline starts. */
  #takeStop (): number | undefined {
    const origin = this.#stopAcceptedAt
    this.#stopRequested = false
    this.#stopAcceptedAt = undefined
    return origin
  }

  #supersedePending (): void {
    this.#pending?.supersede()
    this.#pending = undefined
  }

  #stopWaiter (generation: Generation): PromiseWithResolvers<void> {
    const waiter = Promise.withResolvers<void>()
    let waiters = this.#stopWaiters.get(generation)
    if (!waiters) {
      waiters = new Set()
      this.#stopWaiters.set(generation, waiters)
    }
    waiters.add(waiter)
    return waiter
  }

  /**
   * Ask `generation` to retire: seal it now (fencing its scope and freezing its
   * conditions) and, if it never reached `running`, abort it now so an
   * abort-aware `onStart` returns. The reconciler performs the retirement.
   */
  #requestRetire (generation: Generation, reason: LifecycleStopReason): void {
    // Both are taken now, before the abort below runs listeners that may block
    // the thread or issue commands:
    // - the first pass's stop deadline runs from here, the acceptance of the
    //   command (C-TIME-03, D30);
    // - the debt its first pass retries is the debt that exists now: a late
    //   release an abort listener rejects failed during this retirement, so it
    //   is reported, not retried (C-CMD-10).
    generation.retireAt ??= this.#clock.now()
    generation.debtAtRequest ??= this.#debtSnapshot()
    if (reason === 'failure' && generation.failure) {
      // The run's attempt now fails whatever its abort listeners do (D35).
      this.#attemptOf.get(generation)?.decide(generation.failure.error)
    }
    if (generation.retireReason === undefined || (reason === 'stop' && generation.retireReason !== 'failure')) {
      generation.retireReason = reason
    }
    if (!generation.sealed) {
      generation.sealed = true
      generation.sealReason = generation.failure
        ? generation.failure.error
        : new LifecycleSupersededError('the generation is retiring')
      generation.ledger.seal()
      this.#board.retire(generation.number, generation.sealReason)
    }
    if (!generation.reachedRunning) {
      this.#abort(generation)
    }
    generation.retireRequested.resolve()
  }

  #abort (generation: Generation): void {
    if (!generation.controller.signal.aborted) {
      generation.controller.abort(generation.sealReason ?? new LifecycleSupersededError('the generation is retiring'))
    }
  }

  // ===========================================================================
  // Scope host (called through the scope of a specific generation)
  // ===========================================================================

  #fail (generation: Generation, error: unknown): void {
    if (generation !== this.#current || generation.sealed) {
      return // stale or already retiring
    }
    generation.failure = { phase: generation.reachedRunning ? 'run' : 'start', error }
    this.#requestRetire(generation, 'failure')
    this.#schedule()
  }

  #recover (generation: Generation, reason: unknown): Promise<LifecycleRecoverResult> {
    if (generation !== this.#current || generation.sealed) {
      return Promise.resolve('superseded')
    }
    if (!generation.reachedRunning) {
      this.#fail(generation, reason) // a first boot fails fast
      return Promise.reject(reason)
    }
    // Running and unsealed means no start attempt is pending.
    const attempt = this.#pending = new Attempt('recover')
    this.#requestRetire(generation, 'recover')
    this.#schedule()
    return attempt.promise as Promise<LifecycleRecoverResult>
  }

  /**
   * A release registered after `generation` was sealed. While that generation
   * is still retiring it is part of its own retirement, which joins it
   * (C-SCOPE-02). Once its retirement is over (retired, or dirty and only
   * waiting for late releases), it is a late release (C-SCOPE-11, D31): tracked
   * until it finishes, so new runs and `stopped` wait for it. The obligation is
   * recorded before the release runs, so a command it calls reentrantly sees it.
   * A failure on a retired generation becomes debt; on a waiting one it stays in
   * that generation's ledger, which {@link LifecycleEngine.#settleAwaitingLate}
   * reads back.
   */
  #lateRelease (generation: Generation, start: () => Promise<void>): void {
    if (!generation.retired && !generation.awaitingLate) {
      start().then(() => {}, () => { this.#lateReleaseFailed(generation) })
      return
    }
    const { promise: settled, resolve } = Promise.withResolvers<void>()
    this.#late.add(settled)
    start().then(resolve, () => {
      this.#lateReleaseFailed(generation)
      resolve()
    })
    void settled.then(() => {
      this.#late.delete(settled)
      if (this.#late.size === 0) {
        const waiters = [ ...this.#lateDrainWaiters ]
        this.#lateDrainWaiters.clear()
        for (const resolve of waiters) {
          resolve()
        }
      }
      this.#schedule()
    })
    this.#schedule()
  }

  /**
   * Wakes the next time a late release fails and becomes debt, or the next
   * time none is running. `cancel` removes both listeners, so a start that
   * stops waiting for another reason leaves nothing behind.
   */
  #lateWake (onDrain = true): { readonly promise: Promise<void>, cancel (): void } {
    const { promise, resolve } = Promise.withResolvers<void>()
    this.#debtWaiters.add(resolve)
    if (onDrain) {
      this.#lateDrainWaiters.add(resolve)
    }
    return {
      promise,
      cancel: () => {
        this.#debtWaiters.delete(resolve)
        this.#lateDrainWaiters.delete(resolve)
      },
    }
  }

  /** Resolves once no late release is running, including ones added meanwhile. */
  async #drainLate (): Promise<void> {
    while (this.#late.size > 0) {
      await new Promise<void>(resolve => this.#lateDrainWaiters.add(resolve))
    }
  }

  #lateReleaseFailed (generation: Generation): void {
    if (!generation.retired) {
      return // its own retirement reads the ledger back
    }
    this.#debtors.add(generation)
    const waiters = [ ...this.#debtWaiters ]
    this.#debtWaiters.clear()
    for (const resolve of waiters) {
      resolve()
    }
    this.#schedule()
  }

  // ===========================================================================
  // Reconciler (the only writer of state)
  // ===========================================================================

  #schedule (): void {
    if (this.#reconciling) {
      return // the running loop re-reads the facts after its current step
    }
    this.#reconciling = true
    // A microtask keeps intent acceptance synchronous and lets commands issued in
    // the same tick coalesce before the first step is chosen.
    queueMicrotask(() => { void this.#reconcile() })
  }

  async #reconcile (): Promise<void> {
    try {
      for (let step = this.#nextStep(); step; step = this.#nextStep()) {
        await step()
      }
    } finally {
      this.#reconciling = false
    }
  }

  /**
   * Choose the next step from the current facts, or `undefined` when settled.
   * Every step returned here changes those facts, so the loop cannot spin.
   */
  #nextStep (): (() => Promise<void> | void) | undefined {
    const current = this.#current
    if (current) {
      if (current.dirty) {
        if (current.awaitingLate && this.#late.size === 0 && !this.#stopRequested) {
          // A stop() accepted meanwhile waits on this generation; it retires it
          // below instead, which settles that stop() with the outcome.
          return () => this.#settleAwaitingLate(current)
        }
        if (!this.#stopRequested) {
          return undefined // a dirty failure waits for an explicit stop()
        }
        const origin = this.#takeStop()
        return () => this.#retire(current, origin)
      }
      return current.retireReason !== undefined
        ? () => this.#retire(current)
        : undefined // live: starting (inside #runStart) or running
    }

    this.#pruneDebtors()
    if (this.#late.size > 0) {
      // Late releases on an idle instance (C-SCOPE-11, D31).
      if (this.#stopRequested) {
        const origin = this.#takeStop()
        return () => this.#retireDebt(origin) // a stop() or restart() joins them
      }
      if (this.#debtors.size > 0 && !this.#isDirty()) {
        // One failed while others still run: publish the debt now, so the
        // state is truthful and a queued start() gets the error (C-SCOPE-11).
        return () => this.#commitDebt()
      }
      const state = this.#state
      if (state.kind === 'stopped' || (state.kind === 'failed' && state.cleanupComplete)) {
        return () => {
          this.#idleBefore = state
          this.#commit({ kind: 'stopping', generation: state.generation })
        }
      }
      return undefined // `stopping` (or dirty) until they finish; a start() queues
    }

    if (this.#debtors.size > 0) {
      if (!this.#isDirty()) {
        return () => this.#commitDebt()
      }
      if (!this.#stopRequested) {
        return undefined
      }
      const origin = this.#takeStop()
      return () => this.#retireDebt(origin)
    }

    if (this.#stopRequested && this.#debtRetirement) {
      // A timed-out debt pass is still tracked and may carry an error, even
      // though no debt is left: the stop() joins it to report it (D36).
      const origin = this.#takeStop()
      return () => this.#retireDebt(origin)
    }

    if (this.#stopRequested) {
      this.#takeStop()
      // Debt may have cleared on its own (a late release finished) after this
      // stop() was accepted; its waiters still need an outcome.
      const debtWaiters = [ ...this.#idleStopWaiters ]
      this.#idleStopWaiters.clear()
      const resolve = () => { for (const waiter of debtWaiters) { waiter.resolve() } }
      if (this.#state.kind === 'failed' || this.#state.kind === 'stopping') {
        this.#idleBefore = undefined // a stop() decides: `stopped`
        return () => this.#commit({ kind: 'stopped', generation: this.#state.generation }, resolve)
      }
      resolve()
    }

    const pending = this.#pending
    const before = this.#idleBefore
    if (before && this.#state.kind === 'stopping') {
      // The late releases ended cleanly. A queued start() commits `starting`
      // next; otherwise return to the idle state they interrupted (D31).
      this.#idleBefore = undefined
      if (!pending || pending.settled) {
        return () => this.#commit({ ...before })
      }
    }
    if (pending && !pending.settled && !this.#isDirty()) {
      return () => this.#runStart(pending)
    }
    return undefined
  }

  // ===========================================================================
  // Start runner
  // ===========================================================================

  async #runStart (attempt: Attempt): Promise<void> {
    const generation = new Generation(++this.#generationSeq)
    generation.scope = createScope(generation, this.#host)
    attempt.generation = generation
    this.#attemptOf.set(generation, attempt)
    this.#current = generation
    this.#board.bindNext(generation.number)
    // The start deadline runs from the commit of `starting` (C-TIME-02), so a
    // synchronous onStart, or an observer of `starting`, that blocks the thread
    // spends it too (C-TIME-05).
    const startedAt = this.#clock.now()
    this.#commit({ kind: 'starting', generation: generation.number })

    if (generation.sealed) {
      // An observer of `starting` already stopped this run. Never call onStart
      // with an aborted scope: an abort-driven hook would miss the event.
      generation.startWork = Promise.resolve()
      generation.startSettled = true
      return
    }

    const work = (async () => this.#hooks.onStart(generation.scope))()
    generation.startWork = work.then(
      () => { generation.startSettled = true },
      () => { generation.startSettled = true },
    )
    const outcome = work.then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    )

    const deadline = this.#deadline(this.#startTimeoutMs, 'start', startedAt)
    const retireRequested = generation.retireRequested.promise.then(() => undefined)
    // A late release that fails while onStart is still running fails this start
    // too (C-SCOPE-11), aborting the hook, instead of waiting for it to finish.
    const debtWake = this.#debtors.size === 0 ? this.#lateWake(false) : undefined
    let result: Awaited<typeof outcome> | typeof TIMEOUT | undefined
    try {
      result = await Promise.race([
        outcome,
        deadline.expired,
        retireRequested,
        ...(debtWake ? [ debtWake.promise.then(() => ({ ok: true as const })) ] : []),
      ])
    } finally {
      debtWake?.cancel()
    }
    // Late releases of earlier runs are obligations of the instance: this run
    // does not commit `running` until they finish, under its start deadline
    // (C-SCOPE-11, C-TIME-02). The condition is checked again after every wake,
    // in the same turn as the commit below, so a release registered just after a
    // drain is waited for too. A failure ends the wait at once, even while other
    // late releases still run.
    while (result !== undefined && result !== TIMEOUT && result.ok && !generation.sealed
      && this.#late.size > 0 && this.#debtors.size === 0) {
      const ok = result
      const wake = this.#lateWake()
      try {
        result = await Promise.race([ wake.promise.then(() => ok), deadline.expired, retireRequested ])
      } finally {
        wake.cancel()
      }
    }
    deadline.cancel()

    if (generation.sealed || result === undefined) {
      return // stop, restart or fail arrived; the next step retires it
    }
    this.#pruneDebtors()
    // A late release failed while this run was starting (C-SCOPE-11).
    const lateDebt = result !== TIMEOUT && result.ok && this.#debtors.size > 0
    if (deadline.passed()) {
      // Judged by the clock in the same turn as the commit below: an outcome
      // reached after the deadline is a timeout, even if its timer has not
      // fired because the thread was blocked (C-TIME-05, D30). Debt that failed
      // the start is still left for a stop() (`debtFailure` below).
      result = TIMEOUT
    }
    if (result !== TIMEOUT && lateDebt) {
      // A late release failed while this run was starting: the start fails with
      // its error, and this run's retirement leaves that debt for a stop().
      generation.failure = { phase: 'start', error: aggregate([ ...this.#debtors ].flatMap(debtor => debtor.ledger.failures)) }
      generation.debtFailure = true
      this.#requestRetire(generation, 'failure')
      return
    }
    if (result === TIMEOUT || !result.ok) {
      generation.failure = {
        phase: 'start',
        error: result === TIMEOUT ? new LifecycleTimeoutError('start', this.#startTimeoutMs!) : result.error,
      }
      generation.debtFailure = lateDebt
      this.#requestRetire(generation, 'failure')
      return
    }

    generation.reachedRunning = true
    this.#commit({ kind: 'running', generation: generation.number }, () => {
      attempt.succeed()
      if (this.#pending === attempt) {
        this.#pending = undefined
      }
    })
  }

  // ===========================================================================
  // Retirement
  // ===========================================================================

  /**
   * Retire `generation` (first time or a cleanup retry) and commit the outcome.
   * `origin` is where a retry's stop deadline starts: the acceptance of the
   * `stop()` that asked for it. A first pass starts from the retirement request
   * ({@link Generation.retireAt}).
   */
  async #retire (generation: Generation, origin?: number): Promise<void> {
    const retry = generation.dirty
    generation.dirty = false
    const own = this.#attemptOf.get(generation)
    this.#commit({ kind: 'stopping', generation: generation.number }, () => {
      // A failed start rejects its callers at the first commit after the
      // failure was decided, not when its cleanup completes (C-CMD-17, D35).
      if (generation.failure && !retry) {
        own?.fail(generation.failure.error)
      }
    })
    // A first pass retries the debt that existed when retirement was requested
    // (#requestRetire). A retry pass takes it when it starts, after the earlier
    // timed-out work it joins has finished, so a failure in that work is
    // retried (D36). Debt this run's own start failed on is left for an
    // explicit stop().
    let earlierDebt: ReadonlyMap<Generation, ReadonlySet<object>> = new Map()
    // Failures a retry pass already returned; never reported again (C-RET-04).
    const reported = new Set<object>()
    const keep = (work: Promise<unknown[]> | undefined) => { generation.retirement = work }
    // Failures first seen during this retirement: releases registered on this
    // run's scope after its unwind, and new debt. Collected once at the end, or
    // appended to the timed-out work the next stop() joins.
    const tail = () => [
      ...generation.ledger.failuresExcept(generation.failedAfterUnwind),
      ...this.#newDebtFailures(earlierDebt, reported),
    ]
    const deadline = this.#deadline(this.#stopTimeoutMs, 'stop', retry ? origin : generation.retireAt)
    let errors: unknown[]
    let timedOut: boolean
    try {
      ({ errors, timedOut } = await this.#underStopDeadline(
        generation.retirement,
        signal => {
          earlierDebt = retry
            ? this.#debtSnapshot()
            : generation.debtFailure ? new Map() : generation.debtAtRequest ?? this.#debtSnapshot()
          return this.#performRetirement(generation, signal, retry, earlierDebt, reported)
        },
        keep,
        deadline,
        tail,
      ))
      // A stop, restart or recovery waits until nothing runs (D31). The check
      // runs in the same turn as the commit below, so a release registered in
      // the microtasks before it is joined too, under the same deadline.
      // A failure's retirement does not wait for late releases, unless a
      // command accepted meanwhile waits on it: its stop() or a queued
      // replacement must get a real outcome, not "still in progress".
      // Re-evaluated every round. Releases on this run's own sealed scope are
      // always joined.
      const waitsForLate = () => retry || generation.retireReason !== 'failure'
        || (this.#stopWaiters.get(generation)?.size ?? 0) > 0
        || (this.#pending !== undefined && !this.#pending.settled && this.#pending !== this.#attemptOf.get(generation))
      while (!timedOut && ((waitsForLate() && this.#late.size > 0) || generation.ledger.running)) {
        // The round's work carries the errors so far, so a timeout here keeps
        // them for the stop() that joins it.
        const carried = errors
        const drain = waitsForLate()
        ;({ errors, timedOut } = await this.#underStopDeadline(undefined, async () => {
          await this.#joinRunning(generation, drain)
          return carried
        }, keep, deadline, tail))
      }
    } finally {
      deadline.cancel()
    }
    if (!timedOut) {
      // Reported, not retried (C-CMD-10), even if it appeared while a retry
      // was blocked.
      // Judged by the clock in the same turn as the commit below.
      ;({ errors, timedOut } = this.#judgeStopPass(deadline, [ ...errors, ...tail() ], keep))
    }
    this.#pruneDebtors()
    const released = !timedOut && generation.ledger.clean && generation.startSettled
    const complete = released && this.#debtors.size === 0 && this.#late.size === 0
    // A failure's retirement does not wait for late releases; while they still
    // run, the engine commits again once they finish (D31), with this pass's
    // own cleanup errors.
    generation.awaitingLate = released && this.#late.size > 0
    // Only this pass's own errors: debt errors stay in the debtors' ledgers and
    // are read from there when the outcome is published.
    generation.awaitingErrors = generation.awaitingLate ? [ ...generation.localErrors ] : []
    this.#finishRetirement(generation, errors, complete, retry)
  }

  /**
   * Run `pass` (after joining `previous`, timed-out work of the same target)
   * under one stop deadline. The work stays tracked past the deadline.
   */
  async #underStopDeadline (
    previous: Promise<unknown[]> | undefined,
    pass: (deadlineSignal: AbortSignal) => Promise<unknown[]>,
    keep: (work: Promise<unknown[]> | undefined) => void,
    shared?: Deadline,
    tail?: () => unknown[],
  ): Promise<{ errors: unknown[], timedOut: boolean }> {
    // A caller running several rounds of one retirement passes its deadline,
    // so they all share it, and cancels it itself.
    const deadline = shared ?? this.#deadline(this.#stopTimeoutMs, 'stop')
    // Joining earlier work and the new pass share this one deadline.
    const work = (async () => {
      const earlier = previous ? await previous : []
      return [ ...earlier, ...await pass(deadline.signal) ]
    })()
    keep(work)
    try {
      const result = await Promise.race([ work, deadline.expired ])
      // Judged by the clock too: work that ends after the deadline, while a
      // blocked thread kept the timer from firing, is a timeout (C-TIME-05).
      if (result === TIMEOUT || deadline.passed()) {
        // The work stays tracked; whatever fails before it ends (`tail`) is
        // part of it, so the stop() that joins it reports and retries it (D36).
        if (tail) {
          keep(work.then(errors => [ ...errors, ...tail() ]))
        }
        return { errors: [ new LifecycleTimeoutError('stop', this.#stopTimeoutMs!) ], timedOut: true }
      }
      keep(undefined)
      return { errors: result, timedOut: false }
    } finally {
      if (!shared) {
        deadline.cancel()
      }
    }
  }

  /**
   * The clock check of a stop pass that ended before its timer fired
   * (C-TIME-05, D30). Call it in the same turn as the commit of the pass's
   * outcome: the one helper keeps both stop paths judged alike (model rule 6).
   * If the deadline has passed, the pass is a timeout: its `errors` stay with
   * the kept work, for the stop() that joins it (D36), and the timeout is
   * returned instead.
   */
  #judgeStopPass (
    deadline: Deadline,
    errors: unknown[],
    keep: (work: Promise<unknown[]> | undefined) => void,
  ): { errors: unknown[], timedOut: boolean } {
    if (!deadline.passed()) {
      return { errors, timedOut: false }
    }
    keep(Promise.resolve(errors))
    return { errors: [ new LifecycleTimeoutError('stop', this.#stopTimeoutMs!) ], timedOut: true }
  }

  /**
   * One extra round of a retirement that waits for late releases: drain them,
   * and join releases running on `generation`'s own sealed scope (registered
   * after its unwind) without retrying any failure. Errors are not returned:
   * the caller collects new failures once, at the end, from the ledgers.
   */
  async #joinRunning (generation: Generation | undefined, drainLate = true): Promise<unknown[]> {
    if (drainLate) {
      await this.#drainLate()
    }
    if (generation?.ledger.running) {
      await generation.ledger.unwind({ retry: new Set() })
    }
    return []
  }

  /**
   * The retirement protocol (v1 design §4.3). Never rejects; returns the errors.
   *
   * 1. seal (already done by {@link LifecycleEngine.#requestRetire})
   * 2. `onStop` with live resources, once, only for a run that reached `running`
   * 3. abort `scope.signal`
   * 4. run interrupts, newest first
   * 5. wait for `onStart` to settle
   * 6. unwind the ledger: tasks first, then everything else newest first
   * 7. unless this retirement follows a failure, wait for late releases of
   *    earlier runs (D31); one that fails now is reported, not retried
   * 8. retry the debt that existed when this retirement was requested (a retry
   *    pass: when it began)
   */
  async #performRetirement (
    generation: Generation,
    deadlineSignal: AbortSignal,
    retry: boolean,
    earlierDebt: ReadonlyMap<Generation, ReadonlySet<object>>,
    reported: Set<object>,
  ): Promise<unknown[]> {
    const errors: unknown[] = [] // this pass's own errors: onStop, interrupts, its releases

    if (generation.reachedRunning && !generation.onStopCalled && this.#hooks.onStop) {
      generation.onStopCalled = true
      try {
        await this.#hooks.onStop({
          generation: generation.number,
          reason: generation.retireReason ?? 'stop',
          signal: deadlineSignal,
        })
      } catch (error) {
        errors.push(error)
      }
    }

    this.#abort(generation)
    errors.push(...generation.ledger.interrupt())
    await generation.startWork
    // What this unwind returned is reported by this pass; anything else that
    // fails on this run's sealed scope is collected by the caller, once. The
    // record is what the pass returned, not what is failed when it resumes: a
    // release registered and failing in the turns between would otherwise be
    // reported by no one.
    const unwound = new Set<object>()
    errors.push(...await generation.ledger.unwind({ reported: unwound }))
    generation.failedAfterUnwind = unwound
    errors.push(...generation.lateInterruptErrors.splice(0))
    const debt: unknown[] = []
    if (retry || generation.retireReason !== 'failure') {
      await this.#drainLate()
      debt.push(...await this.#unwindDebt(earlierDebt, true, reported))
    } else {
      // A failure's retirement does not wait for late releases; #retire reports
      // the ones that already failed during it.
      debt.push(...await this.#unwindDebt(earlierDebt, false, reported))
    }
    generation.localErrors = errors
    return [ ...errors, ...debt ]
  }

  /**
   * The debt that exists now, by ledger entry: a pass retries exactly these
   * and reports any failure first seen during it, even in the same generation,
   * without retrying it (C-SCOPE-11, C-CMD-10).
   */
  #debtSnapshot (): Map<Generation, ReadonlySet<object>> {
    this.#pruneDebtors()
    return new Map([ ...this.#debtors ].map(debtor => [ debtor, debtor.ledger.failedEntries() ]))
  }

  /**
   * Errors of debt that appeared after `snapshot` was taken, except entries a
   * pass already reported (`reported`), so none is counted twice.
   */
  #newDebtFailures (snapshot: ReadonlyMap<Generation, ReadonlySet<object>>, reported: ReadonlySet<object> = new Set()): unknown[] {
    this.#pruneDebtors()
    return [ ...this.#debtors ].flatMap(debtor => debtor.ledger.failuresExcept(new Set([ ...snapshot.get(debtor) ?? [], ...reported ])))
  }

  /**
   * Retry the debt in `snapshot`, and only that. With `joinRunning: false`,
   * late releases still running are left alone (a failure's retirement does
   * not wait for them).
   */
  async #unwindDebt (
    snapshot: ReadonlyMap<Generation, ReadonlySet<object>>,
    joinRunning = true,
    reported?: Set<object>,
  ): Promise<unknown[]> {
    const errors: unknown[] = []
    for (const [ debtor, retry ] of snapshot) {
      if (this.#debtors.has(debtor)) {
        errors.push(...await debtor.ledger.unwind({ retry, joinRunning, reported }))
      }
    }
    this.#pruneDebtors()
    return errors
  }

  /**
   * A failure's retirement left only late releases running (D31); they ended.
   * Publish the outcome: a clean failure, or a dirty one with their error.
   */
  #settleAwaitingLate (generation: Generation): void {
    generation.awaitingLate = false
    this.#pruneDebtors()
    const failure = generation.failure
    const passErrors = generation.awaitingErrors.splice(0)
    // A release registered on this generation while it waited is its own
    // obligation; it is clean only if its own ledger is too.
    if (this.#debtors.size > 0 || !generation.ledger.clean) {
      const cleanupError = aggregate([
        ...passErrors,
        ...generation.ledger.failures,
        ...[ ...this.#debtors ].flatMap(debtor => debtor.ledger.failures),
      ])
      this.#commit({
        kind            : 'failed',
        generation      : generation.number,
        phase           : failure ? failure.phase : 'stop',
        error           : failure ? failure.error : cleanupError,
        cleanupComplete : false,
        cleanupError,
      })
      return // still dirty: a stop() retries the debt
    }
    generation.dirty = false
    generation.retired = true
    this.#current = undefined
    const cleanup = passErrors.length > 0 ? { cleanupError: aggregate(passErrors) } : {}
    if (failure) {
      this.#commit({ kind: 'failed', generation: generation.number, phase: failure.phase, error: failure.error, cleanupComplete: true, ...cleanup })
    } else if (passErrors.length > 0) {
      this.#commit({ kind: 'failed', generation: generation.number, phase: 'stop', error: cleanup.cleanupError, cleanupComplete: true, ...cleanup })
    } else {
      this.#commit({ kind: 'stopped', generation: generation.number })
    }
  }

  #pruneDebtors (): void {
    for (const debtor of this.#debtors) {
      if (debtor.ledger.clean) {
        this.#debtors.delete(debtor)
      }
    }
  }

  /**
   * Commit the outcome of a retirement pass. Waiters are settled inside the
   * commit, before `whenState` waiters and observers run, so a reentrant command
   * from an observer always gets a fresh waiter and a fresh outcome.
   */
  #finishRetirement (
    generation: Generation,
    errors: unknown[],
    complete: boolean,
    retry: boolean,
  ): void {
    const failure = generation.failure
    const stopWaiters = this.#stopWaiters.get(generation) ?? new Set()
    this.#stopWaiters.delete(generation)
    // The attempt that allocated this run ends with it; any other pending
    // attempt is a replacement (restart, recover, or a start() accepted meanwhile).
    const own = this.#attemptOf.get(generation)
    if (this.#pending === own) {
      this.#pending = undefined
    }

    if (!complete) {
      if (errors.length === 0) {
        errors.push(new LifecycleUnsafeStateError('a release is still in progress'))
      }
      const cleanupError = aggregate(errors)
      generation.dirty = true
      this.#commit({
        kind            : 'failed',
        generation      : generation.number,
        phase           : failure ? failure.phase : 'stop',
        error           : failure ? failure.error : cleanupError,
        cleanupComplete : false,
        cleanupError,
      }, () => {
        for (const waiter of stopWaiters) { waiter.reject(cleanupError) }
        own?.fail(failure ? failure.error : cleanupError)
        // A dirty failure blocks every new run, including a queued replacement.
        this.#pending?.fail(cleanupError)
        this.#pending = undefined
      })
      return
    }

    generation.retired = true
    this.#current = undefined
    // Failure is decided by the presence of errors, never by their value: a hook
    // may legitimately reject with `undefined`.
    const stopFailed = errors.length > 0
    const stopError = stopFailed ? aggregate(errors) : undefined

    // A replacement needs a retirement without errors ("either half fails").
    // Recovery authority needs no re-check here: see model rule 1.
    const rejectedReplacement = stopFailed ? this.#pending : undefined
    if (rejectedReplacement) {
      this.#pending = undefined
    }

    const settle = () => {
      for (const waiter of stopWaiters) {
        if (stopFailed) {
          waiter.reject(stopError)
        } else {
          waiter.resolve()
        }
      }
      own?.fail(failure ? failure.error : stopFailed ? stopError : new LifecycleSupersededError())
      rejectedReplacement?.fail(stopError)
    }

    let next: LifecycleState | undefined
    if (failure && !retry) {
      next = {
        kind            : 'failed',
        generation      : generation.number,
        phase           : failure.phase,
        error           : failure.error,
        cleanupComplete : true,
        ...(stopFailed ? { cleanupError: stopError } : {}),
      }
    } else if (stopFailed) {
      next = {
        kind            : 'failed',
        generation      : generation.number,
        phase           : 'stop',
        error           : stopError,
        cleanupComplete : true,
        cleanupError    : stopError,
      }
    } else if (this.#pending && !this.#pending.settled) {
      // The next step commits `starting` for the replacement. Until then the
      // state stays `stopping` with no current generation; a stop() in that gap
      // commits `stopped` instead (see stop()).
      next = undefined
    } else {
      next = { kind: 'stopped', generation: generation.number }
    }

    const pending = this.#pending
    if (next?.kind === 'failed' && !stopFailed && stopWaiters.size > 0 && !(pending && !pending.settled)) {
      // A stop() accepted while a failure retired this run asked for `stopped`
      // (C-CMD-09; B1): publish the failure, then `stopped`, and resolve that
      // stop() on the second commit. A replacement queued after it starts from
      // the failure instead (C-CMD-08).
      this.#commit(next, () => {
        own?.fail(failure ? failure.error : new LifecycleSupersededError())
      })
      if (this.#late.size > 0 || this.#debtors.size > 0) {
        // An observer of `failed` registered a late release (or one failed):
        // `stopped` must wait for it. The stop() joins it as an idle pass under
        // the same deadline, which commits the outcome (C-SCOPE-11, C-STATE-07).
        for (const waiter of stopWaiters) { this.#idleStopWaiters.add(waiter) }
        this.#stopRequested = true
        this.#stopAcceptedAt ??= generation.retireAt
        return
      }
      this.#commit({ kind: 'stopped', generation: generation.number }, () => {
        for (const waiter of stopWaiters) { waiter.resolve() }
      })
      return
    }
    if (next) {
      this.#commit(next, settle)
    } else {
      settle()
    }
  }

  /**
   * Debt appeared while idle: publish it as a dirty failure. An earlier clean
   * failure keeps its phase and error, because the first failure wins; the debt
   * becomes its `cleanupError` (C-SCOPE-11).
   */
  #commitDebt (): void {
    const errors = [ ...this.#debtors ].flatMap(debtor => debtor.ledger.failures)
    const cleanupError = aggregate(errors.length > 0 ? errors : [ new LifecycleUnsafeStateError('a late release failed') ])
    const before = this.#idleBefore ?? this.#state
    this.#idleBefore = undefined
    const earlier = before.kind === 'failed' ? before : undefined
    this.#commit({
      kind            : 'failed',
      generation      : this.#state.generation,
      phase           : earlier ? earlier.phase : 'stop',
      error           : earlier ? earlier.error : cleanupError,
      cleanupComplete : false,
      cleanupError,
    }, () => {
      this.#pending?.fail(cleanupError)
      this.#pending = undefined
    })
  }

  /**
   * An explicit `stop()` (or a `restart()` joining idle late releases) retries
   * debt left by retired generations and joins their late releases. Its stop
   * deadline starts at `origin`, the acceptance of that command (C-TIME-03).
   */
  async #retireDebt (origin?: number): Promise<void> {
    const generation = this.#state.generation
    this.#debtPassActive = true
    this.#idleBefore = undefined // a stop() or restart() decides the outcome
    if (this.#state.kind !== 'stopping') {
      this.#commit({ kind: 'stopping', generation })
    }
    // Taken when the pass starts, after any earlier timed-out work it joins (D36).
    let earlierDebt: ReadonlyMap<Generation, ReadonlySet<object>> = new Map()
    const reported = new Set<object>()
    const keep = (work: Promise<unknown[]> | undefined) => { this.#debtRetirement = work }
    // Debt first seen during this pass: reported once at the end, or appended
    // to the timed-out work the next stop() joins (D36).
    const tail = () => this.#newDebtFailures(earlierDebt, reported)
    const deadline = this.#deadline(this.#stopTimeoutMs, 'stop', origin)
    let result: { errors: unknown[], timedOut: boolean }
    try {
      result = await this.#underStopDeadline(
        this.#debtRetirement,
        async () => {
          earlierDebt = this.#debtSnapshot()
          await this.#drainLate()
          return this.#unwindDebt(earlierDebt, true, reported)
        },
        keep,
        deadline,
        tail,
      )
      // Join late releases until none runs, including ones a retry registered;
      // the check runs in the same turn as the commit below (D31).
      while (!result.timedOut && this.#late.size > 0) {
        // The round carries the errors so far, so a timeout keeps them.
        const carried = result.errors
        result = await this.#underStopDeadline(undefined, async () => {
          await this.#joinRunning(undefined)
          return carried
        }, keep, deadline, tail)
      }
    } finally {
      deadline.cancel()
      this.#debtPassActive = false
    }
    // Debt that appeared during this pass is reported, not retried. Judged by
    // the clock in the same turn as the commit below.
    const { errors, timedOut } = result.timedOut
      ? result
      : this.#judgeStopPass(deadline, [ ...result.errors, ...tail() ], keep)
    const waiters = [ ...this.#idleStopWaiters ]
    this.#idleStopWaiters.clear()
    if (!timedOut && this.#debtors.size === 0 && this.#late.size === 0) {
      if (errors.length > 0) {
        // Released, but some earlier work (joined from a timed-out pass) failed:
        // report it as a clean failure, as a generation retirement would.
        const stopError = aggregate(errors)
        this.#commit({
          kind: 'failed', generation, phase: 'stop', error: stopError, cleanupComplete: true, cleanupError: stopError,
        }, () => {
          for (const waiter of waiters) { waiter.reject(stopError) }
          this.#pending?.fail(stopError)
          this.#pending = undefined
        })
        return
      }
      this.#commit({ kind: 'stopped', generation }, () => {
        for (const waiter of waiters) { waiter.resolve() }
      })
      return
    }
    const cleanupError = aggregate(errors.length > 0 ? errors : [ new LifecycleUnsafeStateError('a late release is still in progress') ])
    this.#commit({
      kind: 'failed', generation, phase: 'stop', error: cleanupError, cleanupComplete: false, cleanupError,
    }, () => {
      for (const waiter of waiters) { waiter.reject(cleanupError) }
      this.#pending?.fail(cleanupError)
      this.#pending = undefined
    })
  }

  // ===========================================================================
  // Commit
  // ===========================================================================

  /**
   * Publish a snapshot: freeze it, run `settle` (attempt, stop and condition
   * outcomes), then resolve `whenState` waiters, publish diagnostics, and call
   * the observer. Observer and diagnostics failures are isolated.
   */
  #commit (next: LifecycleState, settle?: () => void): void {
    const previous = this.#state
    const state = Object.freeze(next)
    this.#state = state
    settle?.()

    for (const waiter of [ ...this.#stateWaiters ]) {
      let matched: boolean
      try {
        matched = waiter.predicate(state)
      } catch (error) {
        this.#stateWaiters.delete(waiter)
        waiter.reject(error)
        continue
      }
      if (matched) {
        this.#stateWaiters.delete(waiter)
        waiter.resolve(state)
      }
    }

    publishStateChange({
      name     : this.#name,
      state    : diagnosticState(state),
      previous : diagnosticState(previous),
    })

    try {
      this.#hooks.onStateChange?.(state, previous)
    } catch {
      // Isolated: an observer can never change a lifecycle outcome.
    }
  }

  // ===========================================================================
  // Deadlines
  // ===========================================================================

  /**
   * A deadline of `timeoutMs` from `origin` (a `clock.now()` reading; default:
   * now). The origin is where the contract says the deadline starts, which may
   * be before this call: the commit of `starting` (C-TIME-02), or the
   * acceptance of the command that requested the retirement (C-TIME-03). Time
   * a blocked thread spent since then counts, so the timer may be due at once.
   */
  #deadline (timeoutMs: number | undefined, phase: 'start' | 'stop', origin = this.#clock.now()): Deadline {
    const controller = new AbortController()
    if (timeoutMs === undefined) {
      return { expired: new Promise(() => {}), signal: controller.signal, passed: () => false, cancel: () => {} }
    }
    const at = origin + timeoutMs
    const { promise, resolve } = Promise.withResolvers<typeof TIMEOUT>()
    // The remaining time is often fractional, and a timer may truncate it and
    // fire early: the deadline expires only once the clock has reached it, so
    // an early timer is armed again for the rest (rounded up).
    const arm = () => this.#clock.setTimeout(fire, Math.max(0, Math.ceil(at - this.#clock.now())))
    const fire = () => {
      if (this.#clock.now() < at) {
        handle = arm()
        return
      }
      controller.abort(new LifecycleTimeoutError(phase, timeoutMs))
      resolve(TIMEOUT)
    }
    let handle = arm()
    return {
      expired : promise,
      signal  : controller.signal,
      passed  : () => this.#clock.now() >= at,
      cancel  : () => this.#clock.clearTimeout(handle),
    }
  }

}

export {
  LifecycleEngine,
}
