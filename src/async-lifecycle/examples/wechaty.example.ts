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
 */

import { EventEmitter } from 'node:events'

import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleController,
  LifecycleScope,
  LifecycleState,
  LifecycleWaitOptions,
}                           from '../types.ts'
import type { Io } from './io.example.ts'
import { createLifecycle } from './pending-shells.ts'
import type { Puppet } from './puppet.example.ts'

export interface WechatyEvents {
  start: []
  stop: []
  ready: []
  error: [ error: unknown ]
}

export class Wechaty extends EventEmitter<WechatyEvents> implements Lifecycle {

  readonly puppet: Puppet
  readonly io: Io | undefined

  readonly #lifecycle: LifecycleController
  readonly #ready: LifecycleCondition

  constructor (puppet: Puppet, io?: Io) {
    super()
    this.puppet = puppet
    this.io = io
    this.#lifecycle = createLifecycle({
      onStart: scope => this.#start(scope),
      onStateChange: (state, previous) => this.#emitLegacyEvents(state, previous),
    }, { name: 'Wechaty', stopTimeoutMs: 30_000 })
    this.#ready = this.#lifecycle.condition('ready')
  }

  async #start (scope: LifecycleScope): Promise<void> {
    // Mirror the puppet's readiness into this generation. Registered before the
    // puppet starts, so an early 'ready' cannot be missed.
    const onReady = () => {
      scope.set(this.#ready)
      this.emit('ready')
    }
    const onLogout = () => scope.clear(this.#ready)
    this.puppet.on('ready', onReady)
    this.puppet.on('logout', onLogout)
    scope.defer(() => {
      this.puppet.off('ready', onReady)
      this.puppet.off('logout', onLogout)
    })

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
    } else if (state.kind === 'failed' && this.listenerCount('error') > 0) {
      this.emit('error', state.error)
    }
  }

  /** Resolves when the current, or next, generation is ready. Works before start(). */
  ready (options?: LifecycleWaitOptions): Promise<void> {
    return this.#ready.wait(options)
  }

  get isLoggedIn (): boolean {
    return this.puppet.isLoggedIn
  }

  // The caller API, delegated (same six members as Puppet).
  get state (): LifecycleState { return this.#lifecycle.state }
  start (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.start(options) }
  stop (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.stop(options) }
  restart (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.restart(options) }
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> { return this.#lifecycle.whenState(predicate, options) }
  [Symbol.asyncDispose] (): Promise<void> { return this.#lifecycle[Symbol.asyncDispose]() }

}

/** What a bot script looks like. */
export async function main (wechaty: Wechaty): Promise<void> {
  // Disposed (stopped) when the block exits, even on an exception.
  await using bot = wechaty
  const ready = bot.ready()   // binds to the next generation (C-COND-02)
  await bot.start()
  await ready
}
