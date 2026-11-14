/**
 * Companion utilities built strictly on top of the public `LifecycleScope` API.
 *
 * Architectural boundary:
 * - Keeps supervision timers (`createWatchdog`) and standalone listener helpers (`listen`)
 *   outside the private reconciliation kernel so the core stays minimal while eliminating
 *   manual timer/listener boilerplate (and the #2905 Case F watchdog reset-amplification bug).
 * - Watchdog timers register cleanup via `scope.defer()` rather than `scope.spawn()` so an
 *   expiring timer can invoke `void scope.recover(err)` without deadlocking generation
 *   task-join barriers.
 */

import { assertValidTimeoutMs, SYSTEM_CLOCK } from './clock.ts'
import { LifecycleTimeoutError } from './errors.ts'
import type {
  LifecycleScope,
  LifecycleTimerHandle,
  ListenTarget,
  WatchdogHandle,
  WatchdogOptions,
} from './types.ts'

/**
 * Functional companion alias for `scope.listen(target, event, listener)`.
 *
 * Attaches `listener` to an `EventEmitter`-like or `EventTarget`-like `target` and
 * automatically removes it when `scope`'s generation retires.
 */
export function listen (
  scope: LifecycleScope,
  target: ListenTarget,
  event: string,
  listener: (...args: any[]) => void,
): void {
  scope.listen(target, event, listener)
}

/**
 * Creates a generation-fenced inactivity watchdog attached to `scope`.
 *
 * Behavioral contract:
 * - Arms immediately upon creation for `options.timeoutMs`, and resets whenever `feed()` is
 *   called while `scope`'s generation remains unsealed.
 * - Automatically disarms via `scope.defer()` and on `scope.signal` abort so retired
 *   generations never leak timers or fire stale recovery calls.
 * - On expiry, disarms itself and triggers either `void scope.recover(timeoutError)`
 *   (default `'recover'`) or `scope.fail(timeoutError)` (`'fail'`).
 */
export function createWatchdog (
  scope: LifecycleScope,
  options: WatchdogOptions,
): WatchdogHandle {
  assertValidTimeoutMs(options.timeoutMs, 'WatchdogOptions.timeoutMs')
  const defaultTimeoutMs = options.timeoutMs
  const action = options.onTimeout ?? 'recover'
  const clock = options.clock ?? SYSTEM_CLOCK
  const label = options.name ?? 'Watchdog'

  let timerHandle: LifecycleTimerHandle | undefined
  let stopped = false

  const clearCurrentTimer = (): void => {
    if (timerHandle !== undefined) {
      clock.clearTimeout(timerHandle)
      timerHandle = undefined
    }
  }

  const disarm = (): void => {
    clearCurrentTimer()
  }

  const shutdown = (): void => {
    stopped = true
    clearCurrentTimer()
  }

  const onAbort = (): void => {
    shutdown()
  }

  scope.signal.addEventListener('abort', onAbort, { once: true })
  scope.defer(() => {
    scope.signal.removeEventListener('abort', onAbort)
    shutdown()
  })

  const arm = (windowMs: number): void => {
    assertValidTimeoutMs(windowMs, 'watchdog.feed(timeoutMs)')
    if (stopped || scope.signal.aborted) {
      return
    }
    clearCurrentTimer()
    timerHandle = clock.setTimeout(() => {
      timerHandle = undefined
      if (stopped || scope.signal.aborted) {
        return
      }
      stopped = true
      const timeoutError = new LifecycleTimeoutError('run', windowMs, label)
      if (action === 'fail') {
        scope.fail(timeoutError)
      } else {
        void scope.recover(timeoutError)
      }
    }, windowMs)
  }

  arm(defaultTimeoutMs)

  return Object.freeze({
    feed (overrideTimeoutMs?: number): void {
      arm(overrideTimeoutMs ?? defaultTimeoutMs)
    },
    disarm,
  })
}
