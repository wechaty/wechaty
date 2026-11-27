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

import type {
  LifecycleCondition,
  LifecycleConditionHandle,
  LifecycleWaitOptions,
}                           from './types.ts'

/** Where a new wait binds: a live generation number, or the next one to start. */
type ConditionTarget = number | 'next'

interface Waiter {
  readonly condition: LifecycleCondition
  readonly resolve: () => void
  readonly reject: (reason: unknown) => void
}

/**
 * A declared condition. The handle is all an owner or implementer ever holds;
 * `wait` asks the owning engine where to bind.
 */
class Condition implements LifecycleConditionHandle {

  readonly name: string
  readonly #wait: (condition: Condition, options?: LifecycleWaitOptions) => Promise<void>
  readonly #isSet: (condition: Condition) => boolean
  readonly #set: (condition: Condition) => void
  readonly #clear: (condition: Condition) => void
  readonly #when: (condition: Condition, timeoutMs?: number) => Promise<void>
  readonly #whenClear: (condition: Condition, timeoutMs?: number) => Promise<void>

  constructor (
    name: string,
    wait: (condition: Condition, options?: LifecycleWaitOptions) => Promise<void>,
    isSet: (condition: Condition) => boolean,
    set?: (condition: Condition) => void,
    clear?: (condition: Condition) => void,
    when?: (condition: Condition, timeoutMs?: number) => Promise<void>,
    whenClear?: (condition: Condition, timeoutMs?: number) => Promise<void>,
  ) {
    this.name = name
    this.#wait = wait
    this.#isSet = isSet
    this.#set = set ?? (() => {})
    this.#clear = clear ?? (() => {})
    this.#when = when ?? ((c, timeoutMs) => c.wait(timeoutMs !== undefined ? { signal: AbortSignal.timeout(timeoutMs) } : undefined))
    this.#whenClear = whenClear ?? (() => Promise.resolve())
  }

  /** See {@link LifecycleCondition.isSet} (C-COND-06, D23). */
  get isSet (): boolean {
    return this.#isSet(this)
  }

  /** See {@link LifecycleCondition.wait}. */
  wait (options?: LifecycleWaitOptions): Promise<void> {
    return this.#wait(this, options)
  }

  /** See {@link LifecycleConditionHandle.when}. */
  when (timeoutMs?: number): Promise<void> {
    return this.#when(this, timeoutMs)
  }

  /** See {@link LifecycleConditionHandle.whenClear}. */
  whenClear (timeoutMs?: number): Promise<void> {
    return this.#whenClear(this, timeoutMs)
  }

  /** See {@link LifecycleConditionHandle.set}. */
  set (): void {
    this.#set(this)
  }

  /** See {@link LifecycleConditionHandle.clear}. */
  clear (): void {
    this.#clear(this)
  }

}

/** Per-engine registry of conditions, their waits and their set flags. */
class ConditionBoard {

  readonly #declared = new Map<string, Condition>()
  readonly #next = new Set<Waiter>()
  readonly #bound = new Map<number, Set<Waiter>>()
  readonly #boundClear = new Map<number, Set<Waiter>>()
  readonly #set = new Map<number, Set<LifecycleCondition>>()

  /** Declare a condition, or return the one already declared under `name`. */
  declare (
    name: string,
    wait: (condition: Condition, options?: LifecycleWaitOptions) => Promise<void>,
    set?: (condition: Condition) => void,
    clear?: (condition: Condition) => void,
    when?: (condition: Condition, timeoutMs?: number) => Promise<void>,
    whenClear?: (condition: Condition, timeoutMs?: number) => Promise<void>,
  ): Condition {
    let condition = this.#declared.get(name)
    if (!condition) {
      condition = new Condition(
        name,
        wait,
        declared => this.isSet(declared),
        set,
        clear,
        when,
        whenClear,
      )
      this.#declared.set(name, condition)
    }
    return condition
  }

  /** Whether `condition` was declared on this board (and not on another lifecycle). */
  owns (condition: LifecycleCondition): boolean {
    const canonical = (condition as any)?.canonical ?? condition
    return this.#declared.get(canonical.name) === canonical
  }

  /**
   * Register a wait bound to `target`. Resolves at once when `target` already
   * has the condition set. The caller signal detaches only this wait.
   */
  wait (
    condition: LifecycleCondition,
    target: ConditionTarget,
    options?: LifecycleWaitOptions,
  ): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (target !== 'next' && this.#set.get(target)?.has(condition)) {
      return Promise.resolve()
    }

    const { promise, resolve, reject } = Promise.withResolvers<void>()
    const pool = target === 'next' ? this.#next : this.#pool(target)
    const onAbort = () => {
      this.#forget(waiter)
      reject(signal!.reason)
    }
    const detach = () => signal?.removeEventListener('abort', onAbort)
    const waiter: Waiter = {
      condition,
      resolve: () => { detach(); resolve() },
      reject: reason => { detach(); reject(reason) },
    }
    pool.add(waiter)
    signal?.addEventListener('abort', onAbort, { once: true })
    return promise
  }

  /**
   * Register a wait bound to `target` for condition to be cleared. Resolves at once
   * if `target` does not have the condition set.
   */
  waitClear (
    condition: LifecycleCondition,
    target: ConditionTarget,
    options?: LifecycleWaitOptions,
  ): Promise<void> {
    const signal = options?.signal
    if (signal?.aborted) {
      return Promise.reject(signal.reason)
    }
    if (target === 'next' || !this.#set.get(target)?.has(condition)) {
      return Promise.resolve()
    }

    const { promise, resolve, reject } = Promise.withResolvers<void>()
    const pool = this.#poolClear(target)
    const onAbort = () => {
      this.#forgetClear(waiter)
      reject(signal!.reason)
    }
    const detach = () => signal?.removeEventListener('abort', onAbort)
    const waiter: Waiter = {
      condition,
      resolve: () => { detach(); resolve() },
      reject: reason => { detach(); reject(reason) },
    }
    pool.add(waiter)
    signal?.addEventListener('abort', onAbort, { once: true })
    return promise
  }

  /** Bind every wait made for "the next generation" to `generation`. */
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

  /**
   * Whether a live generation has `condition` set. Retired generations have no
   * flags left ({@link ConditionBoard.retire}), and at most one generation is
   * live at a time, so this is "the current live generation has it set".
   */
  isSet (condition: LifecycleCondition): boolean {
    for (const set of this.#set.values()) {
      if (set.has(condition)) {
        return true
      }
    }
    return false
  }

  /** Mark `condition` set for `generation` and resolve the waits bound to it. */
  set (generation: number, condition: LifecycleCondition): void {
    let set = this.#set.get(generation)
    if (!set) {
      set = new Set()
      this.#set.set(generation, set)
    }
    set.add(condition)
    for (const waiter of [ ...this.#bound.get(generation) ?? [] ]) {
      if (waiter.condition === condition) {
        this.#forget(waiter)
        waiter.resolve()
      }
    }
  }

  /** Mark `condition` not set for `generation`. Later waits block again. */
  clear (generation: number, condition: LifecycleCondition): void {
    this.#set.get(generation)?.delete(condition)
    for (const waiter of [ ...this.#boundClear.get(generation) ?? [] ]) {
      if (waiter.condition === condition) {
        this.#forgetClear(waiter)
        waiter.resolve()
      }
    }
  }

  /**
   * `generation` can no longer set conditions: reject its waits with `reason`
   * and forget its set flags.
   */
  retire (generation: number, reason: unknown): void {
    this.#set.delete(generation)
    const clearPool = this.#boundClear.get(generation)
    if (clearPool) {
      this.#boundClear.delete(generation)
      for (const waiter of clearPool) {
        waiter.resolve()
      }
    }
    const pool = this.#bound.get(generation)
    if (!pool) {
      return
    }
    this.#bound.delete(generation)
    for (const waiter of pool) {
      waiter.reject(reason)
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

  #poolClear (generation: number): Set<Waiter> {
    let pool = this.#boundClear.get(generation)
    if (!pool) {
      pool = new Set()
      this.#boundClear.set(generation, pool)
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

  #forgetClear (waiter: Waiter): void {
    for (const [ generation, pool ] of this.#boundClear) {
      if (pool.delete(waiter) && pool.size === 0) {
        this.#boundClear.delete(generation)
      }
    }
  }

}

export type {
  ConditionTarget,
}
export {
  Condition,
  ConditionBoard,
}
