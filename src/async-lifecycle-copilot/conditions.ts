/**
 * Generation-bound named condition registry (`LifecycleCondition`) for `AsyncLifecycle`.
 *
 * Architectural boundary:
 * - Implements domain-neutral readiness/authentication gates (`'ready'`, `'login'`, etc.)
 *   without hardcoding `ready()` onto the Tier 1 `Lifecycle` interface.
 * - Enforces generation isolation: setting a condition in generation `G` never satisfies
 *   generation `G + 1`, and stale `scope.set()` / `scope.clear()` calls from retired
 *   generations are fenced no-ops.
 * - Supports pre-start waiting (`const p = ready.wait(); await bot.start()`): waits created
 *   while idle/stopping/failed bind atomically to the next generation when it starts, and
 *   reject with `LifecycleSupersededError` if an explicit `stop()` arrives before startup.
 */

import {
  getAbortReason,
  waitWithCallerSignal,
} from './cancellable-wait.ts'
import { LifecycleSupersededError } from './errors.ts'
import type {
  LifecycleCallOptions,
  LifecycleCondition,
} from './types.ts'

interface PendingConditionWaiter {
  resolve (): void
  reject (error: unknown): void
}

interface ConditionSlot {
  readonly name: string
  readonly facade: LifecycleCondition
  /** Generation number in which this condition is currently set, or `0` when unset. */
  setInGeneration: number
  /** Waiters bound to the currently active generation `activeGeneration`. */
  readonly boundWaiters: Set<PendingConditionWaiter>
  /** Waiters created while no active generation existed; adopted by the next generation boot. */
  readonly preStartWaiters: Set<PendingConditionWaiter>
}

/**
 * Owns all named `LifecycleCondition` instances declared on a single lifecycle controller.
 */
export class ConditionRegistry {
  readonly #slots = new Map<string, ConditionSlot>()
  readonly #ownedFacades = new WeakMap<LifecycleCondition, ConditionSlot>()
  #activeGeneration = 0

  /**
   * Declares or retrieves the idempotent `LifecycleCondition` for `name` on this instance.
   */
  condition (name: string): LifecycleCondition {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new TypeError('Condition name must be a non-empty string')
    }
    const existing = this.#slots.get(name)
    if (existing) {
      return existing.facade
    }

    const slot: ConditionSlot = {
      name,
      setInGeneration: 0,
      boundWaiters: new Set(),
      preStartWaiters: new Set(),
      facade: {
        get name (): string {
          return name
        },
        get isSet (): boolean {
          return (
            thisRegistry.#activeGeneration > 0
            && slot.setInGeneration === thisRegistry.#activeGeneration
          )
        },
        wait: (options?: LifecycleCallOptions): Promise<void> => {
          return this.#wait(slot, options)
        },
      },
    }
    const thisRegistry = this

    this.#slots.set(name, slot)
    this.#ownedFacades.set(slot.facade, slot)
    return slot.facade
  }

  /**
   * Binds `generation` as the active generation and adopts all pending pre-start waiters
   * into `generation`.
   */
  beginGeneration (generation: number): void {
    this.#activeGeneration = generation
    for (const slot of this.#slots.values()) {
      slot.setInGeneration = 0
      for (const waiter of slot.preStartWaiters) {
        slot.boundWaiters.add(waiter)
      }
      slot.preStartWaiters.clear()
    }
  }

  /**
   * Marks `condition` satisfied for `generation`. Fenced no-op if `generation` is no longer active.
   *
   * @throws {TypeError} If `condition` was created by a different lifecycle instance.
   */
  setForGeneration (generation: number, condition: LifecycleCondition): void {
    const slot = this.#requireOwnedSlot(condition)
    if (generation !== this.#activeGeneration || this.#activeGeneration === 0) {
      return
    }
    slot.setInGeneration = generation
    if (slot.boundWaiters.size === 0) {
      return
    }
    const waiters = [ ...slot.boundWaiters ]
    slot.boundWaiters.clear()
    for (const waiter of waiters) {
      waiter.resolve()
    }
  }

  /**
   * Clears `condition` for subsequent `wait()` calls in `generation`. Fenced no-op if retired.
   *
   * @throws {TypeError} If `condition` was created by a different lifecycle instance.
   */
  clearForGeneration (generation: number, condition: LifecycleCondition): void {
    const slot = this.#requireOwnedSlot(condition)
    if (generation !== this.#activeGeneration || this.#activeGeneration === 0) {
      return
    }
    if (slot.setInGeneration === generation) {
      slot.setInGeneration = 0
    }
  }

  /**
   * Settles all waiters bound to `generation` when `generation` leaves active execution
   * (either retiring to `stopping`/`stopped` or failing), and clears active state.
   */
  endGeneration (generation: number, rejectionError: unknown): void {
    if (this.#activeGeneration !== generation) {
      return
    }
    this.#activeGeneration = 0
    for (const slot of this.#slots.values()) {
      slot.setInGeneration = 0
      if (slot.boundWaiters.size > 0) {
        const waiters = [ ...slot.boundWaiters ]
        slot.boundWaiters.clear()
        for (const waiter of waiters) {
          waiter.reject(rejectionError)
        }
      }
    }
  }

  /**
   * Rejects any unbound pre-start waiters when an explicit `stop()` revokes startup intent
   * before a generation ever began.
   */
  rejectPreStartWaiters (reason?: LifecycleSupersededError): void {
    const error = reason ?? new LifecycleSupersededError(
      'Condition wait was cancelled by an explicit stop() before startup began',
    )
    for (const slot of this.#slots.values()) {
      if (slot.preStartWaiters.size > 0) {
        const waiters = [ ...slot.preStartWaiters ]
        slot.preStartWaiters.clear()
        for (const waiter of waiters) {
          waiter.reject(error)
        }
      }
    }
  }

  #requireOwnedSlot (condition: LifecycleCondition): ConditionSlot {
    const slot = this.#ownedFacades.get(condition)
    if (!slot) {
      throw new TypeError(
        'LifecycleCondition does not belong to this lifecycle instance',
      )
    }
    return slot
  }

  #wait (slot: ConditionSlot, options?: LifecycleCallOptions): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(getAbortReason(signal))
    }

    if (this.#activeGeneration > 0 && slot.setInGeneration === this.#activeGeneration) {
      return Promise.resolve()
    }

    let waiterRef: PendingConditionWaiter | undefined
    const targetSet = this.#activeGeneration > 0
      ? slot.boundWaiters
      : slot.preStartWaiters

    const rawPromise = new Promise<void>((resolve, reject) => {
      waiterRef = { resolve, reject }
      targetSet.add(waiterRef)
    })

    return waitWithCallerSignal(rawPromise, signal, () => {
      if (waiterRef) {
        slot.boundWaiters.delete(waiterRef)
        slot.preStartWaiters.delete(waiterRef)
      }
    })
  }
}
