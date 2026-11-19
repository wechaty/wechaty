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

  /** Tie the subclass hooks to a single engine and guard the caller API. */
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

  /** @inheritdoc */
  get state(): LifecycleState {
    return this.#controller.state
  }

  /** @inheritdoc */
  start(options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.start(options)
  }

  /** @inheritdoc */
  stop(options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.stop(options)
  }

  /** @inheritdoc */
  restart(options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.restart(options)
  }

  /** @inheritdoc */
  whenState(
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    return this.#controller.whenState(predicate, options)
  }

  /** @inheritdoc */
  [Symbol.asyncDispose](): Promise<void> {
    return this.#controller[Symbol.asyncDispose]()
  }

  /**
   * Prevents subclasses from replacing command methods and bypassing kernel
   * invariants.
   */
  #assertNoLifecycleOverrides(): void {
    const forbidden = ['start', 'stop', 'restart', 'whenState'] as const
    for (const name of forbidden) {
      const method = AsyncLifecycle.prototype[name]
      if (this[name] !== method) {
        throw new Error(
          `AsyncLifecycle subclasses must not override "${name}"; implement onStart/onStop instead.`,
        )
      }
      // Subclass field initializers run after super() and can shadow prototype methods.
      Object.defineProperty(this, name, { value: method })
    }
  }
}
