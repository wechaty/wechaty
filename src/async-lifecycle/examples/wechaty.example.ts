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
 * Usage example: the top of the onion. `Wechaty` keeps its EventEmitter base,
 * owns a `Puppet` and an optional `Io` as children, offers `ready()`, and maps
 * lifecycle states to today's `'start'` / `'stop'` / `'error'` events.
 *
 * Type-checked only (see `./pending-shells.ts`); it becomes a runnable test in
 * wechaty/wechaty#2973.
 *
 * Readiness is delegated to the puppet's own `ready` condition rather than
 * mirrored into a condition of this instance. A mirror must also be cleared
 * whenever the puppet's ready generation retires (a puppet restart or recovery
 * emits no `'logout'`), and getting that wrong leaves `ready()` resolving for a
 * puppet that is still starting (review of wechaty/wechaty#2975).
 *
 * Delegating alone loses the parent's half of C-COND-04. A `bot.ready()` wait is
 * bound to the puppet, so a bot that stops or fails before it ever owned the
 * puppet would leave the wait pending forever. The bot therefore also cancels
 * its delegated waits when it accepts `stop()` or fails (see `ready()`).
 */

import { EventEmitter } from 'node:events'

import type {
  Lifecycle,
  LifecycleController,
  LifecycleScope,
  LifecycleState,
  LifecycleWaitOptions,
}                           from '../types.ts'
import { LifecycleSupersededError } from '../errors.ts'
import type { Io } from './io.example.ts'
import { createLifecycle } from './pending-shells.ts'
import type { Puppet } from './puppet.example.ts'

/** Today's Wechaty events that the lifecycle drives. */
export interface WechatyEvents {
  start: []
  stop: []
  ready: []
  error: [ error: unknown ]
}

/**
 * The bot. Owns its puppet and optional Io for the length of each generation:
 * `start()` starts them in that order, `stop()` stops them in reverse, and a
 * child that fails or stops on its own fails this bot's generation
 * (C-CHILD-05).
 */
export class Wechaty extends EventEmitter<WechatyEvents> implements Lifecycle {

  /** Started and owned by each generation of this bot. */
  readonly puppet: Puppet
  /** Optional; started after the puppet and stopped before it. */
  readonly io: Io | undefined

  readonly #lifecycle: LifecycleController

  /**
   * Cancels the delegated `ready()` waits created before it. Aborted, and
   * replaced, when this bot accepts `stop()` or fails; see `#cancelReadyWaits`.
   */
  #readyWaits = new AbortController()

  /**
   * @param puppet - Must be idle and not owned by another lifecycle when `start()`
   *   runs, or the start fails with `LifecycleUnsafeStateError` (C-CHILD-01).
   * @param io - Same requirement as `puppet`.
   */
  constructor (puppet: Puppet, io?: Io) {
    super()
    this.puppet = puppet
    this.io = io
    this.#lifecycle = createLifecycle({
      onStart: scope => this.#start(scope),
      onStateChange: (state, previous) => this.#emitLegacyEvents(state, previous),
    }, { name: 'Wechaty', stopTimeoutMs: 30_000 })
  }

  async #start (scope: LifecycleScope): Promise<void> {
    // Forward today's 'ready' event. Registered before the puppet starts, so an
    // early 'ready' cannot be missed.
    const onReady = () => this.emit('ready')
    this.puppet.on('ready', onReady)
    scope.defer(() => this.puppet.off('ready', onReady))

    // Children start in order and stop in reverse (C-CHILD-04). If the Io fails
    // to start, the puppet is stopped by the ledger with no extra code. If either
    // child fails later, this generation fails with LifecycleChildFailureError.
    await scope.start(this.puppet)
    if (this.io) {
      await scope.start(this.io)
    }
  }

  /**
   * Today's events. `'start'` fires for every generation that commits `running`,
   * restarts included; `'stop'` when fully stopped; `'error'` on failure.
   */
  #emitLegacyEvents (state: LifecycleState, previous: LifecycleState): void {
    if (state.kind === 'running' && previous.kind !== 'running') {
      this.emit('start')
    } else if (state.kind === 'stopped' && previous.kind !== 'stopped') {
      this.emit('stop')
    } else if (state.kind === 'failed') {
      // Also covers a start that failed before the puppet was ever owned.
      this.#cancelReadyWaits(new LifecycleSupersededError('the bot failed before the puppet was ready', { cause: state.error }))
      if (this.listenerCount('error') > 0) {
        this.emit('error', state.error)
      }
    }
  }

  /**
   * Reject every pending delegated `ready()` wait with `reason`, as C-COND-04
   * rejects a condition wait, and start a fresh controller for later waits.
   */
  #cancelReadyWaits (reason: unknown): void {
    this.#readyWaits.abort(reason)
    this.#readyWaits = new AbortController()
  }

  /**
   * Resolves when the puppet's current, or next, generation is ready, so it
   * works before `start()`. Rejects with `LifecycleSupersededError` when that
   * puppet generation retires first (C-COND-04), and also when this bot accepts
   * `stop()` or fails before then, even if it never owned the puppet. Rejects with
   * the caller's abort reason on abort.
   */
  ready (options?: LifecycleWaitOptions): Promise<void> {
    const signal = options?.signal
      ? AbortSignal.any([ options.signal, this.#readyWaits.signal ])
      : this.#readyWaits.signal
    return this.puppet.ready({ signal })
  }

  /** Whether the puppet's live generation is logged in. */
  get isLoggedIn (): boolean {
    return this.puppet.isLoggedIn
  }

  // The caller API, delegated (same six members as Puppet).
  /** See `Lifecycle.state`. */
  get state (): LifecycleState { return this.#lifecycle.state }
  /** See `Lifecycle.start`. */
  start (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.start(options) }
  /**
   * See `Lifecycle.stop`. Also rejects pending `ready()` waits, at the moment the
   * stop is accepted, as C-COND-04 does for a pre-start condition wait.
   */
  stop (options?: LifecycleWaitOptions): Promise<void> {
    // A pre-aborted call accepts nothing (C-CMD-01), so it cancels nothing either.
    if (!options?.signal?.aborted) {
      this.#cancelReadyWaits(new LifecycleSupersededError('the bot was stopped before the puppet was ready'))
    }
    return this.#lifecycle.stop(options)
  }
  /** See `Lifecycle.restart`. */
  restart (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.restart(options) }
  /** See `Lifecycle.whenState`. */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> { return this.#lifecycle.whenState(predicate, options) }
  /** See `Lifecycle[Symbol.asyncDispose]`: same as `stop()`, including cancelling `ready()` waits. */
  [Symbol.asyncDispose] (): Promise<void> { return this.stop() }

}

/**
 * What a bot script looks like: start, wait until ready, and stop on exit.
 *
 * @throws The start error, or the readiness rejection when the puppet retires
 *   before it is ready.
 */
export async function main (wechaty: Wechaty): Promise<void> {
  // Disposed (stopped) when the block exits, even on an exception.
  await using bot = wechaty
  // A wait created before start() binds to the next generation (C-COND-02). It
  // rejects if that start fails, so await both together: awaiting start() first
  // would leave `ready` with no handler when start() throws, an unhandled
  // rejection (review of wechaty/wechaty#2975).
  const ready = bot.ready()
  await Promise.all([ ready, bot.start() ])
}
