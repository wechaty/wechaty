/**
 * Async error-forwarding, timeout, and GError-payload parsing helpers shared
 * across `wechaty-puppet`, `wechaty-puppet-service`, and `wechaty`.
 *
 * Replaces the legacy `timeoutPromise`, `TimeoutPromiseGError`, and
 * `wrapAsyncError` utilities removed from `gerror` v2 core.
 */

import { Code, GError } from 'gerror'

type WrapAsyncCallback = (error: unknown) => void

/**
 * Overloaded signature for wrapping either a `Promise` or an async function
 * so rejections and synchronous throws are forwarded to an error callback
 * without returning a rejected promise.
 */
export interface WrapAsync {
  (promise: Promise<unknown>): void
  <A extends unknown[]>(fn: (...args: A) => Promise<unknown>): (...args: A) => void
}

/**
 * Creates a `WrapAsync` helper that routes promise rejections and synchronous
 * or asynchronous function failures into `onError`, preserving the caller's
 * `this` receiver when wrapping functions.
 */
export function wrapAsyncError (onError: WrapAsyncCallback): WrapAsync {
  function wrap (target: Promise<unknown>): void
  function wrap<A extends unknown[]> (fn: (...args: A) => Promise<unknown>): (...args: A) => void
  function wrap (
    target: Promise<unknown> | ((...args: unknown[]) => Promise<unknown>),
  ): void | ((...args: unknown[]) => void) {
    if (typeof target === 'function') {
      return function (this: unknown, ...args: unknown[]): void {
        try {
          const result = target.apply(this, args)
          if (result !== null && typeof result === 'object' && typeof result.catch === 'function') {
            result.catch(onError)
          }
        } catch (err) {
          onError(err)
        }
      }
    }
    target.catch(onError)
  }
  return wrap as WrapAsync
}

/**
 * Error thrown when `timeoutPromise()` exceeds its timeout budget.
 */
export class TimeoutPromiseGError extends GError {

  constructor (timeoutMs: number) {
    super(`TimeoutPromiseGError: timed out after ${timeoutMs} ms`, {
      code: Code.DeadlineExceeded,
    })
  }

}

/**
 * Races `promise` against a `timeoutMs` timer, clearing the timer on settlement.
 */
export function timeoutPromise<T> (
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutPromiseGError(timeoutMs))
    }, timeoutMs)

    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      err => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/**
 * Parses a serialized `GErrorData` JSON string or normalizes an arbitrary
 * runtime value into a `GError`.
 */
export function parseGErrorPayload (raw: unknown): GError {
  if (GError.isGError(raw)) {
    return raw
  }
  if (typeof raw === 'string') {
    try {
      return GError.parse(raw)
    } catch {
      return GError.from(raw)
    }
  }
  return GError.from(raw)
}
