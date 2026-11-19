/**
 * Promise observation for the lifecycle kernel and generation scopes. Deadlines
 * and cancellation bound waits while ownership of the underlying work stays
 * with the caller of these helpers.
 */
import { LifecycleTimeoutError } from './errors.ts'

export type Outcome<T = void> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: unknown }

/** Preserve rejection values, including undefined, without leaving rejected work unobserved. */
export async function observe<T>(operation: () => T | PromiseLike<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    return { ok: false, error }
  }
}

/** Cancel only this wait, observing the underlying promise even if the signal wins. */
export function waitWithSignal<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return work
  }

  const wait = Promise.withResolvers<T>()
  const onAbort = () => wait.reject(signal.reason)
  if (signal.aborted) {
    onAbort()
  } else {
    signal.addEventListener('abort', onAbort, { once: true })
  }
  void work.then(wait.resolve, wait.reject)
  return wait.promise.finally(() => signal.removeEventListener('abort', onAbort))
}

/** Apply one budget to a whole operation without canceling its underlying work. */
export async function within<T>(
  work: Promise<T>,
  timeoutMs: number | undefined,
  operation: 'start' | 'stop',
  deadline?: number,
): Promise<T | LifecycleTimeoutError> {
  if (timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return work
  }

  const expires = deadline ?? performance.now() + timeoutMs
  const remaining = expires - performance.now()
  if (remaining <= 0) {
    return Promise.race([new LifecycleTimeoutError(operation, timeoutMs), work])
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<LifecycleTimeoutError>(resolve => {
    timer = setTimeout(() => resolve(new LifecycleTimeoutError(operation, timeoutMs)), Math.ceil(remaining))
  })
  try {
    const result = await Promise.race([work, timeout])
    // Synchronous hook work can block the timer. Check elapsed time before
    // reporting success even when the work's microtask wins the race.
    return !(result instanceof LifecycleTimeoutError) && performance.now() >= expires
      ? new LifecycleTimeoutError(operation, timeoutMs)
      : result
  } finally {
    clearTimeout(timer)
  }
}

/** Keep the original rejection value when only one cleanup failed. */
export function combineErrors(errors: readonly unknown[]): unknown {
  return errors.length === 1 ? errors[0] : new AggregateError(errors, 'Multiple lifecycle cleanup failures')
}
