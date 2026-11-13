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
 * Error types raised by the {@link Lifecycle} controller.
 *
 * These exist so callers can distinguish *why* a `start()`/`stop()` promise
 * rejected without string-matching: a request that was superseded by a later
 * desired-state change is a different fact from an underlying hook failure or a
 * caller aborting only their own wait. This supports RFC invariant 6 (explicit
 * failures) and the Promise-semantics table in §7.
 */

/**
 * The awaited request became irrelevant because a later desired-state change
 * superseded it (e.g. a `start()` whose desired state flipped to `stopped`
 * before it reached `running`). Distinct from a hook failure: nothing is broken,
 * the request simply no longer represents current intent.
 */
class LifecycleSupersededError extends Error {

  override readonly name = 'LifecycleSupersededError'

  constructor (message = 'lifecycle request superseded by a later desired-state change') {
    super(message)
  }

}

/**
 * The start hook rejected. Carries the original error plus whether rollback
 * cleanup completed, mirroring {@link LifecycleState} `failed` so callers never
 * confuse "failed" with "safely stopped" (RFC §3.6, invariant 7).
 */
class LifecycleStartError extends Error {

  override readonly name = 'LifecycleStartError'

  readonly startError: unknown
  readonly cleanupComplete: boolean
  readonly cleanupError?: unknown

  constructor (
    startError: unknown,
    cleanupComplete: boolean,
    cleanupError?: unknown,
  ) {
    super('lifecycle start() failed: ' + stringifyCause(startError))
    this.startError = startError
    this.cleanupComplete = cleanupComplete
    this.cleanupError = cleanupError
  }

}

/**
 * The stop hook rejected, so owned resources may still be live. Reported
 * instead of silently marking the service `stopped` (RFC invariant 7).
 */
class LifecycleStopError extends Error {

  override readonly name = 'LifecycleStopError'

  readonly stopError: unknown

  constructor (stopError: unknown) {
    super('lifecycle stop() failed: ' + stringifyCause(stopError))
    this.stopError = stopError
  }

}

/** Best-effort, dependency-free rendering of an unknown thrown value. */
function stringifyCause (cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message
  }
  try {
    return String(cause)
  } catch {
    // e.g. Object.create(null) has no toString; never throw while reporting.
    return '[unprintable value]'
  }
}

export {
  LifecycleSupersededError,
  LifecycleStartError,
  LifecycleStopError,
}
