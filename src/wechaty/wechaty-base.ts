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
 * Core `WechatyBase` class orchestrating asynchronous bot lifecycle via
 * explicit composition (`LifecycleController`, `ResourceScope`, `ReadinessGate`)
 * instead of `state-switch`'s `serviceCtlMixin`.
 *
 * Resource ownership and deterministic execution order per generation:
 *   - Acquire: `init() + skeleton -> puppet (+ event bridge) -> io -> keepAlive + onStart()` -> commit `running` -> emit `'start'`
 *   - Release: `onStop() + keepAlive -> io -> puppet (+ event bridge) -> skeleton` -> commit `stopped` -> emit `'stop'`
 *
 * Lifecycle failures surface via rejected Promises and immutable `state`
 * snapshots regardless of whether an `'error'` listener is attached (#2855).
 * Watchdog/Puppet/IO resets route through revision-fenced `recover()` so
 * automatic recovery can never restart an explicitly stopped bot.
 */
import { function as FP } from 'fp-ts'
import type * as PUPPET from 'wechaty-puppet'

import {
  config,
  log,
  VERSION,
}                       from '../config.ts'
import {
  type LifecycleCallOptions,
  LifecycleController,
  type LifecycleState,
  ReadinessGate,
}                       from '../lifecycle/mod.ts'

import type {
  SayableSayer,
  Sayable,
}                             from '../sayable/mod.ts'
import {
  gErrorMixin,
  ioMixin,
  loginMixin,
  miscMixin,
  pluginMixin,
  puppetMixin,
  wechatifyUserModuleMixin,
}                             from '../wechaty-mixins/mod.ts'

import {
  WechatySkeleton,
}                             from './wechaty-skeleton.ts'
import type {
  WechatyInterface,
}                             from './wechaty-impl.ts'
import type {
  WechatyOptions,
}                             from '../schemas/wechaty-options.ts'
import type { PostInterface } from '../user-modules/post.ts'

const mixinBase = FP.pipe(
  WechatySkeleton,
  gErrorMixin,
  wechatifyUserModuleMixin,
  ioMixin,
  puppetMixin,
  loginMixin,
  miscMixin,
  pluginMixin,
)

/**
 * Main bot class.
 *
 * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
 * import { WechatyBuilder } from 'wechaty'
 * const bot = WechatyBuilder.build()
 * bot.on('scan',    (qrCode, status) => console.log('https://wechaty.js.org/qrcode/' + encodeURIComponent(qrCode)))
 * bot.on('login',   user => console.log(`User ${user} logged in`))
 * bot.on('message', message => console.log(`Message: ${message}`))
 * bot.start()
 */
class WechatyBase extends mixinBase implements SayableSayer {

  override __options: WechatyOptions

  static readonly VERSION = VERSION
  readonly wechaty : WechatyInterface

  readonly _stopCallbackList: Array<() => Promise<void> | void> = []

  readonly #lifecycle: LifecycleController
  readonly #readiness: ReadinessGate
  #runningGeneration: number | null = null

  /**
   * Creates an instance of Wechaty.
   */
  constructor (
    __options: WechatyOptions = {},
  ) {
    super(__options)
    this.__options = __options
    log.verbose('Wechaty', 'constructor()')

    this.__memory = this.__options.memory
    this.wechaty  = this

    this.#lifecycle = new LifecycleController({
      hooks: {
        onStateChange: (nextState, previousState) => {
          this.#readiness.handleStateChange(nextState)

          if (nextState.kind === 'running') {
            this.#runningGeneration = nextState.generation
            this.emit('start')
            return
          }

          if (
            nextState.kind === 'stopped'
            && previousState.kind === 'stopping'
            && this.#runningGeneration === nextState.generation
          ) {
            this.#runningGeneration = null
            this.emit('stop')
            return
          }

          if (nextState.kind === 'failed') {
            this.#runningGeneration = null
            // Notify registered `'error'` listeners without triggering Node's
            // synchronous `ERR_UNHANDLED_ERROR` when no listener is attached (#2855).
            if (this.listenerCount('error') > 0) {
              this.emitError(nextState.error)
            }
          }
        },
        start: async ({ fail, generation, scope }) => {
          await this.init()

          await scope.acquire({
            create: () => WechatySkeleton.prototype.start.call(this),
            dispose: () => WechatySkeleton.prototype.stop.call(this),
            name: 'skeleton',
          })

          await this.__acquirePuppet(scope, generation, fail)
          await this.__acquireIo(scope)

          await scope.acquire({
            create: async () => {
              const lifeTimer = setInterval(() => {
                log.silly('Wechaty', 'onStart() setInterval() this timer is to keep Wechaty running...')
              }, 1000 * 60 * 60)
              this._stopCallbackList.push(() => clearInterval(lifeTimer))
              await this.onStart()
            },
            dispose: async () => {
              await this.onStop()
            },
            name: 'wechatyHooks',
          })
        },
      },
      name: 'Wechaty',
    })

    this.#readiness = new ReadinessGate(this.#lifecycle)
    this.__bindPuppetLifecycleBridge({
      getActiveGeneration: () => this.#lifecycle.state.generation,
      onPuppetReset: () => {
        const token = this.#lifecycle.captureRecoveryToken()
        void this.#lifecycle.recover(token).catch(e => {
          if (this.listenerCount('error') > 0) {
            this.emitError(e)
          }
        })
      },
      readiness: this.#readiness,
    })
  }

  /**
   * Immutable read-only snapshot of the bot's asynchronous lifecycle state.
   */
  get state (): LifecycleState {
    return this.#lifecycle.state
  }

  /**
   * Starts the bot and resolves once initialization, Puppet startup, optional
   * IO startup, and `onStart()` have all completed for this attempt.
   */
  override async start (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('Wechaty', 'start()')
    return this.#lifecycle.start(options)
  }

  /**
   * Stops the bot and resolves only after `onStop()`, optional IO teardown,
   * and Puppet teardown have all completed.
   */
  override async stop (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('Wechaty', 'stop()')
    this.#readiness.cancelPendingPreStartWaiters()
    return this.#lifecycle.stop(options)
  }

  /**
   * Explicitly retires any running generation and starts a fresh replacement
   * generation. Superseded if a later `stop()` is issued.
   */
  async restart (options?: LifecycleCallOptions): Promise<void> {
    log.verbose('Wechaty', 'restart()')
    return this.#lifecycle.restart(options)
  }

  /**
   * Waits for the bot's lifecycle state to match `predicate` across generations.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleCallOptions,
  ): Promise<LifecycleState> {
    return this.#lifecycle.whenState(predicate, options)
  }

  /**
   * Triggers supervisor-style recovery of the currently active generation.
   * No-op if the bot is `stopped` or if superseded by a concurrent `stop()`.
   */
  async reset (reason?: string): Promise<void> {
    log.verbose('Wechaty', 'reset(%s)', reason || '')
    const token = this.#lifecycle.captureRecoveryToken()
    await this.#lifecycle.recover(token)
  }

  async onStart (): Promise<void> {
    log.verbose('Wechaty', 'onStart()')

    log.verbose('Wechaty', '<%s>(%s) onStart() v%s is starting...',
      this.__options.puppet || config.systemPuppetName(),
      this.__options.name   || '',
      this.version(),
    )
    log.verbose('Wechaty', 'id: %s', this.id)
    log.verbose('Wechaty', 'onStart() ... done')
  }

  async onStop (): Promise<void> {
    log.verbose('Wechaty', 'onStop()')

    log.verbose('Wechaty', '<%s> onStop() v%s is stopping ...',
      this.__options.puppet || config.systemPuppetName(),
      this.version(),
    )

    const callbacks = this._stopCallbackList.splice(0, this._stopCallbackList.length)
    for (let i = callbacks.length - 1; i >= 0; i--) {
      await callbacks[i]!()
    }

    log.verbose('Wechaty', 'onStop() ... done')
  }

  /**
   * Send message to currentUser, in other words, bot send message to itself.
   */
  async say (
    sayable: Sayable,
  ): Promise<void> {
    log.verbose('Wechaty', 'say(%s)', sayable)
    await this.currentUser.say(sayable)
  }

  async publish (
    post: PostInterface,
  ): Promise<void | PostInterface> {
    log.verbose('Wechaty', 'publish(%s)',
      (post.payload.sayableList as PUPPET.payloads.Sayable[])
        .map(s => s.type).join(','),
    )
    const postId = await this.puppet.postPublish(post.payload)

    if (postId) {
      return this.Post.find({ id: postId })
    }
  }

}

type WechatyBaseProtectedProperty =
  | 'wechaty'
  | 'onStart'
  | 'onStop'

export type {
  WechatyBaseProtectedProperty,
}
export {
  WechatyBase,
}
