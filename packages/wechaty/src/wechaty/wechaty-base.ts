/**
 * `WechatyBase`: the bot class, composed from the Wechaty mixins (puppet,
 * login, plugins, I/O, user modules and more). It adds the bot's lifecycle
 * logging, `say()` to the bot itself, and the `init()`/`start()`/`stop()`
 * order. `WechatyBuilder` and `WechatyImpl` build on it.
 */
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
import { function as FP } from 'fp-ts'
import type * as PUPPET from 'wechaty-puppet'
import { WechatyEvent } from 'wechaty-puppet'
import type {
  Lifecycle,
  LifecycleController,
  LifecycleState,
  LifecycleWaitOptions,
} from 'scopelet'
import {
  createLifecycle,
  LifecycleChildFailureError,
  LifecycleSupersededError,
} from 'scopelet'

import {
  config,
  log,
  VERSION,
}                       from '../config.ts'

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
  Wechaty,
}                             from './wechaty-impl.ts'
import type {
  WechatyOptions,
}                             from '../schemas/wechaty-options.ts'
import type { Post } from '../user-modules/post.ts'
import {
  type WechatyState,
  type LegacyStateView,
  createWechatyState,
  legacyStateView,
} from './wechaty.ts'

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
 * A `Bot` is an IM client whose protocol depends on the puppet you use, for
 * example:
 * - WeChat, with [wechaty-puppet-neo](https://github.com/wechaty/puppet-neo)
 * - any protocol served over gRPC, with `wechaty-puppet-service`
 * - a mock for tests, with `wechaty-puppet-mock`
 *
 * See more:
 * - [What is a Puppet in Wechaty](https://github.com/wechaty/getting-started/wiki/FAQ#31-what-is-a-puppet-in-wechaty)
 *
 * > If you want to know how to send message, see [Message](#Message) <br>
 * > If you want to know how to get contact, see [Contact](#Contact)
 *
 * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
 * import { WechatyBuilder } from 'wechaty'
 * const bot = WechatyBuilder.build() // the puppet comes from WECHATY_PUPPET
 * bot.addEventListener('scan',    e => console.log('https://wechaty.js.org/qrcode/' + encodeURIComponent(e.detail.qrcode)))
 * bot.addEventListener('login',   e => console.log(`User ${e.detail} logged in`))
 * bot.addEventListener('message', e => console.log(`Message: ${e.detail}`))
 * await bot.start()
 */
class WechatyBase extends mixinBase implements SayableSayer, Lifecycle {

  override __options: WechatyOptions

  static readonly VERSION = VERSION
  readonly wechaty : Wechaty

  readonly _stopCallbackList: (() => void)[] = []

  readonly #lifecycle: LifecycleController
  #readyWaits = new AbortController()

  /**
   * The term [Puppet](https://wechaty.js.org/docs/specs/puppet) in Wechaty is an Abstract Class for implementing protocol plugins.
   * The plugins are the component that helps Wechaty to control the WeChat(that's the reason we call it puppet).
   * The plugins are named XXXPuppet, for example:
   * - [PuppetWeChat](https://github.com/wechaty/puppet-wechat)
   * - [PuppetService](https://github.com/wechaty/puppet-service)
   * - [PuppetXP](https://github.com/wechaty/puppet-xp)
   *
   * @typedef PuppetModuleName
   * @property {string} wechaty-puppet-service
   * @property {string} wechaty-puppet-neo
   * @property {string} wechaty-puppet-mock
   */

  /**
   * The option parameter to create a wechaty instance.
   *
   * @typedef WechatyOptions
   * @property {string} [name] - Wechaty Name.
   */

  /**
   * Creates an instance of Wechaty.
   * @param {WechatyOptions} [options={}]
   *
   */
  constructor (
    __options: WechatyOptions = {},
  ) {
    super(__options)
    this.__options = __options
    log.verbose('Wechaty', 'constructor()')

    this.__memory = this.__options.memory
    this.wechaty  = this as unknown as Wechaty

    this.#lifecycle = createLifecycle({
      onStart: async scope => {
        log.verbose('Wechaty', 'lifecycle onStart()')
        await this.init()

        const lifeTimer = setInterval(() => {
          log.silly('Wechaty', 'onStart() setInterval() this timer is to keep Wechaty running...')
        }, 1000 * 60 * 60)
        scope.defer(() => clearInterval(lifeTimer))

        scope.defer(async () => {
          this._stopCallbackList.forEach(fn => fn())
          this._stopCallbackList.length = 0
          await super.stop()
        })
        await super.start()
        await this.onStart()
      },
      onStop: async () => {
        log.verbose('Wechaty', 'lifecycle onStop()')
        await this.onStop()
      },
      onStateChange: (state, previous) => {
        if (state.kind === 'failed' && previous.kind !== 'failed') {
          this.#cancelReadyWaits(new LifecycleSupersededError('the bot failed before the puppet was ready', { cause: state.error }))
          const err = (state.error instanceof LifecycleChildFailureError && state.error.cause !== undefined)
            ? state.error.cause
            : state.error
          const isPuppetFailure = this.__hasEmittedPuppetError(err) ||
            this.__hasEmittedPuppetError(state.error) ||
            state.error instanceof LifecycleChildFailureError
          if (!isPuppetFailure) {
            this.emitError(err)
          }
        }
      },
    }, { name: 'Wechaty', stopTimeoutMs: 30_000 })
  }

  get state (): WechatyState {
    return createWechatyState(this.#lifecycle)
  }

  get legacyState (): LegacyStateView {
    return legacyStateView(this.#lifecycle)
  }

  override start (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'start()')
    return this.#lifecycle.start(options)
  }

  override async ready (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'ready()')
    const signal = options?.signal
      ? AbortSignal.any([ options.signal, this.#readyWaits.signal ])
      : this.#readyWaits.signal
    if (signal.aborted) {
      throw signal.reason
    }
    return super.ready({ signal })
  }

  override async stop (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'stop()')
    if (!options?.signal?.aborted) {
      this.#cancelReadyWaits(new LifecycleSupersededError('the bot was stopped before the puppet was ready'))
    }
    return this.#lifecycle.stop(options)
  }

  async restart (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'restart()')
    return this.#lifecycle.restart(options)
  }

  async reset (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'reset()')
    return this.restart(options)
  }

  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> {
    return this.#lifecycle.whenState(predicate, options)
  }

  override async [Symbol.asyncDispose] (): Promise<void> {
    log.verbose('Wechaty', '[Symbol.asyncDispose]()')
    return this.stop()
  }

  #cancelReadyWaits (reason: unknown): void {
    this.#readyWaits.abort(reason)
    this.#readyWaits = new AbortController()
  }

  async onStart (): Promise<void> {
    log.verbose('Wechaty', 'onStart()')

    log.verbose('Wechaty', '<%s>(%s) onStart() v%s is starting...',
      this.__options.puppet || config.systemPuppetName(),
      this.__options.name   || '',
      this.version(),
    )
    log.verbose('Wechaty', 'id: %s', this.id)

    this.dispatchEvent(new WechatyEvent('start'))
    log.verbose('Wechaty', 'onStart() ... done')
  }

  async onStop (): Promise<void> {
    log.verbose('Wechaty', 'onStop()')

    log.verbose('Wechaty', '<%s> onStop() v%s is stopping ...',
      this.__options.puppet || config.systemPuppetName(),
      this.version(),
    )

    this.dispatchEvent(new WechatyEvent('stop'))
    log.verbose('Wechaty', 'onStop() ... done')
  }

  /**
   * Send message to currentUser, in other words, bot send message to itself.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param conversationId - Target conversation identifier.
   * @param text - Text message content.
   * @returns Promise resolving to the sent message ID, or void.
   *
   * @example
   * const bot = WechatyBuilder.build()
   * await bot.start()
   * // after logged in
   *
   * // 1. send text to bot itself
   * await bot.say('hello!')
   *
   * // 2. send Contact to bot itself
   * const contact = await bot.Contact.find()
   * await bot.say(contact)
   */
  say (conversationId: string, text: string): Promise<void | string>
  say (sayable: Sayable): Promise<void>
  async say (conversationOrSayable: string | Sayable, text?: string): Promise<void | string> {
    log.verbose('Wechaty', 'say(%s%s)', conversationOrSayable, text ? `, ${text}` : '')
    if (typeof conversationOrSayable === 'string' && typeof text === 'string') {
      return this.puppet.operation(async () => {
        const msgId = await this.puppet.messageSendText(conversationOrSayable, text)
        return msgId || undefined
      })
    }
    return this.puppet.operation(async () => {
      await this.currentUser.say(conversationOrSayable as Sayable)
    })
  }

  async publish (
    post: Post,
  ): Promise<void | Post> {
    log.verbose('Wechaty', 'publish(%s)',
      (post.payload.sayableList as PUPPET.payloads.Sayable[])
        .map(s => s.type).join(','),
    )
    return this.puppet.operation(async () => {
      const postId = await this.puppet.postPublish(post.payload)
      if (postId) {
        return this.Post.find({ id: postId })
      }
      return undefined
    })
  }

  /**
   * Compatibility emit required by legacy callers.
   * Normalizes 'error' events through `this.emitError(e)`.
   * @internal
   */
  override emit (event: string, ...args: any[]): boolean {
    if (event === 'error') {
      this.emitError(args[0])
      return true
    }
    return super.emit(event, ...args)
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
