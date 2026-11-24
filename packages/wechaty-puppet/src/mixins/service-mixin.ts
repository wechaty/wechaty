/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2026 Huan Li <huan@chatie.io>
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
 * Service mixin: lifecycle control for Puppet providers backed by scopelet
 * (wechaty/wechaty#3024). Owns the LifecycleController, generation conditions
 * (`login`, `ready`), watchdog supervision, and backward-compatible state views.
 */
import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleController,
  LifecycleScope,
  LifecycleState,
  LifecycleWaitOptions,
}                                     from 'scopelet'
import {
  createLifecycle,
  LifecycleUnsafeStateError,
  listen,
  operation,
  watchdog,
}                                     from 'scopelet'

import {
  log,
}                                     from '../config.ts'
import type { PuppetSkeleton }        from '../puppet/puppet-skeleton.ts'
import { WatchdogAgent }              from '../agents/watchdog-agent.ts'

const DEFAULT_WATCHDOG_TIMEOUT_SECONDS = 60

/**
 * Legacy state-switch read view (D24) exposing active() and inactive() indicators.
 */
interface LegacyStateView {
  active (): boolean | 'pending'
  inactive (): boolean | 'pending'
  on (): boolean | 'pending'
  off (): boolean | 'pending'
}

/**
 * Puppet lifecycle state satisfying both the modern LifecycleState interface and
 * legacy state-switch boolean/pending query methods.
 */
type PuppetLifecycleState = LifecycleState & LegacyStateView

const serviceMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  let PUPPET_COUNTER = 0

  abstract class ServiceMixin extends mixinBase implements Lifecycle {

    readonly __counter        : number
    readonly __watchdog       : WatchdogAgent
    readonly __lifecycle      : LifecycleController
    readonly __loginCondition : LifecycleCondition
    readonly __readyCondition : LifecycleCondition
    __scope?                  : LifecycleScope

    constructor (...args: any[]) {
      super(...args)

      this.__counter = PUPPET_COUNTER++
      log.verbose('PuppetServiceMixin', 'constructor() #%s', this.__counter)

      this.__watchdog = new WatchdogAgent(this)

      this.__lifecycle = createLifecycle({
        onStart: scope => this.__lifecycleStart(scope),
        onStateChange: (state, previous) => this.__onStateChange(state, previous),
      }, {
        name: 'Puppet',
        startTimeoutMs: 15_000,
        stopTimeoutMs: 15_000,
      })

      this.__loginCondition = this.__lifecycle.condition('login')
      this.__readyCondition = this.__lifecycle.condition('ready')
    }

    /**
     * Provider hook implemented by subclasses: connect and start the provider.
     */
    abstract onStart (): Promise<void>

    /**
     * Provider hook implemented by subclasses: disconnect and release provider resources.
     */
    abstract onStop (): Promise<void>

    /**
     * Lifecycle startup hook orchestrating provider initialization, deferred cleanup,
     * generation conditions, and watchdog supervision.
     */
    async __lifecycleStart (scope: LifecycleScope): Promise<void> {
      log.verbose('PuppetServiceMixin', '__lifecycleStart()')

      let stopping: Promise<void> | undefined
      const stopProvider = (): Promise<void> => (stopping ??= (async () => this.onStop())())

      // Defer provider onStop and super.stop(): registered first so it runs last and
      // also executes on a partial startup failure.
      scope.defer(async () => {
        try {
          await stopProvider()
        } catch (error) {
          stopping = undefined
          throw error
        } finally {
          this.__watchdog.stop()
          await super.stop()
        }
      })

      // Early stop at abort for providers whose onStart() settles only after onStop()
      // starts (padlocal#116).
      let started = false
      scope.signal.addEventListener('abort', () => {
        if (!started) {
          stopProvider().catch(() => {})
        }
      }, { once: true })

      // Generation-bound conditions following provider events.
      listen(scope, this, 'login', () => scope.set(this.__loginCondition))
      listen(scope, this, 'logout', () => {
        scope.clear(this.__loginCondition)
        scope.clear(this.__readyCondition)
      })
      listen(scope, this, 'ready', () => scope.set(this.__readyCondition))
      listen(scope, this, 'scan', () => scope.clear(this.__readyCondition))

      // Generation-bound watchdog: disarmed until first 'heartbeat', recovers on timeout.
      const timeoutSeconds = this.options.timeoutSeconds ?? DEFAULT_WATCHDOG_TIMEOUT_SECONDS
      if (timeoutSeconds > 0) {
        const dog = watchdog(scope, {
          timeoutMs: 1000 * timeoutSeconds,
          onTimeout: 'recover',
        })
        dog.disarm()
        listen(scope, this, 'heartbeat', () => dog.feed())
      }

      await super.start()
      this.__watchdog.start()

      await this.onStart()
      started = true
      this.__scope = scope
    }

    /**
     * State change observer emitting legacy 'start', 'stop', and 'error' events.
     */
    __onStateChange (state: LifecycleState, previous: LifecycleState): void {
      log.verbose('PuppetServiceMixin', '__onStateChange(%s -> %s)', previous.kind, state.kind)
      if (state.kind === 'running' && previous.kind !== 'running') {
        this.emit('start')
      } else if (state.kind === 'stopped' && previous.kind !== 'stopped') {
        this.emit('stop')
      } else if (state.kind === 'failed') {
        if (this.listenerCount('error') > 0) {
          this.emit('error', state.error)
        }
      }
    }

    /**
     * Puppet lifecycle state satisfying LifecycleState and legacy StateSwitch queries.
     */
    get state (): PuppetLifecycleState {
      const current = this.__lifecycle.state
      const kind = current.kind
      return Object.assign(Object.create(null), current, {
        active: () => (kind === 'running' ? true : kind === 'starting' ? 'pending' : false),
        inactive: () => (kind === 'stopped' || kind === 'failed' ? true : kind === 'stopping' ? 'pending' : false),
        on: () => (kind === 'running' ? true : kind === 'starting' ? 'pending' : false),
        off: () => (kind === 'stopped' || kind === 'failed' ? true : kind === 'stopping' ? 'pending' : false),
      })
    }

    /**
     * Synchronous boolean indicating whether the current generation is logged in.
     */
    get isLoggedIn (): boolean {
      return this.__loginCondition.isSet || !!(this as any).__currentUserId
    }

    /**
     * Resolves when the current, or next, generation is ready.
     */
    ready (options?: LifecycleWaitOptions): Promise<void> {
      return this.__readyCondition.wait(options)
    }

    /**
     * Run an in-flight operation of the live generation (D24, C-COMP-03).
     * stop() waits for it before provider onStop(), and its error goes to the caller.
     */
    runOperation<T> (operationFn: (signal: AbortSignal) => Promise<T>): Promise<T> {
      if (!this.__scope) {
        return Promise.reject(new LifecycleUnsafeStateError('the puppet has not finished starting'))
      }
      return operation(this.__scope, operationFn)
    }

    /**
     * Send text as an operation of the live generation (D24, C-COMP-03).
     */
    send (conversationId: string, text: string): Promise<string> {
      return this.runOperation(signal => (this as any).messageSendText(conversationId, text, signal))
    }

    /**
     * Start the puppet.
     */
    override async start (options?: LifecycleWaitOptions): Promise<void> {
      log.verbose('PuppetServiceMixin', 'start()')
      return this.__lifecycle.start(options)
    }

    /**
     * Stop the puppet.
     */
    override async stop (options?: LifecycleWaitOptions): Promise<void> {
      log.verbose('PuppetServiceMixin', 'stop()')
      return this.__lifecycle.stop(options)
    }

    /**
     * Restart the puppet.
     */
    async restart (options?: LifecycleWaitOptions): Promise<void> {
      log.verbose('PuppetServiceMixin', 'restart()')
      return this.__lifecycle.restart(options)
    }

    /**
     * Legacy reset: emits 'reset' and delegates to restart().
     */
    async reset (reasonOrOptions?: string | LifecycleWaitOptions): Promise<void> {
      log.verbose('PuppetServiceMixin', 'reset(%s)', typeof reasonOrOptions === 'string' ? reasonOrOptions : '')
      const reason = typeof reasonOrOptions === 'string' ? reasonOrOptions : undefined
      const options = typeof reasonOrOptions === 'object' ? reasonOrOptions : undefined
      this.emit('reset', { data: reason || '' })
      return this.restart(options)
    }

    /**
     * Wait for a state condition matching predicate.
     */
    whenState (
      predicate: (state: LifecycleState) => boolean,
      options?: LifecycleWaitOptions,
    ): Promise<LifecycleState> {
      return this.__lifecycle.whenState(predicate, options)
    }

    /**
     * Async disposal: same as stop().
     */
    [Symbol.asyncDispose] (): Promise<void> {
      return this.__lifecycle[Symbol.asyncDispose]()
    }

  }

  return ServiceMixin
}

type ServiceMixin = ReturnType<typeof serviceMixin>

type ProtectedPropertyServiceMixin =
  | '__counter'
  | '__watchdog'
  | '__lifecycle'
  | '__scope'
  | '__loginCondition'
  | '__readyCondition'
  | '__lifecycleStart'
  | '__onStateChange'

export type {
  LegacyStateView,
  ProtectedPropertyServiceMixin,
  PuppetLifecycleState,
  ServiceMixin,
}
export { serviceMixin }
