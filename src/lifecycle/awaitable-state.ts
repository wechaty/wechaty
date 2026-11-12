/**
 * Owns a tiny awaitable active/inactive state primitive for internal services.
 *
 * This module replaces Wechaty's direct dependence on `state-switch` for simple
 * state waiting use-cases (readiness and local IO guards). It intentionally
 * does not orchestrate lifecycle ownership by itself.
 */

type PendingState = 'active-pending' | 'inactive-pending'
type StableState = 'active' | 'inactive'
type InternalState = StableState | PendingState

type LegacyStateValue = boolean | 'pending'

interface StableOptions {
  signal?: AbortSignal
}

const abortError = (message: string): Error => {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

interface Waiter {
  readonly target: StableState
  readonly resolve: () => void
  readonly reject: (error: unknown) => void
  readonly signal?: AbortSignal
}

/**
 * Awaitable state utility with a compatibility surface used by existing code:
 * `active()`, `inactive()`, and `stable()`.
 */
class AwaitableState {

  readonly #name: string
  #state: InternalState = 'inactive'
  readonly #waiters = new Set<Waiter>()

  constructor (name: string) {
    this.#name = name
  }

  /**
   * Reads or updates the active side of the indicator.
   */
  active (): LegacyStateValue
  active (next: true | 'pending'): void
  active (next?: true | 'pending'): LegacyStateValue | void {
    if (typeof next === 'undefined') {
      return this.#state === 'active'
        ? true
        : this.#state === 'active-pending'
          ? 'pending'
          : false
    }

    this.#state = next === true ? 'active' : 'active-pending'
    this.#settleWaiters()
  }

  /**
   * Reads or updates the inactive side of the indicator.
   */
  inactive (): LegacyStateValue
  inactive (next: true | 'pending'): void
  inactive (next?: true | 'pending'): LegacyStateValue | void {
    if (typeof next === 'undefined') {
      return this.#state === 'inactive'
        ? true
        : this.#state === 'inactive-pending'
          ? 'pending'
          : false
    }

    this.#state = next === true ? 'inactive' : 'inactive-pending'
    this.#settleWaiters()
  }

  /**
   * Waits until the indicator reaches a stable active or inactive state.
   */
  stable (target: StableState, options: StableOptions = {}): Promise<void> {
    if (this.#isStable(target)) {
      return Promise.resolve()
    }

    const { signal } = options
    if (signal?.aborted) {
      return Promise.reject(abortError(`${this.#name}.stable(${target}) aborted before waiting`))
    }

    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { target, resolve, reject, signal }
      this.#waiters.add(waiter)

      if (signal) {
        signal.addEventListener('abort', () => {
          if (!this.#waiters.delete(waiter)) {
            return
          }
          reject(abortError(`${this.#name}.stable(${target}) aborted while waiting`))
        }, { once: true })
      }
    })
  }

  #isStable (target: StableState): boolean {
    return this.#state === target
  }

  #settleWaiters (): void {
    for (const waiter of this.#waiters) {
      if (!this.#isStable(waiter.target)) {
        continue
      }
      this.#waiters.delete(waiter)
      waiter.resolve()
    }
  }
}

export type {
  LegacyStateValue,
}
export {
  AwaitableState,
}
