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
 * Deterministic test tools for the contract suite (wechaty/wechaty#2970).
 *
 * Contract tests never use real time or sleeps (AGENTS.md): deadlines run on a
 * {@link ManualClock}, and asynchronous work is advanced with {@link flush},
 * which only spins the microtask queue. This file has no dependency on any
 * lifecycle implementation, so it also serves the final kernel (S4).
 */

import type { LifecycleClock, LifecycleState } from '../types.ts'

/**
 * Let pending promise chains run by yielding to the microtask queue `turns`
 * times. Never waits for real time. The default comfortably exceeds the deepest
 * promise chain of the three comparison kernels; raise it only with a reason.
 */
async function flush (turns = 500): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}

interface Timer {
  readonly at: number
  readonly order: number
  readonly callback: () => void
}

/**
 * A {@link LifecycleClock} whose time moves only when {@link ManualClock.advance}
 * is called. Timers fire in due-time order, ties in creation order, including
 * timers scheduled by a callback during the same advance.
 */
class ManualClock implements LifecycleClock {

  #now = 0
  #order = 0
  readonly #timers = new Map<number, Timer>()

  /** The number of armed timers. */
  get pending (): number {
    return this.#timers.size
  }

  now (): number {
    return this.#now
  }

  setTimeout (callback: () => void, ms: number): unknown {
    const id = ++this.#order
    this.#timers.set(id, { at: this.#now + Math.max(0, ms), order: id, callback })
    return id
  }

  clearTimeout (handle: unknown): void {
    this.#timers.delete(handle as number)
  }

  /**
   * Move time forward by `ms` synchronously **without firing any timer**: what a
   * hook that blocks the thread looks like to the kernel. Due timers fire on the
   * next `advance()`. Used for deadlines judged by the clock (C-TIME-05).
   */
  jump (ms: number): void {
    this.#now += ms
  }

  /**
   * Move time forward by `ms`, firing every timer that falls due on the way, and
   * flush microtasks after each one so the lifecycle reacts before the next fires.
   *
   * Queued microtasks run first, before the target time is fixed: a command
   * accepted just before `advance()` arms its deadline in a microtask, and that
   * deadline must be measured from the current time, not from the target.
   */
  async advance (ms: number): Promise<void> {
    await flush()
    const target = this.#now + ms
    for (;;) {
      const next = [ ...this.#timers.entries() ]
        .filter(([ , timer ]) => timer.at <= target)
        .sort(([ , a ], [ , b ]) => a.at - b.at || a.order - b.order)[0]
      if (!next) {
        break
      }
      const [ id, timer ] = next
      this.#timers.delete(id)
      this.#now = timer.at
      timer.callback()
      await flush()
    }
    this.#now = target
    await flush()
  }

}

/** A live view of a promise's outcome, for asserting on it without awaiting. */
interface Observed<T> {
  readonly status: 'pending' | 'resolved' | 'rejected'
  readonly value: T | undefined
  readonly error: unknown
}

/**
 * Observe `promise` without awaiting it. Attaches a handler at once, so a
 * rejection is never reported as unhandled.
 */
function observe<T> (promise: Promise<T>): Observed<T> {
  const box: { status: Observed<T>['status'], value: T | undefined, error: unknown } = {
    status : 'pending',
    value  : undefined,
    error  : undefined,
  }
  promise.then(
    value => { box.status = 'resolved'; box.value = value },
    (error: unknown) => { box.status = 'rejected'; box.error = error },
  )
  return box
}

/**
 * Run `body`, which is known to fail, and pass if it does.
 *
 * Used for a contract test that an implementation is known to fail. Unlike
 * `node:test`'s `todo` option, which Deno does not run at all, this runs the
 * test in both runtimes. If `body` unexpectedly passes, the known failure was
 * fixed or the test is wrong, and this throws so the entry gets removed.
 *
 * @param reason - Why it is expected to fail; quoted in the error.
 */
async function expectFailure (body: () => Promise<void>, reason: string): Promise<void> {
  try {
    await body()
  } catch {
    return
  }
  throw new Error(`expected this test to fail (${reason}), but it passed: remove the known-failure entry`)
}

/**
 * The `name` of an error, or `undefined`. The comparison implementations each
 * have their own error classes, so tests identify errors by name (all three use
 * the S1 class names) rather than with `instanceof`.
 */
function errorName (error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string'
    ? error.name
    : undefined
}

/**
 * Record committed snapshots as `kind:generation`, for asserting a transition
 * trace. Pass `onStateChange` as the hook.
 */
function stateTrace (): { readonly kinds: string[], onStateChange (state: LifecycleState): void } {
  const kinds: string[] = []
  return {
    kinds,
    onStateChange: state => { kinds.push(`${state.kind}:${state.generation}`) },
  }
}

/** Assert that `state` is `failed` and return it narrowed. */
function failedState (state: LifecycleState): Extract<LifecycleState, { kind: 'failed' }> {
  if (state.kind !== 'failed') {
    throw new Error(`expected a failed state, got ${state.kind}:${state.generation}`)
  }
  return state
}

/**
 * Stop `lifecycle` at the end of a test without risking a hang: observe the
 * stop, flush, and return the outcome. A stop that does not settle is left
 * pending rather than awaited.
 */
async function shutdown (lifecycle: { stop (): Promise<void> }): Promise<Observed<void>> {
  const stopped = observe(lifecycle.stop())
  await flush()
  return stopped
}

export type {
  Observed,
}
export {
  errorName,
  expectFailure,
  failedState,
  flush,
  ManualClock,
  observe,
  shutdown,
  stateTrace,
}
