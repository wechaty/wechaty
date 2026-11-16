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
 * The private async lifecycle kernel.
 *
 * This is Tier 3 of wechaty/wechaty#2911: nothing here is reachable from a caller
 * or an implementer. The kernel owns desired-state reconciliation, intent
 * revisions, generations, attempt records, the per-generation scope and ledger,
 * generation-bound conditions, retirement order, and authority-checked recovery.
 *
 * The two ergonomic entry points (`createLifecycle` and `AsyncLifecycle`) are
 * thin shells over {@link LifecycleKernel}; they add no behaviour of their own.
 *
 * ## Model
 *
 * - **Desired state** is `'running' | 'stopped'`. User commands set it.
 * - **Intent revision** increments on every user command and is the authority
 *   token: a recovery captured against an older revision is refused.
 * - **Generation** increments per start attempt (successful or not) and owns one
 *   run's resources via an {@link AbortController} plus a {@link ResourceLedger}.
 * - A single **reconciler** worker converges observed state toward desired
 *   state. Its guard is set before any hook or observer runs, so reentrant calls
 *   from a hook/observer join the running worker instead of spawning a second.
 *
 * See wechaty/wechaty#2905 §5–§7 for the invariants this kernel enforces.
 */

import {
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}                               from './errors.ts'
import {
  diagnosticState,
  publishStateChange,
}                               from './diagnostics.ts'
import {
  ResourceLedger,
}                               from './resource-ledger.ts'
import type {
  LifecycleState,
  LifecyclePhase,
}                               from './state.ts'
import type {
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  RecoverResult,
}                               from './types.ts'

/**
 * A minimal externally-settled promise. Node 26 has `Promise.withResolvers`,
 * which Deno also supports, so we use it directly.
 */
interface Deferred<T> {
  readonly promise: Promise<T>
  resolve (value: T): void
  reject (reason?: unknown): void
}

function defer<T> (): Deferred<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>()
  return { promise, resolve, reject }
}

/**
 * Wrap an {@link AbortSignal} so a caller's wait rejects when the signal aborts,
 * cleaning up the listener on settle so no listener leaks across waits
 * (wechaty/wechaty#2905 invariant 10). Returns a function to detach.
 */
function onAbort (signal: AbortSignal | undefined, onAbortReason: (reason: unknown) => void): () => void {
  if (!signal) {
    return () => {}
  }
  if (signal.aborted) {
    onAbortReason(signal.reason)
    return () => {}
  }
  const handler = () => onAbortReason(signal.reason)
  signal.addEventListener('abort', handler, { once: true })
  return () => signal.removeEventListener('abort', handler)
}

/**
 * The record for one start attempt. Callers share the outcome; each caller gets
 * its own cancellable wait so an abort cancels only that caller
 * (wechaty/wechaty#2905 §7 "Share an attempt outcome").
 */
interface AttemptRecord {
  readonly generation: number
  readonly settled: Deferred<void>
  /** Prevents an unhandled rejection when every caller detaches before settle. */
  handled: boolean
}

/**
 * The record for one running/starting generation: its scope machinery.
 */
interface GenerationRecord {
  readonly generation: number
  readonly controller: AbortController
  readonly ledger: ResourceLedger
  readonly scope: LifecycleScope
  /** Conditions currently set by this generation, by condition name. */
  readonly conditionsSet: Set<string>
  /** Whether this generation has been retired (fences late scope callbacks). */
  retired: boolean
  /** Scope operations are fenced as soon as retirement is accepted. */
  sealed: boolean
  /** Reason reported to late registrations before the signal is aborted. */
  retirementReason: unknown
  /** Once retirement is requested, a later start cannot revive this generation. */
  retireRequested: boolean
  /** A fail() reason captured during the run, consumed by retirement. */
  failError?: { readonly error: unknown }
  /** Background task promises to join on retirement. */
  readonly tasks: Promise<void>[]
  /** The original startup hook remains generation-owned until it settles. */
  startWork: Promise<void> | undefined
  startWorkSettled: boolean
  /** A timed-out retirement is retained and joined by a later stop(). */
  retirementWork: Promise<unknown[]> | undefined
}

/**
 * A per-instance condition. Waiters bind to a generation at wait time and are
 * settled by the kernel in the same commit step as state.
 */
class ConditionImpl implements LifecycleCondition {

  /**
   * Waiters that have bound to a specific generation. Keyed by generation.
   */
  readonly #waiters = new Map<number, Set<Deferred<void>>>()

  readonly #kernel: LifecycleKernel

  readonly name: string

  constructor (
    name: string,
    kernel: LifecycleKernel,
  ) {
    this.name = name
    this.#kernel = kernel
  }

  /**
   * See {@link LifecycleCondition.wait}.
   */
  wait (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }

    const generation = this.#kernel.bindConditionGeneration()
    if (this.#kernel.conditionIsSet(generation, this.name)) {
      return Promise.resolve()
    }
    const settled = defer<void>()

    let set = this.#waiters.get(generation)
    if (!set) {
      set = new Set()
      this.#waiters.set(generation, set)
    }
    set.add(settled)

    const detach = onAbort(signal, reason => {
      set!.delete(settled)
      settled.reject(reason)
    })

    return settled.promise.finally(detach)
  }

  /**
   * Resolve every waiter bound to `generation`. Called by the kernel when the
   * generation sets the condition.
   */
  resolveFor (generation: number): void {
    const set = this.#waiters.get(generation)
    if (!set) {
      return
    }
    this.#waiters.delete(generation)
    for (const waiter of set) {
      waiter.resolve()
    }
  }

  /**
   * Reject every waiter bound to `generation`. Called by the kernel when the
   * generation fails or retires before setting the condition.
   */
  rejectFor (generation: number, reason: unknown): void {
    const set = this.#waiters.get(generation)
    if (!set) {
      return
    }
    this.#waiters.delete(generation)
    for (const waiter of set) {
      waiter.reject(reason)
    }
  }

}

/**
 * Children currently owned by some scope. Reserved synchronously in
 * `scope.start(child)` and released when the owner's stop action finishes.
 */
const OWNED_CHILDREN = new WeakSet<object>()

/**
 * The kernel. One instance per lifecycle.
 */
class LifecycleKernel {

  // ---- configuration ------------------------------------------------------

  readonly #name: string | undefined
  readonly #startTimeoutMs: number | undefined
  readonly #stopTimeoutMs: number | undefined
  readonly #hooks: LifecycleHooks

  // ---- observable state ---------------------------------------------------

  #state: LifecycleState = Object.freeze({ kind: 'stopped', generation: 0 })

  /**
   * The intent revision in force when each committed snapshot was published.
   * `recover(observed)` uses it to detect that a user command was accepted after
   * the caller took its observation: if the snapshot's stamped revision is older
   * than the live intent revision, the observation is stale and recovery is
   * superseded, even if the generation has not yet advanced because the newer
   * command's reconciliation is still pending (wechaty/wechaty#2905 §3.3).
   *
   * Keyed by snapshot identity (every commit freezes a fresh object), so entries
   * disappear once a snapshot is no longer referenced.
   */
  #stateRevision = new WeakMap<LifecycleState, number>()

  // ---- intent -------------------------------------------------------------

  /** What the service should become. */
  #desired: 'running' | 'stopped' = 'stopped'
  /** Authority token. Bumped by every user command; recovery must match it. */
  #intentRevision = 0

  // ---- generations and reconciliation ------------------------------------

  #generationSeq = 0
  #current: GenerationRecord | undefined
  /** True while the reconciler worker is running. Guards reentrancy. */
  #reconciling = false
  /** Set when a command arrives while the reconciler is running. */
  #wake = false
  /**
   * Set when a stop intent was accepted against a live generation (an explicit
   * `stop()` or the stop half of a `restart()`). It forces the reconciler to
   * retire the current generation before any replacement starts, and is cleared
   * once that retirement completes. Without it, a plain `start()` while already
   * running would wrongly retire and replace the live generation
   * (wechaty/wechaty#2905 §3.8 A: no gratuitous restart).
   */
  #mustRetireCurrent = false
  /**
   * Set when a `stop()` targets an already-dirty `failed` state, asking the
   * reconciler to drain the remaining cleanup and settle to `stopped`. Without
   * it, the dirty failure produced by a prior retirement would be cleaned up
   * automatically in the same reconcile loop, violating the rule that a dirty
   * failure persists until the user asks again (wechaty/wechaty#2905 §3.6).
   */
  #dirtyCleanupRequested = false

  // ---- attempt and condition bookkeeping ----------------------------------

  /** The attempt callers of the latest start() are waiting on. */
  #startAttempt: AttemptRecord | undefined
  /** Waiters created by whenState(), settled on every commit. */
  readonly #stateWaiters = new Set<{
    predicate: (state: LifecycleState) => boolean
    settled: Deferred<LifecycleState>
  }>()
  /** Stop waiters keyed by the generation whose release they await. */
  readonly #stopWaiters = new Map<number, Set<Deferred<void>>>()
  /** Declared conditions by name. */
  readonly #conditions = new Map<string, ConditionImpl>()

  constructor (hooks: LifecycleHooks, options?: LifecycleOptions) {
    this.#hooks = hooks
    this.#name = options?.name
    this.#startTimeoutMs = options?.startTimeoutMs
    this.#stopTimeoutMs = options?.stopTimeoutMs
  }

  // =========================================================================
  // Tier 1: caller API
  // =========================================================================

  get state (): LifecycleState {
    return this.#state
  }

  /**
   * See {@link Lifecycle.start}. Accepts intent synchronously, then waits on the
   * shared attempt outcome through a per-caller cancellable wait.
   */
  start (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
      return Promise.reject(new LifecycleUnsafeStateError('cannot start while cleanup is incomplete'))
    }

    /**
     * Already running with no pending retirement: start() is a no-op that
     * resolves at once (§3.8 A). Bump intent so a prior pending recovery is
     * superseded, but do not allocate a new attempt/generation.
     */
    if (
      this.#state.kind === 'running'
      && this.#current
      && !this.#current.retired
      && !this.#mustRetireCurrent
    ) {
      this.#intentRevision += 1
      this.#desired = 'running'
      return Promise.resolve()
    }

    this.#acceptIntent('running')
    return this.#waitStartAttempt(signal)
  }

  /**
   * See {@link Lifecycle.stop}. Accepts stop intent, then waits for the captured
   * generation's resources to be released.
   */
  stop (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }

    /**
     * A stop() on an already-dirty failure is an explicit request to retry the
     * remaining cleanup. Latch that intent here (before accepting intent) so the
     * reconciler distinguishes it from the stop that first produced the dirty
     * failure, which must persist until the user asks again
     * (wechaty/wechaty#2905 §3.6, invariant 7).
     */
    const dirtyState = this.#state
    if (dirtyState.kind === 'failed' && !dirtyState.cleanupComplete) {
      this.#dirtyCleanupRequested = true
    }
    const captured = this.#current?.generation ?? this.#state.generation
    this.#acceptIntent('stopped')
    return this.#waitStop(captured, signal)
  }

  /**
   * See {@link Lifecycle.restart}. Real retirement plus a successful replacement.
   * Implemented as stop-intent immediately followed by start-intent in the same
   * synchronous step, so the two intents coalesce into one replacement that a
   * later stop() can supersede.
   */
  restart (options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (this.#state.kind === 'failed' && !this.#state.cleanupComplete) {
      return Promise.reject(new LifecycleUnsafeStateError('cannot restart while cleanup is incomplete'))
    }

    /**
     * Mark that the current run must truly retire before the replacement starts,
     * then set desired=running. The reconciler sees desired=running with a
     * live current generation and retires it first.
     */
    this.#acceptIntent('stopped')
    this.#acceptIntent('running')
    return this.#waitStartAttempt(signal)
  }

  /**
   * See {@link Lifecycle.whenState}. Condition observation across generations.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }

    let matched: boolean
    try {
      matched = predicate(this.#state)
    } catch (error) {
      return Promise.reject(error)
    }
    if (matched) {
      return Promise.resolve(this.#state)
    }

    const settled = defer<LifecycleState>()
    const waiter = { predicate, settled }
    this.#stateWaiters.add(waiter)

    const detach = onAbort(signal, reason => {
      this.#stateWaiters.delete(waiter)
      settled.reject(reason)
    })
    return settled.promise.finally(detach)
  }

  async [Symbol.asyncDispose] (): Promise<void> {
    await this.stop()
  }

  // =========================================================================
  // Tier 2: owner-only API
  // =========================================================================

  /**
   * See {@link LifecycleController.condition}.
   */
  condition (name: string): LifecycleCondition {
    let condition = this.#conditions.get(name)
    if (!condition) {
      condition = new ConditionImpl(name, this)
      this.#conditions.set(name, condition)
    }
    return condition
  }

  /**
   * See {@link LifecycleController.recover}. Authority-checked recovery.
   */
  async recover (observed: LifecycleState): Promise<RecoverResult> {
    const revisionAtEntry = this.#intentRevision

    if (!this.#recoveryStillValid(observed, revisionAtEntry)) {
      return 'superseded'
    }
    if (observed.kind !== 'failed' || !observed.cleanupComplete) {
      throw new LifecycleUnsafeStateError('cannot recover while cleanup is incomplete')
    }

    /**
     * A recovery does not count as user intent, but it does request the service
     * to become running again after a failure. We retire any dirty generation
     * and start a replacement, re-checking authority after the old generation
     * retires so a user command in between wins (wechaty/wechaty#2905 §3.3).
     */
    this.#desired = 'running'
    this.#scheduleReconcile()

    // Wait for the reconciler to settle, then re-validate authority.
    try {
      await this.#waitStartAttempt(undefined)
    } catch (error) {
      if (error instanceof LifecycleSupersededError) {
        return 'superseded'
      }
      throw error
    }

    if (this.#intentRevision !== revisionAtEntry) {
      return 'superseded'
    }
    return 'recovered'
  }

  // =========================================================================
  // Condition generation binding (used by ConditionImpl)
  // =========================================================================

  /**
   * Return the generation a new condition wait should bind to: the current
   * starting/running generation, otherwise the next generation to start
   * (wechaty/wechaty#2911 §6.3).
   */
  bindConditionGeneration (): number {
    if (this.#current && !this.#current.retired && !this.#current.sealed) {
      return this.#current.generation
    }
    return this.#generationSeq + 1
  }

  conditionIsSet (generation: number, name: string): boolean {
    return this.#current?.generation === generation
      && this.#current.conditionsSet.has(name)
  }

  // =========================================================================
  // Intent acceptance (synchronous, before any await)
  // =========================================================================

  /**
   * Accept a user command. Bumps the intent revision (authority) and supersedes
   * any pending recovery. Then schedules the reconciler.
   */
  #acceptIntent (desired: 'running' | 'stopped'): void {
    this.#intentRevision += 1
    this.#desired = desired

    if (desired === 'stopped') {
      /**
       * A stop against a live generation must retire it before any replacement.
       * We latch this even when a restart immediately re-sets desired=running,
       * so the current run is truly retired and not silently kept alive.
       */
      if (this.#current && !this.#current.retired) {
        this.#mustRetireCurrent = true
        this.#current.retireRequested = true
        if (this.#state.kind === 'starting') {
          this.#sealAndAbort(
            this.#current,
            new LifecycleSupersededError('startup superseded'),
            true,
          )
        }
      }
      /**
       * A newly superseded start attempt must be rejected now so its callers do
       * not wait across the stop. Callers of the subsequent start (restart)
       * create a fresh attempt below.
       */
      this.#supersedeStartAttempt()
    }
    this.#scheduleReconcile()
  }

  /**
   * Reject the current start attempt's waiters with supersession and clear it.
   */
  #supersedeStartAttempt (): void {
    const attempt = this.#startAttempt
    if (attempt) {
      this.#startAttempt = undefined
      attempt.settled.reject(new LifecycleSupersededError())
    }
  }

  /**
   * Return (creating if needed) the attempt that the latest start() waits on.
   * Callers of concurrent equivalent start()s share it.
   */
  #ensureStartAttempt (): AttemptRecord {
    if (!this.#startAttempt) {
      this.#startAttempt = {
        generation : this.#generationSeq + 1,
        settled    : defer<void>(),
        handled    : false,
      }
    }
    return this.#startAttempt
  }

  /**
   * Attach a per-caller cancellable wait to the shared start attempt.
   */
  #waitStartAttempt (signal: AbortSignal | undefined): Promise<void> {
    const attempt = this.#ensureStartAttempt()
    attempt.handled = true

    const callerSettled = defer<void>()
    let done = false

    const detach = onAbort(signal, reason => {
      if (done) {
        return
      }
      done = true
      callerSettled.reject(reason)
    })

    attempt.settled.promise.then(
      () => {
        if (!done) {
          done = true
          callerSettled.resolve()
        }
      },
      error => {
        if (!done) {
          done = true
          callerSettled.reject(error)
        }
      },
    )

    return callerSettled.promise.finally(detach)
  }

  /**
   * Attach a per-caller wait for a generation's resources to be released.
   */
  #waitStop (generation: number, signal: AbortSignal | undefined): Promise<void> {
    /**
     * If the captured generation is already released (we are stopped/clean
     * failed with no current run of that generation), resolve immediately.
     */
    if (this.#generationReleased(generation)) {
      return Promise.resolve()
    }

    const settled = defer<void>()
    let set = this.#stopWaiters.get(generation)
    if (!set) {
      set = new Set()
      this.#stopWaiters.set(generation, set)
    }
    set.add(settled)

    const detach = onAbort(signal, reason => {
      set!.delete(settled)
      settled.reject(reason)
    })
    return settled.promise.finally(detach)
  }

  /**
   * Whether the given generation's resources are known to be released.
   */
  #generationReleased (generation: number): boolean {
    if (this.#current && this.#current.generation === generation && !this.#current.retired) {
      return false
    }
    const state = this.#state
    if (state.kind === 'failed' && state.generation === generation && !state.cleanupComplete) {
      return false
    }
    return true
  }

  // =========================================================================
  // Recovery authority
  // =========================================================================

  #recoveryStillValid (observed: LifecycleState, revisionAtEntry: number): boolean {
    if (
      this.#intentRevision !== revisionAtEntry
      || observed !== this.#state
      || observed.kind !== 'failed'
    ) {
      return false
    }
    /**
     * The observation must date from the current intent. A user command accepted
     * after the caller took its snapshot bumps the intent revision synchronously,
     * but its generation change may still be pending reconciliation; comparing the
     * snapshot's stamped revision to the live one catches that race so recover()
     * does not act on an observation the user already invalidated.
     */
    const observedRevision = this.#stateRevision.get(observed)
    if (observedRevision !== revisionAtEntry) {
      return false
    }
    return true
  }

  // =========================================================================
  // Reconciler (single worker)
  // =========================================================================

  #scheduleReconcile (): void {
    if (this.#reconciling) {
      this.#wake = true
      return
    }
    this.#reconciling = true
    /**
     * Run on a microtask so intent acceptance stays synchronous and multiple
     * commands in the same tick coalesce before the worker reads desired state.
     */
    queueMicrotask(() => {
      this.#reconcileLoop().catch(() => {
        /* The loop never rejects; this is belt-and-suspenders. */
      })
    })
  }

  async #reconcileLoop (): Promise<void> {
    try {
      for (;;) {
        this.#wake = false
        await this.#reconcileOnce()
        if (!this.#wake && !this.#needsWork()) {
          break
        }
      }
    } finally {
      this.#reconciling = false
      /**
       * A command may have arrived during the final iteration's await after we
       * decided to break. Re-check and reschedule if so.
       */
      if (this.#needsWork()) {
        this.#scheduleReconcile()
      }
    }
  }

  /**
   * Whether observed state still differs from desired state in a way the
   * reconciler can act on.
   */
  #needsWork (): boolean {
    const state = this.#state
    if (this.#desired === 'running') {
      // A dirty failure blocks a new generation until cleanup succeeds.
      if (state.kind === 'failed' && !state.cleanupComplete) {
        return false
      }
      // A pending retirement (restart) must run even though we are running.
      if (this.#mustRetireCurrent && this.#current && !this.#current.retired) {
        return true
      }
      return state.kind !== 'running' && state.kind !== 'starting'
    }
    // desired === 'stopped'
    if (state.kind === 'failed') {
      return !state.cleanupComplete && this.#dirtyCleanupRequested
    }
    return state.kind !== 'stopped'
  }

  async #reconcileOnce (): Promise<void> {
    const state = this.#state

    if (this.#desired === 'running') {
      if (this.#current && !this.#current.retired) {
        /**
         * A live generation exists. Only retire it when a stop intent was latched
         * (restart); a plain start() while running is a no-op (§3.8 A). The retire
         * clears the latch so the next loop starts a fresh replacement.
         */
        if (this.#mustRetireCurrent && state.kind === 'running') {
          this.#mustRetireCurrent = false
          await this.#retire('start')
        }
        return
      }
      if (state.kind === 'failed' && !state.cleanupComplete) {
        return // blocked until cleanup
      }
      if (state.kind === 'stopped' || (state.kind === 'failed' && state.cleanupComplete)) {
        await this.#runStart()
      }
      return
    }

    // desired === 'stopped'
    if (this.#current && !this.#current.retired) {
      this.#mustRetireCurrent = false
      // Consume the explicit dirty-retry request exactly once: a retry that
      // fails again stays dirty until the next explicit stop(), never spins.
      this.#dirtyCleanupRequested = false
      await this.#retire('stop')
      return
    }
    if (state.kind === 'failed' && !state.cleanupComplete && this.#dirtyCleanupRequested) {
      // An explicit stop() on a dirty failure retries the remaining cleanup.
      this.#dirtyCleanupRequested = false
      await this.#retryDirtyCleanup()
    }
  }

  // =========================================================================
  // Start runner
  // =========================================================================

  async #runStart (): Promise<void> {
    const generation = ++this.#generationSeq
    const controller = new AbortController()
    const ledger = new ResourceLedger()

    const record: GenerationRecord = {
      generation,
      controller,
      ledger,
      conditionsSet : new Set(),
      retired       : false,
      sealed        : false,
      retirementReason: undefined,
      retireRequested: false,
      tasks         : [],
      scope         : undefined as unknown as LifecycleScope,
      startWork     : undefined,
      startWorkSettled: false,
      retirementWork: undefined,
    }
    ;(record as { scope: LifecycleScope }).scope = this.#makeScope(record)
    this.#current = record

    // Ensure the attempt that callers wait on is bound to this generation.
    const attempt = this.#ensureStartAttempt()

    this.#commit({ kind: 'starting', generation })

    let startError: unknown
    let startFailed = false
    try {
      record.startWork = Promise.resolve().then(() => this.#hooks.onStart(record.scope))
      record.startWork = record.startWork.then(
        () => { record.startWorkSettled = true },
        error => {
          record.startWorkSettled = true
          throw error
        },
      )
      await this.#withTimeout(
        record.startWork,
        this.#startTimeoutMs,
        'start',
        controller,
      )
    } catch (error) {
      startFailed = true
      startError = error
    }

    /**
     * Revalidate intent and generation after onStart settles. A superseded or
     * aborted start must never publish running (wechaty/wechaty#2905 §6 item 4).
     */
    const supersededByIntent = this.#desired !== 'running'
      || record.retireRequested
      || record.retired
      || this.#current !== record
    const superseded = supersededByIntent
      || controller.signal.aborted

    if (!startFailed && !record.failError && !superseded) {
      this.#settleStartAttempt(attempt, true)
      this.#commit({ kind: 'running', generation })
      return
    }

    /**
     * Either onStart failed, a fail() landed, or intent was superseded. Retire
     * this generation. The commit is failed (start) when there was a real error,
     * otherwise the retirement proceeds toward stopped.
     */
    const failureError = startFailed
      ? startError
      : record.failError?.error
    if (supersededByIntent && !record.failError) {
      // Superseded cleanly before running: retire to stopped, reject attempt.
      await this.#retireAfterStartFailure(record, 'start', undefined, attempt, true)
    } else {
      await this.#retireAfterStartFailure(record, 'start', failureError, attempt, false)
    }
  }

  /**
   * Settle a start attempt's shared outcome and clear it if still current.
   */
  #settleStartAttempt (attempt: AttemptRecord, succeeded: boolean, error?: unknown): void {
    if (this.#startAttempt === attempt) {
      this.#startAttempt = undefined
    }
    if (succeeded) {
      attempt.settled.resolve()
    } else {
      attempt.settled.reject(error)
    }
  }

  // =========================================================================
  // Retirement (§6.5)
  // =========================================================================

  /**
   * Retire the current running generation because desired flipped to stopped
   * (`reason: 'stop'`) or because a restart needs a fresh run (`reason: 'start'`).
   */
  async #retire (reason: 'start' | 'stop'): Promise<void> {
    const record = this.#current
    if (!record || record.retired) {
      return
    }

    const generation = record.generation
    const failedWhileRunning = record.failError !== undefined
    this.#sealAndAbort(
      record,
      new LifecycleSupersededError('generation retirement requested'),
      failedWhileRunning,
    )
    this.#commit({ kind: 'stopping', generation })

    const errors = await this.#runRetirement(record, true, failedWhileRunning)

    const cleanupComplete = errors.length === 0

    if (!cleanupComplete) {
      const cleanupError = this.#aggregate(errors)
      const failedAttempt = this.#startAttempt
      if (failedAttempt) {
        this.#settleStartAttempt(failedAttempt, false, cleanupError)
      }
      this.#rejectConditions(record, cleanupError)
      this.#commit({
        kind            : 'failed',
        generation,
        phase           : failedWhileRunning ? 'run' : 'stop',
        error           : failedWhileRunning ? record.failError?.error : cleanupError,
        cleanupComplete : false,
        cleanupError,
      })
      this.#rejectStopWaiters(generation, cleanupError)
      return
    }

    record.retired = true
    this.#mustRetireCurrent = false
    this.#current = undefined
    this.#rejectConditions(record, new LifecycleSupersededError('generation retired'))

    if (failedWhileRunning) {
      this.#commit({
        kind            : 'failed',
        generation,
        phase           : 'run',
        error           : record.failError!.error,
        cleanupComplete : true,
      })
    } else {
      this.#commit({ kind: 'stopped', generation })
    }
    this.#resolveStopWaiters(generation)

    if (reason === 'start') {
      /**
       * Restart: desired is running again. Re-validate it is still running (a
       * later stop() may have superseded) before the loop starts a replacement.
       */
      if (this.#desired !== 'running') {
        this.#supersedeStartAttempt()
      }
    }
  }

  /**
   * Retire a generation whose start failed or was superseded.
   */
  async #retireAfterStartFailure (
    record: GenerationRecord,
    phase: LifecyclePhase,
    error: unknown,
    attempt: AttemptRecord,
    superseded: boolean,
  ): Promise<void> {
    const generation = record.generation
    if (this.#startAttempt === attempt) {
      // End this attempt now so a new start accepted during cleanup gets its own
      // outcome instead of being folded into the attempt that is already failing.
      this.#startAttempt = undefined
      this.#desired = 'stopped'
    }
    this.#sealAndAbort(
      record,
      error ?? new LifecycleSupersededError('startup ended'),
      true,
    )

    if (!record.startWorkSettled) {
      const cleanupError = new LifecycleUnsafeStateError('startup hook is still running')
      this.#settleStartAttempt(attempt, false, error)
      if (this.#startAttempt && this.#startAttempt !== attempt) {
        this.#settleStartAttempt(this.#startAttempt, false, cleanupError)
      }
      this.#rejectConditions(record, cleanupError)
      this.#commit({
        kind            : 'failed',
        generation,
        phase,
        error,
        cleanupComplete : false,
        cleanupError,
      })
      this.#rejectStopWaiters(generation, cleanupError)
      return
    }

    this.#commit({ kind: 'stopping', generation })

    const errors = await this.#runRetirement(record, true, true)

    const cleanupComplete = errors.length === 0
    const cleanupError = cleanupComplete ? undefined : this.#aggregate(errors)

    if (superseded && error === undefined) {
      // Clean supersession before running.
      if (!cleanupComplete) {
        this.#settleStartAttempt(attempt, false, cleanupError)
        if (this.#startAttempt && this.#startAttempt !== attempt) {
          this.#settleStartAttempt(this.#startAttempt, false, cleanupError)
        }
        this.#commit({
          kind: 'failed', generation, phase: 'stop', error: cleanupError,
          cleanupComplete: false, cleanupError,
        })
        this.#rejectStopWaiters(generation, cleanupError)
        return
      }
      record.retired = true
      this.#mustRetireCurrent = false
      this.#current = undefined
      this.#rejectConditions(record, new LifecycleSupersededError('generation retired'))
      this.#settleStartAttempt(attempt, false, new LifecycleSupersededError())
      this.#commit({ kind: 'stopped', generation })
      this.#resolveStopWaiters(generation)
      return
    }

    if (cleanupComplete) {
      record.retired = true
      this.#mustRetireCurrent = false
      this.#current = undefined
    } else if (this.#startAttempt && this.#startAttempt !== attempt) {
      this.#settleStartAttempt(this.#startAttempt, false, cleanupError)
    }
    this.#rejectConditions(record, error)
    this.#settleStartAttempt(attempt, false, error)
    this.#commit({
      kind            : 'failed',
      generation,
      phase,
      error,
      cleanupComplete,
      ...(cleanupError !== undefined ? { cleanupError } : {}),
    })
    if (cleanupComplete) {
      this.#resolveStopWaiters(generation)
    } else {
      this.#rejectStopWaiters(generation, cleanupError)
    }
  }

  /**
   * Retry the remaining cleanup for a dirty `failed` state.
   */
  async #retryDirtyCleanup (): Promise<void> {
    const state = this.#state
    if (state.kind !== 'failed' || state.cleanupComplete) {
      return
    }
    const generation = state.generation
    const record = this.#current
    if (!record || record.generation !== generation) {
      const error = new LifecycleUnsafeStateError('failed generation cleanup is unavailable')
      this.#rejectStopWaiters(generation, error)
      return
    }
    const errors = await this.#runRetirement(record, true, true)
    if (errors.length > 0) {
      const cleanupError = this.#aggregate(errors)
      this.#commit({
        kind            : 'failed',
        generation,
        phase           : state.phase,
        error           : state.error,
        cleanupComplete : false,
        cleanupError,
      })
      this.#rejectStopWaiters(generation, cleanupError)
      return
    }
    record.retired = true
    this.#mustRetireCurrent = false
    this.#current = undefined
    this.#rejectConditions(record, new LifecycleSupersededError('generation retired'))
    this.#commit({ kind: 'stopped', generation })
    this.#resolveStopWaiters(generation)
  }

  /**
   * Fence new scope operations immediately and optionally interrupt the run.
   */
  #sealAndAbort (
    record: GenerationRecord,
    reason: unknown,
    abortFirst = false,
  ): void {
    if (!record.sealed) {
      record.retirementReason = reason === undefined
        ? new LifecycleSupersededError('generation retired')
        : reason
    }
    record.sealed = true
    record.ledger.seal()
    if (abortFirst && !record.controller.signal.aborted) {
      record.controller.abort(record.retirementReason)
    }
  }

  /**
   * Run or join retirement under one deadline, retaining timed-out work for retry.
   */
  async #runRetirement (
    record: GenerationRecord,
    graceful: boolean,
    abortFirst: boolean,
  ): Promise<unknown[]> {
    if (record.retirementWork) {
      try {
        const previousErrors = await this.#withTimeout(
          record.retirementWork,
          this.#stopTimeoutMs,
          'stop',
          record.controller,
        )
        record.retirementWork = undefined
        if (previousErrors.length === 0) {
          return previousErrors
        }
      } catch (error) {
        return [ error ]
      }
    }

    const work = this.#performRetirement(record, graceful, abortFirst)
    record.retirementWork = work
    try {
      const errors = await this.#withTimeout(
        work,
        this.#stopTimeoutMs,
        'stop',
        record.controller,
      )
      if (record.retirementWork === work) {
        record.retirementWork = undefined
      }
      return errors
    } catch (error) {
      return [ error ]
    }
  }

  /**
   * Run graceful hooks, interruption, startup joining, and ledger cleanup.
   */
  async #performRetirement (
    record: GenerationRecord,
    graceful: boolean,
    abortFirst: boolean,
  ): Promise<unknown[]> {
    const errors: unknown[] = []

    this.#sealAndAbort(
      record,
      new LifecycleSupersededError('generation retired'),
      abortFirst,
    )

    if (!record.startWorkSettled && record.startWork) {
      try {
        await record.startWork
      } catch {
        // The start failure is reported by the start attempt, not cleanup.
      }
    }

    if (graceful && this.#hooks.onStop) {
      try {
        await Promise.resolve(this.#hooks.onStop(record.scope))
      } catch (error) {
        errors.push(error)
      }
    }

    // Interrupt step: abort the scope signal so listeners and tasks wind down.
    if (!record.controller.signal.aborted) {
      record.controller.abort(new LifecycleSupersededError('generation retired'))
    }

    const ledgerErrors = await record.ledger.unwind()
    errors.push(...ledgerErrors)

    return errors
  }

  // =========================================================================
  // Scope factory
  // =========================================================================

  #makeScope (record: GenerationRecord): LifecycleScope {
    const kernel = this

    const isActive = () => !record.retired && !record.sealed && kernel.#current === record
    const abortReason = () => record.retirementReason

    return {
      signal: record.controller.signal,

      use (resource) {
        const disposer = async () => {
          const anyRes = resource as Partial<AsyncDisposable & Disposable>
          if (typeof anyRes[Symbol.asyncDispose] === 'function') {
            await anyRes[Symbol.asyncDispose]!()
          } else if (typeof anyRes[Symbol.dispose] === 'function') {
            anyRes[Symbol.dispose]!()
          }
        }
        if (!record.ledger.register(disposer)) {
          void record.ledger.releaseLate(disposer).catch(() => {})
          throw abortReason()
        }
        return resource
      },

      adopt (resource, release) {
        const disposer = () => release(resource)
        if (!record.ledger.register(disposer)) {
          void record.ledger.releaseLate(disposer).catch(() => {})
          throw abortReason()
        }
        return resource
      },

      defer (cleanup) {
        if (!record.ledger.register(cleanup)) {
          void record.ledger.releaseLate(cleanup).catch(() => {})
          throw abortReason()
        }
      },

      spawn (task) {
        let taskPromise: Promise<void> = Promise.resolve()
        if (!record.ledger.register(() => taskPromise, true)) {
          throw abortReason()
        }
        taskPromise = Promise.resolve().then(async () => {
          try {
            await task(record.controller.signal)
          } catch (error) {
            if (record.controller.signal.aborted && error === record.controller.signal.reason) {
              return // expected abort
            }
            if (isActive()) {
              kernel.#scopeFail(record, error)
            }
          }
        })
        record.tasks.push(taskPromise)
      },

      async start (child) {
        if (!isActive()) {
          throw abortReason()
        }
        const childState = child.state
        const safe = childState.kind === 'stopped'
          || (childState.kind === 'failed' && childState.cleanupComplete)
        if (!safe) {
          throw new LifecycleUnsafeStateError(
            `child lifecycle is in unsafe state '${childState.kind}'`,
          )
        }

        // Exclusive ownership is reserved synchronously, before the child's own
        // asynchronous reconciler publishes `starting`, so two parents racing on
        // one stopped child cannot both adopt it.
        if (OWNED_CHILDREN.has(child)) {
          throw new LifecycleUnsafeStateError('child lifecycle is already owned by a scope')
        }
        // Register ownership before starting: stop the child during unwind.
        if (!record.ledger.register(async () => {
          try {
            await child.stop()
          } finally {
            OWNED_CHILDREN.delete(child)
          }
        })) {
          throw abortReason()
        }
        OWNED_CHILDREN.add(child)
        record.controller.signal.addEventListener(
          'abort',
          () => { void child.stop().catch(() => {}) },
          { once: true },
        )
        let watch: Promise<void> = Promise.resolve()
        if (!record.ledger.register(() => watch, true)) {
          throw abortReason()
        }

        await child.start({ signal: record.controller.signal })

        // Watch the child: an unrequested exit from running fails the parent.
        watch = (async () => {
          try {
            await child.whenState(
              // `stopping` is transient: wait for the terminal snapshot so the
              // child's original failure is preserved as the parent's cause.
              state => state.kind === 'failed'
                || state.kind === 'stopped',
              { signal: record.controller.signal },
            )
          } catch {
            return // parent is retiring; stop watching
          }
          if (!isActive()) {
            return
          }
          const s = child.state
          const cause = s.kind === 'failed' ? s.error : undefined
          kernel.#scopeFail(
            record,
            new Error('owned child lifecycle exited unexpectedly', { cause }),
          )
        })()
        record.tasks.push(watch)
      },

      set (condition) {
        if (!isActive()) {
          return
        }
        const impl = condition as ConditionImpl
        record.conditionsSet.add(impl.name)
        impl.resolveFor(record.generation)
      },

      clear (condition) {
        if (!isActive()) {
          return
        }
        record.conditionsSet.delete((condition as ConditionImpl).name)
      },

      fail (error) {
        if (!isActive()) {
          return
        }
        kernel.#scopeFail(record, error)
      },
    }
  }

  /**
   * Handle a `scope.fail()` or task/child failure for a generation.
   */
  #scopeFail (record: GenerationRecord, error: unknown): void {
    if (record.retired || record.sealed || this.#current !== record) {
      return
    }
    if (!record.failError) {
      record.failError = { error }
    }
    this.#rejectConditions(record, error)

    const state = this.#state
    if (state.generation === record.generation) {
      if (state.kind === 'starting') {
        this.#sealAndAbort(record, error, true)
      } else if (state.kind === 'running') {
        this.#desired = 'stopped'
        this.#mustRetireCurrent = true
        this.#scheduleReconcile()
      }
    }
  }

  // =========================================================================
  // Commit: freeze snapshot, settle waiters, notify observers
  // =========================================================================

  #commit (next: LifecycleState): void {
    const previous = this.#state
    const frozen = Object.freeze(next)
    this.#state = frozen
    this.#stateRevision.set(frozen, this.#intentRevision)

    // Settle whenState waiters whose predicate now matches, before observers.
    for (const waiter of [ ...this.#stateWaiters ]) {
      let matched: boolean
      try {
        matched = waiter.predicate(frozen)
      } catch (error) {
        this.#stateWaiters.delete(waiter)
        waiter.settled.reject(error)
        continue
      }
      if (matched) {
        this.#stateWaiters.delete(waiter)
        waiter.settled.resolve(frozen)
      }
    }

    // Diagnostics after commit, never affecting the outcome.
    publishStateChange({
      name: this.#name,
      state: diagnosticState(frozen),
      previous: diagnosticState(previous),
    })

    // Observer runs last and is isolated.
    if (this.#hooks.onStateChange) {
      try {
        this.#hooks.onStateChange(frozen, previous)
      } catch {
        /* isolated: an observer exception never affects reconciliation */
      }
    }
  }

  // =========================================================================
  // Waiter settlement helpers
  // =========================================================================

  #resolveStopWaiters (generation: number): void {
    const set = this.#stopWaiters.get(generation)
    if (!set) {
      return
    }
    this.#stopWaiters.delete(generation)
    for (const waiter of set) {
      waiter.resolve()
    }
  }

  #rejectStopWaiters (generation: number, reason: unknown): void {
    const set = this.#stopWaiters.get(generation)
    if (!set) {
      return
    }
    this.#stopWaiters.delete(generation)
    for (const waiter of set) {
      waiter.reject(reason)
    }
  }

  #rejectConditions (record: GenerationRecord, reason: unknown): void {
    for (const condition of this.#conditions.values()) {
      condition.rejectFor(record.generation, reason)
    }
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  #aggregate (errors: unknown[]): unknown {
    if (errors.length === 1) {
      return errors[0]
    }
    return new AggregateError(errors, 'lifecycle cleanup failed')
  }

  /**
   * Race a hook promise against a deadline. On expiry, abort the scope controller
   * and reject with {@link LifecycleTimeoutError}. The hook keeps running but is
   * fenced; a stop hook that outlives its deadline keeps the generation dirty
   * (wechaty/wechaty#2911 §9).
   */
  async #withTimeout<T> (
    work: Promise<T>,
    timeoutMs: number | undefined,
    phase: 'start' | 'stop',
    controller: AbortController,
  ): Promise<T> {
    if (timeoutMs === undefined) {
      return work
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort(new LifecycleTimeoutError(phase, timeoutMs))
        }
        reject(new LifecycleTimeoutError(phase, timeoutMs))
      }, timeoutMs)
    })
    try {
      return await Promise.race([ work, timeout ])
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }

}

/**
 * Build the public {@link LifecycleController} facade over a kernel. Shared by
 * both entry points so the caller surface is identical.
 */
function toController (kernel: LifecycleKernel): LifecycleController {
  return {
    get state () { return kernel.state },
    start    : options => kernel.start(options),
    stop     : options => kernel.stop(options),
    restart  : options => kernel.restart(options),
    whenState: (predicate, options) => kernel.whenState(predicate, options),
    condition: name => kernel.condition(name),
    recover  : observed => kernel.recover(observed),
    [Symbol.asyncDispose]: () => kernel[Symbol.asyncDispose](),
  }
}

export type {
  Lifecycle,
}
export {
  LifecycleKernel,
  toController,
}
