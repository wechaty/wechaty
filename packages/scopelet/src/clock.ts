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
 * The default timer source for lifecycle deadlines and the watchdog companion,
 * and the one check of a deadline's length that both use (C-TIME-01, D11).
 *
 * Kept in its own module so tests and embedders can inject a deterministic
 * {@link LifecycleClock} through `LifecycleOptions.clock` without the engine
 * ever touching global timers directly.
 */

import type { LifecycleClock } from './types.ts'

/**
 * The global timers behind the {@link LifecycleClock} shape (D12, C-TIME-04).
 * `now()` is `performance.now()`: monotonic, so a wall-clock change can never
 * move a deadline (C-TIME-05 judges deadlines by it).
 */
const defaultClock: LifecycleClock = Object.freeze({
  now          : (): number => globalThis.performance.now(),
  setTimeout   : (callback: () => void, ms: number): unknown => globalThis.setTimeout(callback, ms),
  clearTimeout : (handle: unknown): void => {
    globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>)
  },
})

/** The largest delay a timer accepts (2³¹−1 ms); a longer one fires at once. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1

/**
 * Check a deadline option (C-TIME-01, D11). A `NaN`, infinite, zero or negative
 * value would expire at once or never instead of meaning a deadline, and a
 * value above 2³¹−1 overflows the timer and fires at once, so each is refused.
 *
 * @throws RangeError when `value` is not finite, greater than 0 and at most 2³¹−1.
 */
function validTimeout (name: string, value: number | undefined): number | undefined {
  if (value !== undefined && !(Number.isFinite(value) && value > 0 && value <= MAX_TIMEOUT_MS)) {
    throw new RangeError(`${name} must be a finite number of milliseconds, greater than 0 and at most ${MAX_TIMEOUT_MS}, got ${String(value)}`)
  }
  return value
}

function sleep (
  ms: number,
  signal?: AbortSignal,
  clock: LifecycleClock = defaultClock,
): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(signal.reason)
  }
  if (ms <= 0) {
    return Promise.resolve()
  }

  const { promise, resolve, reject } = Promise.withResolvers<void>()
  let timerHandle: unknown

  const onAbort = () => {
    clock.clearTimeout(timerHandle)
    reject(signal!.reason)
  }

  if (signal) {
    signal.addEventListener('abort', onAbort, { once: true })
  }

  timerHandle = clock.setTimeout(() => {
    if (signal) {
      signal.removeEventListener('abort', onAbort)
    }
    resolve()
  }, ms)

  return promise
}

export {
  defaultClock,
  MAX_TIMEOUT_MS,
  sleep,
  validTimeout,
}
