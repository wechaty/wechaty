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
import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleFailurePhase,
  LifecycleScope,
  LifecycleStopReason,
  LifecycleRecoverResult,
}                           from './types.ts'

/** What a scope needs from its engine. Implemented by `engine.ts`. */
interface ScopeHost {
  /** Report that `generation` can no longer run. Ignored once it is sealed. */
  fail (generation: Generation, error: unknown): void
  /** See {@link LifecycleScope.recover}. */
  recover (generation: Generation, reason: unknown): Promise<LifecycleRecoverResult>
  /**
   * A release registered on `generation` after it was sealed is running as
   * `run`, which rejects if it fails. The engine decides whether it belongs to
   * that generation's own retirement (C-SCOPE-02) or is a late release, an
   * obligation of the instance (C-SCOPE-11, D31).
   */
  lateRelease (generation: Generation, run: Promise<void>): void
  /** Set or clear a condition; throws `TypeError` for a foreign condition. */
  setCondition (generation: Generation, condition: LifecycleCondition, value: boolean): void
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
  /** Thrown to late registrations and used to reject this run's condition waits. */
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
   * Its start failed because a late release failed meanwhile (C-SCOPE-11): that
   * debt is reported, not retried by this generation's own retirement.
   */
  debtFailure = false

  constructor (number: number) {
    this.number = number
  }

}

/**
 * Children owned by some scope. Reserved synchronously before `child.start()` and
 * released only after the owner's stop of that child succeeded, so a second
 * parent can never adopt a child the first one may still stop.
 */
const OWNED_CHILDREN = new WeakSet<Lifecycle>()

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
    host.lateRelease(generation, generation.ledger.addLate(release))
    throw generation.sealReason
  }

  return Object.freeze<LifecycleScope>({
    generation: generation.number,
    signal,

    acquire<T> (
      create: (signal: AbortSignal) => T | PromiseLike<T>,
      release: (resource: T) => void | PromiseLike<void>,
      options?: { readonly interrupt?: (resource: T) => void },
    ): Promise<T> {
      if (generation.sealed) {
        return Promise.reject(generation.sealReason)
      }
      let created: { readonly resource: T } | undefined
      let interruptPending = false
      let creating!: Promise<T>
      const entry = async () => {
        let resource: T
        try {
          resource = await creating
        } catch {
          return // nothing was acquired
        }
        await release(resource)
      }
      // Ownership first: the release is on the ledger before `create` runs.
      generation.ledger.add({
        release: entry,
        interrupt: options?.interrupt && (() => {
          if (created) {
            options.interrupt!(created.resource)
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
            options!.interrupt!(resource)
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
      const registered = generation.ledger.add({
        release: async () => {
          await finished
          if (retiringFailure) {
            throw retiringFailure.error
          }
        },
        // The task already ended; report its failure once instead of retrying.
        retryable: false,
        join: true,
      })
      if (!registered) {
        throw generation.sealReason
      }
      finished = (async () => task(signal))().then(
        () => {},
        (error: unknown) => {
          if (signal.aborted && error === signal.reason) {
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

    fail (error: unknown): void {
      host.fail(generation, error)
    },

    recover (reason?: unknown): Promise<LifecycleRecoverResult> {
      const result = host.recover(generation, reason)
      result.catch(() => {}) // pre-handled: `void scope.recover()` must be safe
      return result
    },
  })
}

export type {
  ScopeHost,
}
export {
  createScope,
  Generation,
}
