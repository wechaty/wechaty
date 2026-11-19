/**
 * Composition entry point (`createLifecycle`) for `AsyncLifecycle`.
 *
 * Architectural boundary:
 * - Instantiates a fresh `#private` `LifecycleKernel` wrapped behind an immutable
 *   `LifecycleController` facade so classes that already extend another base class
 *   (such as `Wechaty` and `Puppet` extending `TypedEventEmitter`) can own a lifecycle
 *   privately without TypeScript anonymous-class mixin `.d.ts` limitations (`TS4094`).
 */

import { LifecycleKernel } from './kernel.ts'
import type {
  LifecycleCallOptions,
  LifecycleCondition,
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleState,
} from './types.ts'

/**
 * Creates a composable `LifecycleController` driven by `hooks` and optional `options`.
 *
 * Keep the returned `LifecycleController` in a `#private` field on the owning class,
 * delegate the Tier 1 `Lifecycle` members (`state`, `start`, `stop`, `restart`,
 * `whenState`, `[Symbol.asyncDispose]`), and expose domain conditions (such as `ready()`)
 * via `controller.condition('ready')`.
 */
export function createLifecycle (
  hooks: LifecycleHooks,
  options?: LifecycleOptions,
): LifecycleController {
  const kernel = new LifecycleKernel(hooks, options)

  return Object.freeze({
    get state (): LifecycleState {
      return kernel.state
    },
    start (callOptions?: LifecycleCallOptions): Promise<void> {
      return kernel.start(callOptions)
    },
    stop (callOptions?: LifecycleCallOptions): Promise<void> {
      return kernel.stop(callOptions)
    },
    restart (callOptions?: LifecycleCallOptions): Promise<void> {
      return kernel.restart(callOptions)
    },
    whenState (
      predicate: (state: LifecycleState) => boolean,
      callOptions?: LifecycleCallOptions,
    ): Promise<LifecycleState> {
      return kernel.whenState(predicate, callOptions)
    },
    [Symbol.asyncDispose] (): Promise<void> {
      return kernel.stop()
    },
    condition (name: string): LifecycleCondition {
      return kernel.condition(name)
    },
  })
}
