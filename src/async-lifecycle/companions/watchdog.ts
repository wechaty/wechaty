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
 * Companion: a feedable watchdog timer bound to one generation (README §15,
 * C-COMP-02).
 *
 * Built only on the public {@link LifecycleScope} (D17): its timer is cleared
 * through `scope.defer`, so it never outlives its generation, and an expiry
 * acts through the scope's own authority (`fail` or `recover`), so a stale
 * watchdog cannot affect a newer run. Policy such as backoff or retry budgets
 * stays with the caller (D7).
 */

import {
  defaultClock,
  validTimeout,
}                           from '../clock.ts'
import { LifecycleTimeoutError } from '../errors.ts'
import type {
  LifecycleClock,
  LifecycleScope,
}                           from '../types.ts'

/** Options for {@link watchdog}. */
interface WatchdogOptions {
  /**
   * How long the watchdog waits for a `feed()`. Finite, greater than 0 and at
   * most 2³¹−1, as a lifecycle deadline (C-TIME-01).
   */
  readonly timeoutMs: number
  /**
   * What an expiry does, with a `LifecycleTimeoutError` (`phase: 'watchdog'`):
   * `'fail'` ends the generation with no replacement (`scope.fail`);
   * `'recover'` asks for a replacement (`scope.recover`). Required: neither is
   * the obvious default.
   */
  readonly onTimeout: 'fail' | 'recover'
  /** Timer source; defaults to the global timers. The scope does not expose the lifecycle's clock. */
  readonly clock?: LifecycleClock
}

/** The handle returned by {@link watchdog}. */
interface Watchdog {
  /**
   * Restart the countdown from now. Does nothing once the watchdog fired or
   * its generation began retiring (`scope.signal` aborted, or the scope's
   * cleanup ran).
   */
  feed (): void
  /**
   * Stop the countdown until the next `feed()`. Does nothing once the watchdog
   * fired or its generation began retiring, like `feed()`.
   */
  disarm (): void
}

/**
 * Arm a watchdog for this generation: unless fed within `timeoutMs`, it calls
 * `scope.fail` or `scope.recover` with a `LifecycleTimeoutError` (`phase:
 * 'watchdog'`), once (C-COMP-02).
 *
 * @throws RangeError for an invalid `timeoutMs`.
 * @throws TypeError when `onTimeout` is neither `'fail'` nor `'recover'`: there
 *         is no default, so a typo from JavaScript must not silently fail.
 * @throws the scope's retirement reason when called on a sealed scope
 *         (C-SCOPE-02); no timer is armed then.
 */
function watchdog (scope: LifecycleScope, options: WatchdogOptions): Watchdog {
  const timeoutMs = validTimeout('watchdog timeoutMs', options.timeoutMs)!
  if (options.onTimeout !== 'fail' && options.onTimeout !== 'recover') {
    throw new TypeError(`watchdog onTimeout must be 'fail' or 'recover', got ${String(options.onTimeout)}`)
  }
  const clock = options.clock ?? defaultClock
  let handle: unknown
  // Retired or fired: nothing arms again.
  let done = false

  const clear = () => {
    if (handle !== undefined) {
      clock.clearTimeout(handle)
      handle = undefined
    }
  }
  const fire = () => {
    handle = undefined
    if (done || scope.signal.aborted) {
      return
    }
    done = true
    const error = new LifecycleTimeoutError('watchdog', timeoutMs)
    if (options.onTimeout === 'recover') {
      scope.recover(error)
    } else {
      scope.fail(error)
    }
  }
  const arm = () => {
    if (done || scope.signal.aborted) {
      return
    }
    clear()
    handle = clock.setTimeout(fire, timeoutMs)
  }

  // Registered first: on a sealed scope this throws before any timer exists.
  scope.defer(() => {
    done = true
    clear()
  })
  arm()
  return Object.freeze({ feed: arm, disarm: clear })
}

export type {
  Watchdog,
  WatchdogOptions,
}
export {
  watchdog,
}
