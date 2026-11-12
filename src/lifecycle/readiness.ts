/**
 * Generation-isolated readiness coordinator.
 *
 * Keeps domain readiness (e.g. authentication + contact/room synchronization)
 * strictly separate from service `starting`/`running` lifecycle while binding
 * every `whenReady()` wait to a concrete generation `G`:
 *   - Calling `whenReady()` during `starting(G)` or `running(G)` binds to `G`.
 *   - Calling `whenReady()` while cleanly `stopped(G)` binds to `G + 1` to
 *     preserve pre-start `const p = bot.ready(); await bot.start()` ergonomics.
 *   - Calling `whenReady()` while `failed` rejects immediately with the failure.
 *   - Pending readiness waits reject immediately if their bound generation
 *     stops, fails, or is superseded — never hanging indefinitely (RFC §3.8 E)
 *     and never resolving from a stale or subsequent generation's `ready` signal.
 */
import type {
  LifecycleCallOptions,
  LifecycleController,
  LifecycleState,
} from './controller.ts'
import {
  LifecycleSupersededError,
  toAbortError,
} from './errors.ts'

interface ReadyWaiter {
  readonly targetGeneration: number
  readonly resolve: () => void
  readonly reject: (error: unknown) => void
  readonly cleanup: () => void
}

/**
 * Coordinates generation-scoped readiness latches on top of a `LifecycleController`.
 */
export class ReadinessGate {

  readonly #controller: LifecycleController
  #readyGeneration: number | null = null
  readonly #waiters = new Set<ReadyWaiter>()

  constructor (controller: LifecycleController) {
    this.#controller = controller
  }

  /**
   * `true` iff the controller is currently `running(G)` and `markReady(G)` is
   * active for that exact generation.
   */
  get isReady (): boolean {
    const state = this.#controller.state
    return state.kind === 'running' && this.#readyGeneration === state.generation
  }

  /**
   * Marks `generation` ready if `generation` is still the active `starting` or
   * `running` generation, resolving any waiters bound to `generation`.
   * Stale calls from retired generations are ignored.
   */
  markReady (generation: number): void {
    const state = this.#controller.state
    if (
      state.generation !== generation
      || (state.kind !== 'starting' && state.kind !== 'running')
    ) {
      return
    }

    this.#readyGeneration = generation
    for (const waiter of [ ...this.#waiters ]) {
      if (waiter.targetGeneration === generation) {
        this.#waiters.delete(waiter)
        waiter.cleanup()
        waiter.resolve()
      }
    }
  }

  /**
   * Clears readiness for `generation` (for example on `logout` or `scan` within
   * the same run) without rejecting in-flight waits that can still become ready
   * when re-authenticated in the same generation.
   */
  markUnready (generation?: number): void {
    if (generation === undefined || this.#readyGeneration === generation) {
      this.#readyGeneration = null
    }
  }

  /**
   * Synchronizes readiness state with a newly committed `LifecycleState`.
   * Rejects pending waiters whose bound generation stopped, failed, or was
   * superseded before becoming ready.
   */
  handleStateChange (state: LifecycleState): void {
    if (state.kind !== 'running' && state.kind !== 'starting') {
      this.#readyGeneration = null
    } else if (this.#readyGeneration !== null && this.#readyGeneration !== state.generation) {
      this.#readyGeneration = null
    }

    if (this.#waiters.size === 0) {
      return
    }

    for (const waiter of [ ...this.#waiters ]) {
      if (state.generation > waiter.targetGeneration) {
        this.#waiters.delete(waiter)
        waiter.cleanup()
        waiter.reject(
          new LifecycleSupersededError(
            'ready',
            `Readiness wait for generation ${waiter.targetGeneration} was superseded by generation ${state.generation}`,
          ),
        )
        continue
      }

      if (state.generation === waiter.targetGeneration) {
        if (state.kind === 'failed') {
          this.#waiters.delete(waiter)
          waiter.cleanup()
          waiter.reject(state.error)
        } else if (state.kind === 'stopped') {
          this.#waiters.delete(waiter)
          waiter.cleanup()
          waiter.reject(
            new LifecycleSupersededError(
              'ready',
              `Service stopped before generation ${waiter.targetGeneration} became ready`,
            ),
          )
        }
      }
    }
  }

  /**
   * Rejects any pre-start waiters bound to a future generation when the caller
   * explicitly calls `stop()` before `start()` ever launches that generation.
   */
  cancelPendingPreStartWaiters (): void {
    const currentGen = this.#controller.state.generation
    for (const waiter of [ ...this.#waiters ]) {
      if (waiter.targetGeneration > currentGen) {
        this.#waiters.delete(waiter)
        waiter.cleanup()
        waiter.reject(
          new LifecycleSupersededError(
            'ready',
            'Service was explicitly stopped before startup began',
          ),
        )
      }
    }
  }

  /**
   * Awaits readiness for the current (or immediately upcoming, if `stopped`)
   * generation.
   */
  whenReady (options?: LifecycleCallOptions): Promise<void> {
    if (options?.signal?.aborted) {
      return Promise.reject(toAbortError(options.signal.reason))
    }

    const state = this.#controller.state
    let targetGeneration: number

    switch (state.kind) {
      case 'starting':
      case 'running': {
        if (this.#readyGeneration === state.generation) {
          return Promise.resolve()
        }
        targetGeneration = state.generation
        break
      }

      case 'stopped': {
        targetGeneration = state.generation + 1
        break
      }

      case 'stopping': {
        // Bind to the next generation if a restart/start is queued; if the service
        // stops without restarting, `cancelPendingPreStartWaiters` or the next stop rejects.
        targetGeneration = state.generation + 1
        break
      }

      case 'failed': {
        return Promise.reject(state.error)
      }
    }

    const signal = options?.signal
    return new Promise<void>((resolve, reject) => {
      let onAbort: (() => void) | undefined
      const waiter: ReadyWaiter = {
        cleanup: () => {
          if (onAbort && signal) {
            signal.removeEventListener('abort', onAbort)
          }
        },
        reject,
        resolve,
        targetGeneration,
      }
      if (signal) {
        onAbort = () => {
          this.#waiters.delete(waiter)
          reject(toAbortError(signal.reason))
        }
        signal.addEventListener('abort', onAbort, { once: true })
      }
      this.#waiters.add(waiter)
    })
  }

}
