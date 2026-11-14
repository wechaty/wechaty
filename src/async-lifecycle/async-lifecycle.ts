/**
 * Public entry points for the async lifecycle module.
 *
 * This file exposes both adoption styles required by Wechaty layers:
 * composition through `createLifecycle()` and inheritance through
 * `AsyncLifecycle`. Both delegate to one private kernel implementation.
 */
import { LifecycleKernel } from './kernel.ts'
import type {
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
} from './types.ts'

/**
 * Composition entry point used by classes that already extend another base.
 */
export function createLifecycle(
  hooks: LifecycleHooks,
  options?: LifecycleOptions,
): LifecycleController {
  return new LifecycleKernel(hooks, options)
}

/**
 * Inheritance entry point for services that can directly extend a lifecycle base.
 *
 * The base owns `start/stop/restart/whenState` and enforces that subclasses use
 * `onStart` and `onStop` hooks instead of overriding command methods.
 */
export abstract class AsyncLifecycle implements Lifecycle {
  readonly #controller: LifecycleController

  protected constructor(options?: LifecycleOptions) {
    this.#controller = createLifecycle({
      onStart: scope => this.onStart(scope),
      onStop: scope => this.onStop(scope),
      onStateChange: (state, previous) => this.onStateChange(state, previous),
    }, options)
    this.#assertNoLifecycleOverrides()
  }

  /**
   * Required hook that acquires resources for one generation.
   */
  protected abstract onStart(scope: LifecycleScope): Promise<void> | void

  /**
   * Optional graceful hook called during retirement.
   */
  protected onStop(_scope: LifecycleScope): Promise<void> | void {
    // Default no-op.
  }

  /**
   * Optional observer invoked after a state commit and waiter settlement.
   */
  protected onStateChange(_state: LifecycleState, _previous: LifecycleState): void {
    // Default no-op.
  }

  /**
   * Declares or returns a named generation-bound condition.
   */
  protected condition(name: string): LifecycleCondition {
    return this.#controller.condition(name)
  }

  /**
   * Attempts authority-checked recovery from an observed failed snapshot.
   */
  protected recover(observed: LifecycleState): Promise<'recovered' | 'superseded'> {
    return this.#controller.recover(observed)
  }

  get state(): LifecycleState {
    return this.#controller.state
  }

  start(options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.start(options)
  }

  stop(options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.stop(options)
  }

  restart(options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.restart(options)
  }

  whenState(
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    return this.#controller.whenState(predicate, options)
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.#controller[Symbol.asyncDispose]()
  }

  /**
   * Prevents subclasses from replacing command methods and bypassing kernel
   * invariants.
   */
  #assertNoLifecycleOverrides(): void {
    const proto = Object.getPrototypeOf(this) as Record<string, unknown>
    const forbidden = ['start', 'stop', 'restart', 'whenState']
    for (const name of forbidden) {
      if (Object.hasOwn(proto, name)) {
        throw new Error(
          `AsyncLifecycle subclasses must not override "${name}"; implement onStart/onStop instead.`,
        )
      }
    }
  }
}
