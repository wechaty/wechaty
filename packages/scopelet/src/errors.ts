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
 * The error types of the async lifecycle module (decision D13 in
 * wechaty/wechaty#2968; contract in `../README.md` §Errors).
 *
 * Every error the module creates extends {@link LifecycleError} and carries a
 * stable string `code`. Callers should branch on `code` (or use
 * {@link isLifecycleError}), not on `instanceof`: when two copies of the module
 * are installed, for example one inside `wechaty` and one inside
 * `wechaty-puppet`, an error from one copy is not an instance of the other
 * copy's classes, but its `code` is the same.
 *
 * Errors the module only passes through are not wrapped: hook failures keep
 * their original value (falsy values included), several cleanup failures are a
 * native `AggregateError`, invalid options are a `RangeError`, and misuse such as
 * `scope.use(notDisposable)` is a `TypeError`.
 *
 * This file has no dependencies and is the only runtime code of the module until
 * the kernel lands (wechaty/wechaty#2972).
 */

/**
 * The stable codes of {@link LifecycleError}. Values follow the Node.js
 * `ERR_*` convention and never change once released.
 */
type LifecycleErrorCode =
  | 'ERR_LIFECYCLE_SUPERSEDED'
  | 'ERR_LIFECYCLE_TIMEOUT'
  | 'ERR_LIFECYCLE_UNSAFE_STATE'
  | 'ERR_LIFECYCLE_CHILD_FAILURE'
  | 'ERR_LIFECYCLE_OVERRIDE'

const LIFECYCLE_ERROR_CODES: ReadonlySet<string> = new Set<LifecycleErrorCode>([
  'ERR_LIFECYCLE_SUPERSEDED',
  'ERR_LIFECYCLE_TIMEOUT',
  'ERR_LIFECYCLE_UNSAFE_STATE',
  'ERR_LIFECYCLE_CHILD_FAILURE',
  'ERR_LIFECYCLE_OVERRIDE',
])

/**
 * The structural shape every lifecycle error has, whichever copy of the module
 * created it. {@link isLifecycleError} narrows to this type.
 */
interface LifecycleErrorLike extends Error {
  readonly code: LifecycleErrorCode
}

/**
 * Base class of every error the module creates. Not constructed directly.
 */
class LifecycleError extends Error implements LifecycleErrorLike {

  readonly code: LifecycleErrorCode

  protected constructor (code: LifecycleErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.code = code
    this.name = 'LifecycleError'
  }

}

/**
 * A request lost to a newer command before it could complete.
 *
 * Rejects a pending `start()` or `restart()` when a later `stop()` is accepted,
 * a condition wait whose generation retired before setting it (the generation's
 * failure, if any, is the `cause`), and a pre-start condition wait when `stop()`
 * is accepted. Thrown by a sealed scope's `use`, `defer`, `acquire`, `spawn` and
 * `start` as the retirement reason when the retirement was not a failure.
 */
class LifecycleSupersededError extends LifecycleError {

  constructor (message = 'the lifecycle request was superseded by a newer command', options?: ErrorOptions) {
    super('ERR_LIFECYCLE_SUPERSEDED', message, options)
    this.name = 'LifecycleSupersededError'
  }

}

/**
 * A start or stop deadline (`startTimeoutMs` / `stopTimeoutMs`) expired, or a
 * `watchdog` companion was not fed in time (`phase: 'watchdog'`).
 *
 * The work it timed out is not cancelled or forgotten: it stays tracked by the
 * generation, and a stop timeout leaves `failed { cleanupComplete: false }`.
 */
class LifecycleTimeoutError extends LifecycleError {

  /**
   * Which deadline expired: the start or stop deadline, or a `watchdog`
   * companion that was not fed in time (C-COMP-02).
   */
  readonly phase: 'start' | 'stop' | 'watchdog'
  /** The configured deadline, in milliseconds. */
  readonly timeoutMs: number

  constructor (phase: 'start' | 'stop' | 'watchdog', timeoutMs: number, options?: ErrorOptions) {
    super('ERR_LIFECYCLE_TIMEOUT', phase === 'watchdog'
      ? `lifecycle watchdog was not fed within ${timeoutMs} ms`
      : `lifecycle ${phase} did not finish within ${timeoutMs} ms`, options)
    this.name = 'LifecycleTimeoutError'
    this.phase = phase
    this.timeoutMs = timeoutMs
  }

}

/**
 * A command was refused because it would be unsafe in the current state.
 *
 * Rejects `start()` and `restart()` while the state is
 * `failed { cleanupComplete: false }` (only `stop()` may finish that cleanup), and
 * `scope.start(child)` for a child that is not idle and clean or is owned by
 * another scope. The refused command changes nothing.
 */
class LifecycleUnsafeStateError extends LifecycleError {

  constructor (message: string, options?: ErrorOptions) {
    super('ERR_LIFECYCLE_UNSAFE_STATE', message, options)
    this.name = 'LifecycleUnsafeStateError'
  }

}

/**
 * A child started with `scope.start(child)` failed, or stopped without its owner
 * asking. Fails the owning generation. `cause` is the child's error, or
 * `undefined` for an unrequested stop.
 */
class LifecycleChildFailureError extends LifecycleError {

  constructor (message = 'an owned child lifecycle exited unexpectedly', options?: ErrorOptions) {
    super('ERR_LIFECYCLE_CHILD_FAILURE', message, options)
    this.name = 'LifecycleChildFailureError'
  }

}

/**
 * A subclass of `AsyncLifecycle` overrode a caller-API member with a method.
 * Thrown by the `AsyncLifecycle` constructor, so the mistake surfaces when the
 * instance is created rather than as a lifecycle that silently skips the engine.
 *
 * A class-field override cannot be reported with this error: the field is
 * defined after the base constructor returns, and defining it over the locked
 * member throws a native `TypeError` instead (README C-SHELL-02).
 */
class LifecycleOverrideError extends LifecycleError {

  /** The overridden member, for example `'start'`. */
  readonly member: string

  constructor (member: string, options?: ErrorOptions) {
    super(
      'ERR_LIFECYCLE_OVERRIDE',
      `AsyncLifecycle subclasses must not override "${member}"; implement onStart/onStop instead`,
      options,
    )
    this.name = 'LifecycleOverrideError'
    this.member = member
  }

}

/**
 * Whether `value` is an error created by any copy of this module, optionally
 * with a specific `code`.
 *
 * Checks the shape instead of using `instanceof`, so it also recognizes errors
 * from another installed copy: `name` and `message` are strings, as on every
 * `Error`, and `code` is one of {@link LifecycleErrorCode}. A plain object that
 * only carries a matching `code` is rejected, because the narrowed type promises
 * the `Error` fields.
 *
 * @param value - Anything, typically a caught rejection.
 * @param code - When given, also require this exact code.
 */
function isLifecycleError (value: unknown, code?: LifecycleErrorCode): value is LifecycleErrorLike {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as { readonly name?: unknown, readonly message?: unknown, readonly code?: unknown }
  if (typeof candidate.name !== 'string' || typeof candidate.message !== 'string') {
    return false
  }
  const actual = candidate.code
  if (typeof actual !== 'string' || !LIFECYCLE_ERROR_CODES.has(actual)) {
    return false
  }
  return code === undefined || actual === code
}

export type {
  LifecycleErrorCode,
  LifecycleErrorLike,
}
export {
  isLifecycleError,
  LifecycleChildFailureError,
  LifecycleError,
  LifecycleOverrideError,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}
