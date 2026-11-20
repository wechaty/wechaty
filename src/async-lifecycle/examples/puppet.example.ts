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
 * Usage example: a `Puppet` base on the composition entry point, wrapping
 * providers written against today's contract.
 *
 * Type-checked only (see `./pending-shells.ts`); it becomes a runnable test in
 * wechaty/wechaty#2973. It shows that:
 * - an EventEmitter base keeps its base class and delegates the caller API;
 * - a provider's zero-argument `onStart()` / `onStop()` work unchanged, with the
 *   legacy "onStop is the cleanup" rule kept in the Puppet base, not the kernel;
 * - `login` and `ready` are generation-bound conditions, so `isLoggedIn` and
 *   `ready()` can never report a previous run.
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
import { createLifecycle } from './pending-shells.ts'

export interface PuppetEvents {
  login: [ userId: string ]
  logout: [ userId: string ]
  ready: []
  error: [ error: unknown ]
}

/**
 * The Puppet base. Providers subclass it and implement `onStart()` and
 * `onStop()` exactly as they do today.
 */
export abstract class Puppet extends EventEmitter<PuppetEvents> implements Lifecycle {

  readonly #lifecycle: LifecycleController
  readonly #login: LifecycleCondition
  readonly #ready: LifecycleCondition

  constructor () {
    super()
    this.#lifecycle = createLifecycle({
      onStart: scope => this.#start(scope),
      onStateChange: state => this.#reportFailure(state),
    }, { name: 'Puppet', startTimeoutMs: 15_000, stopTimeoutMs: 15_000 })
    this.#login = this.#lifecycle.condition('login')
    this.#ready = this.#lifecycle.condition('ready')
  }

  /** Provider hook, unchanged: connect and log in. */
  protected abstract onStart (): Promise<void>

  /** Provider hook, unchanged: today it is "the cleanup", called even after a partial start. */
  protected abstract onStop (): Promise<void>

  async #start (scope: LifecycleScope): Promise<void> {
    // Registered first, so it is released last and also runs when onStart()
    // throws halfway: today's contract, kept here for every provider at once.
    // The kernel's own onStop hook only runs after `running` (D8), which is why
    // it is not used for this.
    scope.defer(() => this.onStop())

    // Conditions follow the provider's events for this generation only. A
    // listener from an old generation holds an old scope, so it changes nothing.
    const onLogin = () => scope.set(this.#login)
    const onLogout = () => {
      scope.clear(this.#login)
      scope.clear(this.#ready)
    }
    const onReady = () => scope.set(this.#ready)
    this.on('login', onLogin)
    this.on('logout', onLogout)
    this.on('ready', onReady)
    scope.defer(() => {
      this.off('login', onLogin)
      this.off('logout', onLogout)
      this.off('ready', onReady)
    })

    await this.onStart()
  }

  /** Map a failure to today's `'error'` event. */
  #reportFailure (state: LifecycleState): void {
    // emit('error') with no listener throws. onStateChange is isolated (C-OBS-02),
    // so that could not break the lifecycle, but checking keeps the intent clear.
    if (state.kind === 'failed' && this.listenerCount('error') > 0) {
      this.emit('error', state.error)
    }
  }

  /** Synchronous, read from the condition: no second flag that can drift (D23). */
  get isLoggedIn (): boolean {
    return this.#login.isSet
  }

  /** Resolves when the current, or next, generation is ready. */
  ready (options?: LifecycleWaitOptions): Promise<void> {
    return this.#ready.wait(options)
  }

  // The caller API, delegated. Six one-line members per composed class.
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

/** A provider written against today's contract needs no change. */
export class PuppetMock extends Puppet {

  protected override async onStart (): Promise<void> {
    this.emit('login', 'mock-user')
    this.emit('ready')
  }

  protected override async onStop (): Promise<void> {
    // Release provider resources.
  }

}
