/**
 * Internal `AbortSignal` coordination helpers with guaranteed listener detachment.
 *
 * Architectural boundary:
 * - Used by the kernel, condition registry, and generation ledger so caller waits and
 *   deadline bounds never leave dangling `'abort'` listeners on long-lived `AbortSignal`
 *   instances after a promise settles.
 */

/**
 * Extracts the rejection reason from an aborted `AbortSignal`, synthesizing a standard
 * `DOMException('This operation was aborted', 'AbortError')` only when `signal.reason`
 * is `undefined`.
 */
export function getAbortReason (signal: AbortSignal): unknown {
  if (signal.reason !== undefined) {
    return signal.reason
  }
  return new DOMException('This operation was aborted', 'AbortError')
}

/**
 * Synchronously throws `getAbortReason(signal)` when `signal` is already aborted.
 */
export function throwIfAborted (signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw getAbortReason(signal)
  }
}

/**
 * Returns `true` when `error` represents cooperative cancellation matching `signal`
 * (either strictly equal to `signal.reason` or a standard `AbortError` after `signal` aborted).
 */
export function isCooperativeAbortError (
  error: unknown,
  signal: AbortSignal,
): boolean {
  if (!signal.aborted) {
    return false
  }
  if (Object.is(error, signal.reason)) {
    return true
  }
  return (
    typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { readonly name?: unknown }).name === 'AbortError'
  )
}

/**
 * Wraps a shared `promise` in an independent caller-scoped wait that rejects immediately
 * if `signal` aborts, without cancelling the underlying `promise`, and always removes its
 * `'abort'` listener as soon as either side settles.
 */
export function waitWithCallerSignal<T> (
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  onCallerAbort?: () => void,
): Promise<T> {
  if (!signal) {
    return promise
  }
  if (signal.aborted) {
    onCallerAbort?.()
    return Promise.reject(getAbortReason(signal))
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false
    const onAbort = (): void => {
      if (settled) {
        return
      }
      settled = true
      signal.removeEventListener('abort', onAbort)
      onCallerAbort?.()
      reject(getAbortReason(signal))
    }

    signal.addEventListener('abort', onAbort, { once: true })

    promise.then(
      value => {
        if (settled) {
          return
        }
        settled = true
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        if (settled) {
          return
        }
        settled = true
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

/**
 * Outcome of racing an asynchronous cleanup/join operation against a deadline `AbortSignal`.
 */
export type DeadlineRaceResult<T> =
  | { readonly timedOut: false; readonly status: 'fulfilled'; readonly value: T }
  | { readonly timedOut: false; readonly status: 'rejected'; readonly error: unknown }
  | { readonly timedOut: true; readonly timeoutReason: unknown }

/**
 * Awaits `promise` until either it settles or `deadlineSignal` aborts, removing the abort
 * listener immediately when `promise` settles first. Never leaves `promise` unhandled if
 * it rejects after `deadlineSignal` aborts.
 */
export function settleBeforeDeadline<T> (
  promise: Promise<T>,
  deadlineSignal: AbortSignal,
): Promise<DeadlineRaceResult<T>> {
  // Attach a no-op rejection handler so a post-deadline rejection never becomes an
  // unhandled rejection while tracked in unresolved ledger debt.
  promise.catch(() => {})

  if (deadlineSignal.aborted) {
    return Promise.resolve({
      timedOut: true,
      timeoutReason: getAbortReason(deadlineSignal),
    })
  }

  return new Promise<DeadlineRaceResult<T>>(resolve => {
    let done = false

    const onAbort = (): void => {
      if (done) {
        return
      }
      done = true
      deadlineSignal.removeEventListener('abort', onAbort)
      resolve({
        timedOut: true,
        timeoutReason: getAbortReason(deadlineSignal),
      })
    }

    deadlineSignal.addEventListener('abort', onAbort, { once: true })

    promise.then(
      value => {
        if (done) {
          return
        }
        done = true
        deadlineSignal.removeEventListener('abort', onAbort)
        resolve({ timedOut: false, status: 'fulfilled', value })
      },
      (error: unknown) => {
        if (done) {
          return
        }
        done = true
        deadlineSignal.removeEventListener('abort', onAbort)
        resolve({ timedOut: false, status: 'rejected', error })
      },
    )
  })
}
