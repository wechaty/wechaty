/**
 * Platform timer abstraction and deterministic manual clock for `AsyncLifecycle`.
 *
 * Architectural boundary:
 * - Decouples startup/shutdown deadlines and companion watchdogs from global `setTimeout`
 *   so unit tests can advance virtual time deterministically with zero real sleeps or
 *   leaked runtime timer handles under Node.js and Deno.
 */

import type { LifecycleClock, LifecycleTimerHandle } from './types.ts'

/**
 * Validates that an optional timeout duration is a finite positive number when supplied.
 *
 * @throws {RangeError} When `ms` is `<= 0`, `NaN`, or `±Infinity`.
 */
export function assertValidTimeoutMs (
  ms: number | undefined,
  optionName: string,
): void {
  if (ms === undefined) {
    return
  }
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    throw new RangeError(`${optionName} must be a finite positive number of milliseconds, got ${String(ms)}`)
  }
}

/**
 * Default platform clock backed by `Date.now()`, `globalThis.setTimeout()`, and
 * `globalThis.clearTimeout()`.
 */
export const SYSTEM_CLOCK: LifecycleClock = Object.freeze({
  now (): number {
    return Date.now()
  },
  setTimeout (callback: () => void, ms: number): LifecycleTimerHandle {
    const handle = globalThis.setTimeout(callback, ms) as unknown as LifecycleTimerHandle
    // Deadline timers exist only to bound awaited promises; unref when supported so idle
    // safety timers never artificially keep a process event loop alive on their own.
    handle.unref?.()
    return handle
  },
  clearTimeout (handle: LifecycleTimerHandle): void {
    globalThis.clearTimeout(handle as unknown as ReturnType<typeof globalThis.setTimeout>)
  },
})

/**
 * Deterministic virtual clock controller for synchronous/microtask-driven testing.
 */
export interface ManualClock extends LifecycleClock {
  /** Current virtual timestamp in milliseconds. */
  readonly currentTimeMs: number
  /** Number of currently armed, uncancelled timers. */
  readonly pendingTimers: number
  /**
   * Advances virtual time by `deltaMs`, firing any due timers in chronological `(dueAt, id)`
   * order, including timers scheduled reentrantly within `[now, now + deltaMs]`.
   */
  advanceBy (deltaMs: number): void
}

interface ScheduledManualTimer extends LifecycleTimerHandle {
  readonly id: number
  readonly dueAt: number
  readonly callback: () => void
  cancelled: boolean
}

/**
 * Creates an isolated deterministic `ManualClock` starting at `initialTimeMs` (default `0`).
 */
export function createManualClock (initialTimeMs = 0): ManualClock {
  let nowMs = initialTimeMs
  let nextId = 1
  const timers = new Map<number, ScheduledManualTimer>()

  return {
    get currentTimeMs (): number {
      return nowMs
    },
    get pendingTimers (): number {
      return timers.size
    },
    now (): number {
      return nowMs
    },
    setTimeout (callback: () => void, ms: number): LifecycleTimerHandle {
      const id = nextId++
      const entry: ScheduledManualTimer = {
        id,
        dueAt: nowMs + Math.max(0, ms),
        callback,
        cancelled: false,
        unref () {
          return entry
        },
      }
      timers.set(id, entry)
      return entry
    },
    clearTimeout (handle: LifecycleTimerHandle): void {
      const entry = handle as Partial<ScheduledManualTimer>
      if (typeof entry.id === 'number') {
        const existing = timers.get(entry.id)
        if (existing) {
          existing.cancelled = true
          timers.delete(entry.id)
        }
      }
    },
    advanceBy (deltaMs: number): void {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) {
        throw new RangeError(`advanceBy deltaMs must be a finite non-negative number, got ${String(deltaMs)}`)
      }
      const targetMs = nowMs + deltaMs
      while (true) {
        let nextTimer: ScheduledManualTimer | undefined
        for (const candidate of timers.values()) {
          if (candidate.dueAt <= targetMs) {
            if (
              !nextTimer
              || candidate.dueAt < nextTimer.dueAt
              || (candidate.dueAt === nextTimer.dueAt && candidate.id < nextTimer.id)
            ) {
              nextTimer = candidate
            }
          }
        }
        if (!nextTimer) {
          break
        }
        timers.delete(nextTimer.id)
        nowMs = nextTimer.dueAt
        if (!nextTimer.cancelled) {
          nextTimer.callback()
        }
      }
      nowMs = targetMs
    },
  }
}

/**
 * Creates an `AbortSignal` that aborts with `createTimeoutError()` after `timeoutMs` on `clock`,
 * plus an idempotent `dispose()` callback that clears the underlying timer immediately.
 */
export function createDeadlineController (
  clock: LifecycleClock,
  timeoutMs: number | undefined,
  createTimeoutError: () => unknown,
): {
  readonly signal: AbortSignal
  readonly didTimeout: () => boolean
  dispose (): void
} {
  const controller = new AbortController()
  if (timeoutMs === undefined) {
    return {
      signal: controller.signal,
      didTimeout: () => false,
      dispose () {},
    }
  }

  let timedOut = false
  let handle: LifecycleTimerHandle | undefined = clock.setTimeout(() => {
    handle = undefined
    timedOut = true
    controller.abort(createTimeoutError())
  }, timeoutMs)

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose (): void {
      if (handle !== undefined) {
        clock.clearTimeout(handle)
        handle = undefined
      }
    },
  }
}
