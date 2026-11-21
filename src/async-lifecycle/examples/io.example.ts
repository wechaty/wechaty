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
 * Usage example: an `Io`-like WebSocket client on the inheritance entry point.
 *
 * Runs against a fake socket in `io.example.test.ts` (wechaty/wechaty#2973). It
 * shows a leaf resource with an interruptible socket, a keepalive task, recovery
 * when the socket closes, and reconnect backoff written by the implementer, with
 * no retry policy in the kernel (D7). The socket factory and the clock are
 * injected, so a test drives both.
 */

import { defaultClock } from '../clock.ts'
import type { LifecycleClock, LifecycleScope } from '../types.ts'
import { AsyncLifecycle, listen } from '../mod.ts'

/** The few socket operations the example needs. */
interface SocketLike {
  on (event: 'close', listener: () => void): void
  off (event: 'close', listener: () => void): void
  ping (): void
  /** Destroy at once, so a pending read or ping returns. */
  terminate (): void
  /** Close gracefully and resolve when closed. */
  close (): Promise<void>
}

/** What `Io` needs from its environment. */
export interface IoOptions {
  /** The server to connect to. Not published in diagnostics. */
  readonly url: string
  /** Open a socket; abort `signal` to give up connecting. */
  readonly openSocket: (url: string, signal: AbortSignal) => Promise<SocketLike>
  /** Timer source for the keepalive and the backoff, and for the lifecycle's deadlines. */
  readonly clock?: LifecycleClock
}

/**
 * Resolve after `ms` on `clock`; reject with `signal.reason` when `signal`
 * aborts, at once if it already has. The timer is cleared either way.
 */
function delay (ms: number, signal: AbortSignal, clock: LifecycleClock): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(signal.reason)
  }
  if (ms <= 0) {
    return Promise.resolve() // the first attempt: nothing to wait for
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clock.clearTimeout(handle)
      reject(signal.reason)
    }
    const handle = clock.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** Reconnect backoff: 0 for the first attempt, then 1 s, 2 s, 4 s, ... capped at 30 s. */
function backoffMs (failures: number): number {
  return failures === 0 ? 0 : Math.min(30_000, 1_000 * 2 ** (failures - 1))
}

/**
 * An `Io`-like client. Each generation holds one connected socket and a
 * keepalive task. When the socket closes, the generation recovers into a new one
 * that reconnects with backoff; while offline the state stays `starting`, and
 * `stop()` cancels the wait.
 */
export class Io extends AsyncLifecycle {

  readonly #options: IoOptions
  readonly #clock: LifecycleClock
  /** Consecutive socket losses. Policy state belongs to the implementer (D7). */
  #failures = 0

  /** @param options - The server, the socket factory, and an optional clock. */
  constructor (options: IoOptions) {
    // No startTimeoutMs: #connect retries until stop(); see its comment.
    super({ name: 'Io', stopTimeoutMs: 5_000, clock: options.clock })
    this.#options = options
    this.#clock = options.clock ?? defaultClock
  }

  /** Consecutive socket losses since the last successful connection. */
  get failures (): number {
    return this.#failures
  }

  /**
   * Connect, then watch the socket and keep it alive. Resolves once connected,
   * which commits `running`. Rejects only when the generation retires while
   * connecting.
   */
  protected override async onStart (scope: LifecycleScope): Promise<void> {
    const socket = await this.#connect(scope)

    // Removed when this generation retires (C-COMP-01).
    listen(scope, socket, 'close', () => {
      this.#failures++
      // Decides at once and never throws (D42). A stale scope gets
      // 'superseded' and does nothing; the new run is published as state.
      scope.recover(new Error('socket closed'))
    })

    scope.spawn(async signal => {
      while (!signal.aborted) {
        socket.ping()
        // Rejects with signal.reason on abort, which spawn treats as cancellation.
        await delay(10_000, signal, this.#clock)
      }
    })

    this.#failures = 0
  }

  /**
   * Connect, retrying with backoff until it works or the generation retires.
   *
   * Retrying inside `onStart` keeps the state `starting` while offline, so a
   * failed reconnect never ends in `failed` and never fails an owning parent.
   * stop() cancels the wait through scope.signal. Because the retries have no
   * end, `startTimeoutMs` is left unset.
   */
  async #connect (scope: LifecycleScope): Promise<SocketLike> {
    for (;;) {
      await delay(backoffMs(this.#failures), scope.signal, this.#clock)
      try {
        return await scope.acquire(
          signal => this.#options.openSocket(this.#options.url, signal),
          socket => socket.close(),
          // Step 4 of retirement: unblock the keepalive task before it is joined.
          { interrupt: socket => socket.terminate() },
        )
      } catch (error) {
        if (scope.signal.aborted) {
          throw error
        }
        this.#failures++
      }
    }
  }

}
