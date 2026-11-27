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
 * One generation (one run) and the scope its hooks receive.
 *
 * Owns a run's private machinery: its `AbortController`, its {@link Ledger}, its
 * seal, and the per-run flags the engine reads during retirement. The scope built
 * here is the only object an implementer touches; every method checks this
 * generation's seal, which is what fences a stale callback (wechaty/wechaty#2911,
 * consolidated v1 design, rule 2 "authority lives in the scope").
 *
 * Boundary: this module never commits state, settles caller promises or decides
 * retirement. Anything that needs the engine (failure, recovery, conditions, late
 * debt) goes through the narrow {@link ScopeHost} interface.
 */

import {
  LifecycleChildFailureError,
  LifecycleUnsafeStateError,
}                           from './errors.ts'
import {
  Ledger,
  type Release,
}                           from './ledger.ts'
import {
  listen,
}                           from './companions/listen.ts'
import {
  operation,
}                           from './companions/operation.ts'
import {
  watchdog,
}                           from './companions/watchdog.ts'
import type {
  Lifecycle,
  LifecycleClock,
  LifecycleCondition,
  LifecycleConditionHandle,
  LifecycleFailurePhase,
  LifecycleScope,
  LifecycleStopReason,
  LifecycleRecoverResult,
}                           from './types.ts'

/** What a scope needs from its engine. Implemented by `engine.ts`. */
interface ScopeHost {
  /** Report that `generation` can no longer run. Ignored once it is sealed. */
  fail (generation: Generation, error: unknown): void
  /** See {@link LifecycleScope.recover}: decides at once, never throws (D42). */
  recover (generation: Generation, reason: unknown): LifecycleRecoverResult
  /**
   * A release was registered on `generation` after it was sealed. `start` runs
   * it and returns its run, which rejects if it fails. The engine calls `start`
   * itself, after recording the obligation, so a command the release calls
   * reentrantly already sees it. It decides whether the release belongs to that
   * generation's own retirement (C-SCOPE-02) or is a late release, an
   * obligation of the instance (C-SCOPE-11, D31).
   */
  lateRelease (generation: Generation, start: () => Promise<void>): void
  /** Set or clear a condition; throws `TypeError` for a foreign condition. */
  setCondition (generation: Generation, condition: LifecycleCondition, value: boolean): void
  /** Look up or declare a condition on the engine. */
  condition (name: string): LifecycleConditionHandle
  /** The clock used for deadlines and timers. */
  readonly clock: LifecycleClock
}

/**
 * The private record of one run. Fields are mutated only by the engine and by
 * the scope built in {@link createScope}.
 */
class Generation {

  readonly number: number
  readonly controller = new AbortController()
  readonly ledger = new Ledger()
  /** Resolved when retirement is requested, to wake the start runner. */
  readonly retireRequested = Promise.withResolvers<void>()
  scope!: LifecycleScope

  /** `onStart` became `running`. Only such a run gets `onStop`. */
  reachedRunning = false
  /** Retirement has begun: registrations are refused and conditions are frozen. */
  sealed = false
  /** Thrown to late registrations (C-SCOPE-02); condition waits get `LifecycleSupersededError` with it as `cause` when it is a failure (D28). */
  sealReason: unknown = undefined
  /** Why this run is retiring; `undefined` while it is live. */
  retireReason: LifecycleStopReason | undefined = undefined
  /** The failure that ended this run, if any. Boxed so falsy errors survive. */
  failure: { readonly phase: LifecycleFailurePhase, readonly error: unknown } | undefined = undefined
  /** The `onStart` call, joined during retirement. */
  startWork: Promise<void> | undefined = undefined
  startSettled = false
  /** `onStop` runs at most once per generation, even across cleanup retries. */
  onStopCalled = false
  /**
   * Errors from interrupts that ran outside the interrupt pass: an acquisition
   * that finished after the pass gets its interrupt then. Retirement drains
   * these after unwinding, so they are reported like any other interrupt error.
   */
  readonly lateInterruptErrors: unknown[] = []
  /**
   * Retirement work that is still running, possibly past a stop deadline. A later
   * retirement pass joins it first, so timed-out work is never forgotten.
   */
  retirement: Promise<unknown[]> | undefined = undefined
  /** The last retirement left owned resources behind; only a `stop()` retries. */
  dirty = false
  /** Fully released and detached from the engine. */
  retired = false
  /**
   * Its retirement after a failure left nothing owned but late releases still
   * running (D31): the engine commits again once they finish.
   */
  awaitingLate = false
  /**
   * The cleanup errors of the retirement that set {@link Generation.awaitingLate}
   * (an `onStop` that threw, a failed release), kept for the outcome published
   * once the late releases finish.
   */
  awaitingErrors: unknown[] = []
  /**
   * The last retirement pass's own cleanup errors (`onStop`, interrupts, its
   * own releases), kept apart from debt errors, which stay in the debtors'
   * ledgers and must not be reported twice.
   */
  localErrors: unknown[] = []
  /**
   * The entries whose failure its retirement's unwind returned
   * (`UnwindOptions.reported`), not every entry failed when that pass resumed.
   * A release on its sealed scope that fails in the turns after the unwind is
   * not in this set, so the caller reports it, once. Do not replace this with a
   * `failedEntries()` snapshot: that would hide such a failure.
   */
  failedAfterUnwind: ReadonlySet<object> = new Set()
  /**
   * The debt (failed late-release entries by generation) when its retirement
   * was first requested, before its signal was aborted. Its first retirement
   * pass retries exactly this; a failure that appears later is reported.
   */
  debtAtRequest: ReadonlyMap<Generation, ReadonlySet<object>> | undefined = undefined
  /**
   * `clock.now()` when its retirement was first requested, before its signal
   * was aborted: where its first retirement pass's stop deadline starts
   * (C-TIME-03, D30). A retry pass starts from its own `stop()` instead.
   */
  retireAt: number | undefined = undefined
  /**
   * Its start failed because a late release failed meanwhile (C-SCOPE-11): that
   * debt is reported, not retried by this generation's own retirement.
   */
  debtFailure = false

  constructor (number: number) {
    this.number = number
  }

}

/** Where the shared ownership registry lives on `globalThis` (D21). */
const OWNED_CHILDREN_KEY = Symbol.for('scopelet.owned-children')

/**
 * The realm's child-ownership registry, shared by every installed copy of this
 * module (C-CHILD-02, D21). Two copies, for example one installed under `wechaty`
 * and one under `wechaty-puppet`, would otherwise each keep their own set, and two
 * parents could own the same child. The first copy to load creates it under a
 * `Symbol.for` key, as a non-enumerable, non-writable property, so the child
 * object is never touched (a `createLifecycle` controller is frozen). If that
 * key holds something else, this copy keeps a private set rather than trusting
 * it. If the global cannot take the property (a frozen `globalThis`, as under
 * SES lockdown), this copy also keeps a private set: the module still loads,
 * and ownership is then shared only within this copy.
 *
 * Limit: the registry is per realm. A child passed into another realm (a
 * Node.js `vm` context, a same-origin frame) meets that realm's registry, so a
 * parent in each realm could claim it; cross-realm ownership is unsupported.
 *
 * `global` is `globalThis`; a test passes its own object to check the branches
 * without touching the realm's registry.
 */
function ownedChildren (global: Record<symbol, unknown> = globalThis as Record<symbol, unknown>): WeakSet<Lifecycle> {
  if (!Object.hasOwn(global, OWNED_CHILDREN_KEY)) {
    try {
      Object.defineProperty(global, OWNED_CHILDREN_KEY, {
        value        : new WeakSet<Lifecycle>(),
        enumerable   : false,
        writable     : false,
        configurable : false,
      })
    } catch {
      return new WeakSet<Lifecycle>()
    }
  }
  const shared = global[OWNED_CHILDREN_KEY]
  return shared instanceof WeakSet ? shared as WeakSet<Lifecycle> : new WeakSet<Lifecycle>()
}

/**
 * Children owned by some scope, in this realm (see {@link ownedChildren}, which
 * also says why cross-realm ownership is unsupported).
 * Reserved synchronously before `child.start()` and released only after the
 * owner's stop of that child succeeded, so a second parent can never adopt a
 * child the first one may still stop.
 */
const OWNED_CHILDREN = ownedChildren()

/** Whether `value` is a promise-like (has a callable `then`). */
function isPromiseLike (value: unknown): value is PromiseLike<unknown> {
  return (typeof value === 'object' || typeof value === 'function')
    && value !== null
    && typeof (value as { then?: unknown }).then === 'function'
}

/** Build the disposer for a `use()`d resource, or throw `TypeError`. */
function disposerOf (resource: AsyncDisposable | Disposable): Release {
  const candidate = resource as Partial<AsyncDisposable & Disposable>
  const asyncDispose = candidate[Symbol.asyncDispose]
  if (typeof asyncDispose === 'function') {
    return () => asyncDispose.call(resource)
  }
  const dispose = candidate[Symbol.dispose]
  if (typeof dispose === 'function') {
    return () => { dispose.call(resource) }
  }
  throw new TypeError('scope.use() needs a Symbol.asyncDispose or Symbol.dispose method')
}

/**
 * Build the scope handed to `onStart` for `generation`.
 */
function createScope (generation: Generation, host: ScopeHost): LifecycleScope {
  const signal = generation.controller.signal

  /**
   * A registration that arrives after sealing: release it now, keep it owned
   * until that succeeds, and throw the retirement reason to the caller.
   */
  const late = (release: Release): never => {
    host.lateRelease(generation, () => generation.ledger.addLate(release))
    throw generation.sealReason
  }

  return Object.freeze<LifecycleScope>({
    generation: generation.number,
    signal,

    acquire<T> (
      create: (signal: AbortSignal) => T | PromiseLike<T>,
      release: (resource: T) => void | PromiseLike<void>,
      options?: { readonly interrupt?: (resource: T) => unknown },
    ): Promise<T> {
      if (generation.sealed) {
        return Promise.reject(generation.sealReason)
      }
      let created: { readonly resource: T } | undefined
      let interruptPending = false
      let creating!: Promise<T>
      // A promise-like its interrupt returned: the resource is not released
      // before it settles (C-SCOPE-05, D38). Its rejection is reported once by
      // the ledger join, so here it is only waited for, through the same native
      // promise: the interrupt's thenable is subscribed to once.
      let interrupting: Promise<unknown> | undefined
      const interrupted = (result: unknown) => {
        if (isPromiseLike(result)) {
          interrupting = generation.ledger.addJoin(result)
        }
      }
      const entry = async () => {
        let resource: T
        try {
          resource = await creating
        } catch {
          return // nothing was acquired
        }
        if (interrupting) {
          await interrupting.catch(() => {})
        }
        await release(resource)
      }
      // Ownership first: the release is on the ledger before `create` runs.
      generation.ledger.add({
        release: entry,
        interrupt: options?.interrupt && (() => {
          if (created) {
            interrupted(options.interrupt!(created.resource))
          } else {
            // Still creating: interrupt as soon as the resource exists, before
            // this entry's release (and so before any newer entry is released).
            interruptPending = true
          }
        }),
      })
      creating = (async () => create(signal))()
      // A failed creation holds nothing, so it leaves no obligation behind and a
      // retry loop does not grow the ledger (C-SCOPE-04).
      creating.catch(() => generation.ledger.discard(entry))
      // Registered before the ledger's release awaits `creating`, so a pending
      // interrupt always runs before the release.
      return creating.then(resource => {
        created = { resource }
        if (interruptPending) {
          interruptPending = false
          try {
            interrupted(options!.interrupt!(resource))
          } catch (error) {
            generation.lateInterruptErrors.push(error)
          }
        }
        if (generation.sealed) {
          // Retirement began while creating: the ledger entry releases it.
          throw generation.sealReason
        }
        return resource
      })
    },

    use<T extends AsyncDisposable | Disposable> (resource: T): T {
      const release = disposerOf(resource)
      if (!generation.ledger.add({ release })) {
        late(release)
      }
      return resource
    },

    defer (cleanup: () => void | PromiseLike<void>): void {
      if (!generation.ledger.add({ release: cleanup })) {
        late(cleanup)
      }
    },

    spawn (task: (signal: AbortSignal) => Promise<void>): void {
      let finished!: Promise<void>
      let retiringFailure: { readonly error: unknown } | undefined
      const join = async () => {
        await finished
        if (retiringFailure) {
          throw retiringFailure.error
        }
      }
      const registered = generation.ledger.add({
        release: join,
        // The task already ended; report its failure once instead of retrying.
        retryable: false,
        join: true,
      })
      if (!registered) {
        throw generation.sealReason
      }
      // A task that ends cleanly leaves nothing to join: drop its entry, so a
      // long run spawning many short tasks (one per operation, C-COMP-03) does
      // not grow its ledger until retirement. An entry an unwind is already
      // joining is left to finish (discard only drops an idle one), and a
      // failed task keeps its entry so the failure is reported.
      const done = () => generation.ledger.discard(join)
      finished = (async () => task(signal))().then(
        done,
        (error: unknown) => {
          if (signal.aborted && error === signal.reason) {
            done()
            return // its own cancellation, not a failure
          }
          if (generation.sealed) {
            retiringFailure = { error }
          } else {
            host.fail(generation, error)
          }
        },
      )
    },

    async start (child: Lifecycle): Promise<void> {
      if (generation.sealed) {
        throw generation.sealReason
      }
      const state = child.state
      if (!(state.kind === 'stopped' || (state.kind === 'failed' && state.cleanupComplete))) {
        throw new LifecycleUnsafeStateError(`child lifecycle is '${state.kind}', not safe to start`)
      }
      if (OWNED_CHILDREN.has(child)) {
        throw new LifecycleUnsafeStateError('child lifecycle is already owned by another scope')
      }
      OWNED_CHILDREN.add(child)

      const unwatch = new AbortController()
      let watching: Promise<void> = Promise.resolve()
      generation.ledger.add({
        release: async () => {
          unwatch.abort()
          await watching
          await child.stop()
          if (child.state.kind !== 'stopped') {
            // Its stop() settled but the child is not `stopped`, typically
            // because it restarted itself while this scope stopped it: a
            // cleanup error that keeps it owned, and the parent's next stop()
            // stops it again (C-CHILD-07, D32).
            throw new LifecycleUnsafeStateError(`owned child lifecycle is '${child.state.kind}' after its stop, not 'stopped'`)
          }
          // Only a successful stop ends ownership; a failed one is retried by
          // this ledger, so no other parent may adopt the child meanwhile.
          OWNED_CHILDREN.delete(child)
        },
      })

      // Cancels only this wait; the ledger entry above stops the child.
      await child.start({ signal })

      watching = child.whenState(
        // Terminal snapshots only: a child that restarts or recovers itself goes
        // stopping → starting and is not an exit (v1 design §4.5).
        next => next.kind === 'failed' || next.kind === 'stopped',
        { signal: unwatch.signal },
      ).then(
        terminal => {
          if (generation.sealed) {
            return // this scope is stopping the child
          }
          host.fail(generation, new LifecycleChildFailureError('an owned child lifecycle exited unexpectedly', {
            cause: terminal.kind === 'failed' ? terminal.error : undefined,
          }))
        },
        () => {}, // unwatched by the ledger entry
      )
    },

    set (condition: LifecycleCondition): void {
      host.setCondition(generation, condition, true)
    },

    clear (condition: LifecycleCondition): void {
      host.setCondition(generation, condition, false)
    },

    condition (name: string): LifecycleConditionHandle {
      const handle = host.condition(name)
      return Object.freeze({
        canonical: handle,
        name: handle.name,
        get isSet () { return handle.isSet },
        wait: (options?: any) => handle.wait(options),
        when: (timeoutMs?: number) => handle.when(timeoutMs),
        whenClear: (timeoutMs?: number) => handle.whenClear(timeoutMs),
        set: () => host.setCondition(generation, handle, true),
        clear: () => host.setCondition(generation, handle, false),
      })
    },

    acquireService<T> (service: {
      readonly start: (signal: AbortSignal) => T | PromiseLike<T>
      readonly stop: () => unknown
      readonly abort?: () => unknown
    }): Promise<T> {
      if (generation.sealed) {
        return Promise.reject(generation.sealReason)
      }
      let starting!: Promise<T>
      let interrupting: Promise<unknown> | undefined
      const interrupted = (result: unknown) => {
        if (isPromiseLike(result)) {
          interrupting = generation.ledger.addJoin(result)
        }
      }

      const releaseEntry = async () => {
        if (interrupting) {
          await interrupting.catch(() => {})
        }
        await service.stop()
      }

      generation.ledger.add({
        release: releaseEntry,
        interrupt: service.abort && (() => {
          interrupted(service.abort!())
        }),
      })

      starting = (async () => service.start(signal))()
      starting.catch(async () => {
        try {
          if (service.abort) {
            interrupted(service.abort())
          }
        } catch {}
        try {
          await releaseEntry()
        } catch {}
        generation.ledger.discard(releaseEntry)
      })

      return starting
    },

    sleep (ms: number): Promise<void> {
      if (generation.sealed) {
        return Promise.reject(generation.sealReason)
      }
      if (signal.aborted) {
        return Promise.reject(signal.reason)
      }
      if (ms <= 0) {
        return Promise.resolve()
      }

      const { promise, resolve, reject } = Promise.withResolvers<void>()
      let timerHandle: unknown

      const onAbort = () => {
        host.clock.clearTimeout(timerHandle)
        generation.ledger.discard(cleanup)
        reject(signal.reason)
      }

      const cleanup = () => {
        host.clock.clearTimeout(timerHandle)
        signal.removeEventListener('abort', onAbort)
      }

      signal.addEventListener('abort', onAbort, { once: true })
      generation.ledger.add({ release: cleanup })

      timerHandle = host.clock.setTimeout(() => {
        cleanup()
        generation.ledger.discard(cleanup)
        resolve()
      }, ms)

      return promise
    },

    operation<T> (work: (signal: AbortSignal) => T | PromiseLike<T>): Promise<T> {
      return operation(this, work)
    },

    listen (
      target: any,
      type: string,
      listener: (...args: any[]) => void,
    ): void {
      listen(this, target, type, listener)
    },

    watchdog (
      timeoutMs: number,
      options?: { readonly onTimeout?: 'fail' | 'recover'; readonly clock?: LifecycleClock },
    ): { feed: () => void; disarm: () => void } {
      return watchdog(this, {
        timeoutMs,
        onTimeout: options?.onTimeout ?? 'fail',
        clock: options?.clock ?? host.clock,
      })
    },

    fail (error: unknown): void {
      host.fail(generation, error)
    },

    recover (reason?: unknown): LifecycleRecoverResult {
      return host.recover(generation, reason)
    },
  })
}

export type {
  ScopeHost,
}
export {
  createScope,
  Generation,
  OWNED_CHILDREN_KEY,
  ownedChildren,
}
