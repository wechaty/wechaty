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
 * Companion: a feedable watchdog timer bound to one generation.
 *
 * Built only on the public {@link LifecycleScope}: the timer is cleared through
 * `scope.defer`, so it never outlives its generation, and an expiry acts through
 * the scope's own authority (`fail` or `recover`), so a stale watchdog from a
 * retired generation cannot affect a newer run. Policy such as backoff or retry
 * budgets stays with the caller (v1 design rule 4, "mechanism in, policy out").
 */

import { defaultClock } from '../clock.ts'
import { LifecycleTimeoutError } from '../errors.ts'
import type {
  LifecycleClock,
  LifecycleScope,
}                           from '../types.ts'

/** Options for {@link watchdog}. */
interface WatchdogOptions {
  /** How long the watchdog waits for a `feed()` before it fires. */
  readonly timeoutMs: number
  /**
   * What an expiry does. `'fail'` (default) ends the generation with no
   * replacement; `'recover'` asks for a replacement through `scope.recover()`.
   */
  readonly onTimeout?: 'fail' | 'recover'
  /** Timer source; defaults to the global timers. */
  readonly clock?: LifecycleClock
}

/** The handle returned by {@link watchdog}. */
interface Watchdog {
  /** Restart the countdown. Does nothing once the generation is retiring. */
  feed (): void
}

/**
 * Arm a watchdog for this generation. It fires with a
 * `LifecycleTimeoutError('watchdog', timeoutMs)` unless fed within `timeoutMs`.
 *
 * Throws the scope's retirement reason when called on a sealed scope.
 */
function watchdog (scope: LifecycleScope, options: WatchdogOptions): Watchdog {
  const clock = options.clock ?? defaultClock
  let handle: unknown
  let disarmed = false

  const disarm = () => {
    disarmed = true
    if (handle !== undefined) {
      clock.clearTimeout(handle)
      handle = undefined
    }
  }
  const fire = () => {
    handle = undefined
    const error = new LifecycleTimeoutError('watchdog', options.timeoutMs)
    if (options.onTimeout === 'recover') {
      void scope.recover(error) // pre-handled by the scope
    } else {
      scope.fail(error)
    }
  }
  const arm = () => {
    if (disarmed || scope.signal.aborted) {
      return
    }
    if (handle !== undefined) {
      clock.clearTimeout(handle)
    }
    handle = clock.setTimeout(fire, options.timeoutMs)
  }

  scope.defer(disarm)
  arm()
  return { feed: arm }
}

export type {
  Watchdog,
  WatchdogOptions,
}
export {
  watchdog,
}
