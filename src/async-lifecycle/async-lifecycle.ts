/**
 * Abstract base-class entry point (`AsyncLifecycle`) over the shared `LifecycleKernel`.
 *
 * Architectural boundary:
 * - Provides the template-method inheritance shell (`protected abstract onStart(scope)`,
 *   optional `protected onStop(stop)`, `protected onStateChange(state, previous)`, and
 *   `protected condition(name)`) for standalone services with no conflicting superclass.
 * - Delegates 100% of lifecycle orchestration to `createLifecycle()` so inheritance and
 *   composition share identical semantics.
 * - Enforces single-level template-method finality at construction time: subclasses that
 *   override `start`, `stop`, `restart`, `whenState`, `state`, or `[Symbol.asyncDispose]`
 *   fail fast with `LifecycleOverrideError`.
 */

import { createLifecycle } from './create-lifecycle.ts'
import { LifecycleOverrideError } from './errors.ts'
import type {
  Lifecycle,
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
  LifecycleStopContext,
} from './types.ts'

const FINAL_METHOD_NAMES = [
  'start',
  'stop',
  'restart',
  'whenState',
] as const

/**
 * Abstract base class implementing the Tier 1 `Lifecycle` contract via Tier 2 protected hooks.
 *
 * Subclasses implement `protected onStart(scope)` (zero-argument `onStart()` / `onStop()`
 * signatures from legacy providers also compile and run unchanged) and MUST NOT override
 * `start`, `stop`, `restart`, `whenState`, `state`, or `[Symbol.asyncDispose]`.
 */
export abstract class AsyncLifecycle implements Lifecycle {
  readonly #controller: LifecycleController

  protected constructor (options?: LifecycleOptions) {
    this.#assertFinalMembersNotOverridden()

    const hasCustomOnStop = this.onStop !== AsyncLifecycle.prototype.onStop
    const hasCustomOnStateChange = this.onStateChange !== AsyncLifecycle.prototype.onStateChange

    const hooks: LifecycleHooks = {
      onStart: scope => this.onStart(scope),
      ...(hasCustomOnStop
        ? { onStop: stop => this.onStop(stop) }
        : {}),
      ...(hasCustomOnStateChange
        ? { onStateChange: (state, previous) => this.onStateChange(state, previous) }
        : {}),
    }

    const effectiveOptions: LifecycleOptions = {
      ...options,
      name: options?.name ?? new.target.name,
    }

    this.#controller = createLifecycle(hooks, effectiveOptions)
  }

  /** Frozen snapshot of the current lifecycle state. */
  get state (): LifecycleState {
    return this.#controller.state
  }

  /** Starts this lifecycle instance (final—do not override; implement `onStart`). */
  start (options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.start(options)
  }

  /** Stops this lifecycle instance (final—do not override; implement `onStop` or register on `scope`). */
  stop (options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.stop(options)
  }

  /** Cleanly retires the active generation and boots a fresh replacement generation (final). */
  restart (options?: LifecycleCallOptions): Promise<void> {
    return this.#controller.restart(options)
  }

  /** Waits until `predicate(state)` returns `true` across generations (final). */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    return this.#controller.whenState(predicate, options)
  }

  /** Stops this lifecycle instance when exiting an `await using` block (final). */
  [Symbol.asyncDispose] (): Promise<void> {
    return this.#controller[Symbol.asyncDispose]()
  }

  /**
   * Acquires all resources, listeners, background tasks, and child lifecycles for one run.
   */
  protected abstract onStart (scope: LifecycleScope): Promise<void> | void

  /**
   * Optional graceful goodbye hook invoked before `scope.signal` aborts ONLY when retiring
   * a generation that committed `running`.
   */
  protected onStop (_stop: LifecycleStopContext): Promise<void> | void {}

  /**
   * Optional post-commit state observer invoked after waiters settle, with throws isolated.
   */
  protected onStateChange (_state: LifecycleState, _previous: LifecycleState): void {}

  /**
   * Declares or retrieves a generation-bound named `LifecycleCondition` (such as `'ready'`).
   */
  protected condition (name: string): LifecycleCondition {
    return this.#controller.condition(name)
  }

  #assertFinalMembersNotOverridden (): void {
    const subclassName = this.constructor.name || 'AsyncLifecycleSubclass'

    for (const methodName of FINAL_METHOD_NAMES) {
      if (this[methodName] !== AsyncLifecycle.prototype[methodName]) {
        throw new LifecycleOverrideError(subclassName, methodName)
      }
    }

    if (this[Symbol.asyncDispose] !== AsyncLifecycle.prototype[Symbol.asyncDispose]) {
      throw new LifecycleOverrideError(subclassName, '[Symbol.asyncDispose]')
    }

    let proto: object | null = Object.getPrototypeOf(this) as object | null
    while (proto !== null && proto !== AsyncLifecycle.prototype) {
      const stateDescriptor = Object.getOwnPropertyDescriptor(proto, 'state')
      if (stateDescriptor !== undefined) {
        throw new LifecycleOverrideError(subclassName, 'state')
      }
      proto = Object.getPrototypeOf(proto) as object | null
    }
  }
}
