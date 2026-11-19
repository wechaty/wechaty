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
 * Typed errors exported by the async lifecycle module.
 *
 * These are the only error classes the module creates for its own conditions. A
 * hook failure or a cleanup failure is surfaced as the implementer's own value
 * (several cleanup failures as a native `AggregateError`), never replaced by one
 * of these. See the consolidated v1 design in wechaty/wechaty#2911, §3.5.
 */

/**
 * Rejection reason when a caller's attempt was superseded by a newer intent.
 *
 * A `start()` whose generation never becomes the running generation (because a
 * `stop()` or a newer `start()` arrived) rejects with this. A `restart()` that a
 * later `stop()` supersedes rejects with this too. It signals "your request was
 * authoritatively replaced", not "the operation failed".
 */
class LifecycleSupersededError extends Error {

  override name = 'LifecycleSupersededError'

  constructor (message = 'The lifecycle request was superseded by a newer intent') {
    super(message)
  }

}

/**
 * Rejection reason when a deadline expired.
 *
 * - `'start'`: `startTimeoutMs` expiry fails the attempt, aborts the scope, and unwinds.
 * - `'stop'`: `stopTimeoutMs` expiry yields `failed { cleanupComplete: false }`.
 * - `'watchdog'`: the `watchdog()` companion was not fed in time.
 *
 * A timeout is a deadline, never proof of cleanup (wechaty/wechaty#2905 §3.2).
 */
class LifecycleTimeoutError extends Error {

  override name = 'LifecycleTimeoutError'

  /** Which deadline expired. */
  readonly phase: 'start' | 'stop' | 'watchdog'
  /** The configured deadline in milliseconds. */
  readonly timeoutMs: number

  constructor (
    phase: 'start' | 'stop' | 'watchdog',
    timeoutMs: number,
  ) {
    super(`The lifecycle ${phase} exceeded its ${timeoutMs}ms deadline`)
    this.phase = phase
    this.timeoutMs = timeoutMs
  }

}

/**
 * Refusal when the requested operation could overlap unreleased resources.
 *
 * `start()` / `restart()` reject with it while the state is `failed` with
 * `cleanupComplete: false`, and `scope.start(child)` throws it for a child that is
 * not `stopped` or cleanly `failed`, or that another scope already owns
 * (wechaty/wechaty#2905 §3.6).
 */
class LifecycleUnsafeStateError extends Error {

  override name = 'LifecycleUnsafeStateError'

  constructor (message = 'The lifecycle is not in a safe state for this operation') {
    super(message)
  }

}

export {
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}
