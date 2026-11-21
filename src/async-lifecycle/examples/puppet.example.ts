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
 * Type-checked only, against the kernel in `../mod.ts`; it becomes a runnable test in
 * wechaty/wechaty#2973. It shows that:
 * - an EventEmitter base keeps its base class and delegates the caller API;
 * - a provider's zero-argument `onStart()` / `onStop()` work unchanged, with the
 *   legacy "onStop is the cleanup" rule kept in the Puppet base, not the kernel,
 *   including providers whose `onStart()` settles only after `onStop()` starts;
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
import { createLifecycle, listen } from '../mod.ts'

/** Today's provider events that the base turns into conditions. */
export interface PuppetEvents {
  login: [ userId: string ]
  logout: [ userId: string ]
  ready: []
  /** A QR code to scan: authentication is pending again, so readiness is lost. */
  scan: [ qrcode: string ]
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

  /** Creates the lifecycle and declares the `login` and `ready` conditions. */
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
    // At most one onStop() is in flight per generation, shared by the early and
    // the normal path. A new call happens only after a previous one rejected and
    // the ledger saw it. A hung onStop() stays pending past stopTimeoutMs, so a
    // later stop() joins it rather than starting a second, overlapping call on a
    // provider that may not be reentrant.
    //
    // The async wrapper turns a provider's synchronous throw into a cached
    // rejection: thrown from the abort listener it would be an uncaught exception,
    // and left uncached the deferred cleanup would call onStop() a second time.
    let stopping: Promise<void> | undefined
    const stopProvider = (): Promise<void> => (stopping ??= (async () => this.onStop())())

    // Registered first, so it is released last and also runs when onStart()
    // throws halfway: today's contract, kept here for every provider at once.
    // The kernel's own onStop hook only runs after `running` (D8), which is why
    // it is not used for this.
    //
    // It joins an early stop started at abort, rejected or not, so that stop's
    // error reaches the ledger. Only after the ledger has seen a failure is the
    // promise reset, so the next stop() retries it (C-SCOPE-09) rather than this
    // pass calling onStop() a second time and hiding the first error.
    scope.defer(async () => {
      try {
        await stopProvider()
      } catch (error) {
        stopping = undefined
        throw error
      }
    })

    // Some providers' onStart() settles only once onStop() is called (the
    // current puppet mixin works around one that never settles; see
    // padlocal/wechaty-puppet-padlocal#116). Retirement waits for onStart in step
    // 5 but releases in step 7, so start the provider's stop at abort (step 3)
    // while startup is still pending. The deferred cleanup above joins it.
    let started = false
    scope.signal.addEventListener('abort', () => {
      if (!started) {
        // Its error, if any, is reported by the deferred cleanup that joins it.
        stopProvider().catch(() => {})
      }
    }, { once: true })

    // Conditions follow the provider's events for this generation only. A
    // listener from an old generation holds an old scope, so it changes nothing.
    // The same holds for events the provider emits during an early onStop(),
    // before step 7 removes these listeners: by then the scope is sealed, and
    // set/clear on a sealed scope do nothing (C-SCOPE-02). `listen` registers
    // each removal with the scope (C-COMP-01).
    listen(scope, this, 'login', () => scope.set(this.#login))
    listen(scope, this, 'logout', () => {
      scope.clear(this.#login)
      scope.clear(this.#ready)
    })
    listen(scope, this, 'ready', () => scope.set(this.#ready))
    // As in today's puppet-event-bridge: a new QR code means not ready.
    listen(scope, this, 'scan', () => scope.clear(this.#ready))

    await this.onStart()
    started = true
  }

  /** Map a failure to today's `'error'` event. */
  #reportFailure (state: LifecycleState): void {
    // emit('error') with no listener throws ERR_UNHANDLED_ERROR, the trap behind
    // #2855. The listener check avoids it when a failed start() is already
    // handled by its caller. onStateChange is also isolated (C-OBS-02), so even a
    // throwing listener could not change the lifecycle's outcome.
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
  /** See `Lifecycle.state`. */
  get state (): LifecycleState { return this.#lifecycle.state }
  /** See `Lifecycle.start`. */
  start (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.start(options) }
  /** See `Lifecycle.stop`. */
  stop (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.stop(options) }
  /** See `Lifecycle.restart`. */
  restart (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.restart(options) }
  /** See `Lifecycle.whenState`. */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> { return this.#lifecycle.whenState(predicate, options) }
  /** See `Lifecycle[Symbol.asyncDispose]`: same as `stop()`. */
  [Symbol.asyncDispose] (): Promise<void> { return this.#lifecycle[Symbol.asyncDispose]() }

}

/** A provider written against today's contract needs no change. */
export class PuppetMock extends Puppet {

  /** Logs in and reports ready at once. */
  protected override async onStart (): Promise<void> {
    this.emit('login', 'mock-user')
    this.emit('ready')
  }

  /** Nothing to release; a real provider closes its connections here. */
  protected override async onStop (): Promise<void> {
    // Release provider resources.
  }

}
