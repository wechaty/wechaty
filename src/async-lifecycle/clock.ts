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
 * The default timer source for lifecycle deadlines and the watchdog companion.
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

export {
  defaultClock,
}
