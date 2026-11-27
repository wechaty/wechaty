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
 * Generation-bound conditions: the generic mechanism behind "await ready".
 *
 * Owns every pending `condition.wait()`, which generation each wait is bound to,
 * and which conditions each live generation has set. The engine tells the board
 * when a generation is allocated ({@link ConditionBoard.bindNext}), when it stops
 * being able to set conditions ({@link ConditionBoard.retire}) and when `stop()`
 * cancels waits that were never bound ({@link ConditionBoard.rejectNext}). The
 * board never looks at lifecycle state itself, so a result can never cross
 * generations by accident (wechaty/wechaty#2905 §3.4).
 */

import { validTimeout } from './clock.ts'
import type {
  LifecycleClock,
  LifecycleCondition,
  LifecycleConditionHandle,
  LifecycleWaitOptions,
} from './types.ts'

/** Where a new wait binds: a live generation number, or the next one to start. */
type ConditionTarget = number | 'next'

type WaitForCondition = (condition: Condition, expected: boolean, options?: LifecycleWaitOptions, timeoutMs?: number) => Promise<void>

interface Waiter {
  readonly condition: Condition
  readonly expected: boolean
  readonly resolve: () => void
  readonly reject: (reason: unknown) => void
}

/**
 * A condition handle. Its callbacks choose either the engine's live
 * generation or the one generation that issued the handle.
 */
class Condition implements LifecycleConditionHandle {

  readonly name: string
  readonly #waitFor: WaitForCondition
  readonly #read: (condition: Condition) => boolean
  readonly #write: (condition: Condition, value: boolean) => void

  constructor (
    name: string,
    waitFor: WaitForCondition,
    read: (condition: Condition) => boolean,
    write: (condition: Condition, value: boolean) => void,
  ) {
    this.name = name
    this.#waitFor = waitFor
    this.#read = read
    this.#write = write
  }

  /** See {@link LifecycleCondition.isSet} (C-COND-06, D23). */
  get isSet (): boolean {
    return this.#read(this)
  }

  /** See {@link LifecycleCondition.wait}. */
  wait (options?: LifecycleWaitOptions): Promise<void> {
    return this.#waitFor(this, true, options)
  }

  /** See {@link LifecycleConditionHandle.when}. */
  async when (timeoutMs?: number): Promise<void> {
    return this.#waitFor(this, true, undefined, validTimeout('condition.when timeoutMs', timeoutMs))
  }

  /** See {@link LifecycleConditionHandle.whenClear}. */
  async whenClear (timeoutMs?: number): Promise<void> {
    return this.#waitFor(this, false, undefined, validTimeout('condition.whenClear timeoutMs', timeoutMs))
  }

  /** See {@link LifecycleConditionHandle.set}. */
  set (): void {
    this.#write(this, true)
  }

  /** See {@link LifecycleConditionHandle.clear}. */
  clear (): void {
    this.#write(this, false)
  }

}

/** Per-engine registry of condition identities, their waits and their set flags. */
class ConditionBoard {

  readonly #declared = new Map<string, Condition>()
  readonly #next = new Set<Waiter>()
  readonly #bound = new Map<number, Set<Waiter>>()
  readonly #set = new Map<number, Set<Condition>>()

  readonly #clock: LifecycleClock

  constructor (clock: LifecycleClock) {
    this.#clock = clock
  }

  /** Declare a condition, or return the one already declared under this name. */
  declare (name: string, create: () => Condition): Condition {
    let condition = this.#declared.get(name)
    if (!condition) {
      condition = create()
      this.#declared.set(name, condition)
    }
    return condition
  }

  /** Whether this is the canonical condition declared on this board. */
  owns (condition: LifecycleCondition): condition is Condition {
    return this.#declared.get(condition.name) === condition
  }

  /**
   * Wait for a condition value in one generation. With no live generation,
   * a set wait binds to the next run and a clear wait resolves immediately.
   * Both outcomes are judged at settlement, even if a deadline callback is late.
   */
  wait (
    condition: Condition,
    target: ConditionTarget,
    expected: boolean,
    options?: LifecycleWaitOptions,
    timeoutMs?: number,
  ): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (target === 'next' ? !expected : this.isSet(condition, target) === expected) {
      return Promise.resolve()
    }

    const { promise, resolve, reject } = Promise.withResolvers<void>()
    const deadline = timeoutMs === undefined ? undefined : this.#clock.now() + timeoutMs
    let timer: unknown
    const rejectTimeout = () => reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))

    const finish = (settle: () => void) => {
      const expired = deadline !== undefined && this.#clock.now() >= deadline
      this.#forget(waiter)
      signal?.removeEventListener('abort', onAbort)
      if (deadline !== undefined) {
        this.#clock.clearTimeout(timer)
      }
      if (expired) {
        rejectTimeout()
      } else {
        settle()
      }
    }
    const waiter: Waiter = {
      condition,
      expected,
      resolve: () => finish(resolve),
      reject: reason => finish(() => reject(reason)),
    }
    const onAbort = () => waiter.reject(signal!.reason)
    if (deadline !== undefined) {
      // Timers can wake early due to rounding. The monotonic clock decides.
      const wake = () => {
        const remaining = deadline - this.#clock.now()
        if (remaining > 0) {
          timer = this.#clock.setTimeout(wake, Math.ceil(remaining))
        } else {
          finish(rejectTimeout)
        }
      }
      timer = this.#clock.setTimeout(wake, Math.max(0, Math.ceil(deadline - this.#clock.now())))
    }
    const pool = target === 'next' ? this.#next : this.#pool(target)
    pool.add(waiter)
    signal?.addEventListener('abort', onAbort, { once: true })
    return promise
  }

  /** Bind every wait made for "the next generation" to this generation. */
  bindNext (generation: number): void {
    if (this.#next.size === 0) {
      return
    }
    const pool = this.#pool(generation)
    for (const waiter of this.#next) {
      pool.add(waiter)
    }
    this.#next.clear()
  }

  /** Read this generation's flag. An absent flag reads clear. */
  isSet (condition: Condition, generation: number): boolean {
    return this.#set.get(generation)?.has(condition) ?? false
  }

  /** Update the flag and settle matching waits of the same generation. */
  set (generation: number, condition: Condition, value: boolean): void {
    let set = this.#set.get(generation)
    if (value) {
      if (!set) {
        set = new Set()
        this.#set.set(generation, set)
      }
      set.add(condition)
    } else {
      set?.delete(condition)
    }
    for (const waiter of [ ...this.#bound.get(generation) ?? [] ]) {
      if (waiter.condition === condition && waiter.expected === value) {
        waiter.resolve()
      }
    }
  }

  /** Forget the flags and reject all waits of the retiring generation. */
  retire (generation: number, reason: unknown): void {
    this.#set.delete(generation)
    const pool = this.#bound.get(generation)
    if (pool) {
      this.#bound.delete(generation)
      for (const waiter of pool) {
        waiter.reject(reason)
      }
    }
  }

  /** Reject every wait not yet bound to a generation. */
  rejectNext (reason: unknown): void {
    const waiters = [ ...this.#next ]
    this.#next.clear()
    for (const waiter of waiters) {
      waiter.reject(reason)
    }
  }

  #pool (generation: number): Set<Waiter> {
    let pool = this.#bound.get(generation)
    if (!pool) {
      pool = new Set()
      this.#bound.set(generation, pool)
    }
    return pool
  }

  #forget (waiter: Waiter): void {
    this.#next.delete(waiter)
    for (const [ generation, pool ] of this.#bound) {
      if (pool.delete(waiter) && pool.size === 0) {
        this.#bound.delete(generation)
      }
    }
  }

}

export {
  Condition,
  ConditionBoard,
}
