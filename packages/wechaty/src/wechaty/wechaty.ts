/**
 * Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 * @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Modern Wechaty chatbot facade and canonical class implementation.
 *
 * Why this module exists:
 * Serves as the primary public entry point for Wechaty bot instances, built on modern
 * composition architecture instead of legacy functional mixin inheritance towers.
 * Directly inherits from pure WinterTC `WechatyEventTarget`, encapsulating subsystems
 * with native ECMAScript `#private` fields (`#options`, `#puppetManager`, `#authManager`,
 * `#pluginManager`, `#userModuleManager`, `#ioManager`, `#state`).
 *
 * Architectural boundaries:
 * Part of `packages/wechaty`. Exports canonical concrete `Wechaty` class.
 */
import { MemoryCard } from 'memory-card'
import type * as PUPPET from 'wechaty-puppet'
import {
  log,
  type EventIteratorOptions,
  WechatyEventTarget,
  WechatyEvent,
} from 'wechaty-puppet'
import type { Loggable } from 'brolog'
import {
  GError,
  type WrapAsync,
  wrapAsyncError,
} from 'gerror'
import { StateSwitch } from 'state-switch'

import { VERSION } from '../config.ts'
import type { WechatyOptions } from '../schemas/wechaty-options.ts'
import type {
  WechatyEventDetailMap,
  WechatyCustomEvent,
} from '../schemas/mod.ts'
import type {
  ContactConstructor,
  ContactSelfConstructor,
  DelayConstructor,
  FriendshipConstructor,
  ImageConstructor,
  LocationConstructor,
  MessageConstructor,
  MiniProgramConstructor,
  PostConstructor,
  RoomConstructor,
  RoomInvitationConstructor,
  TagConstructor,
  UrlLinkConstructor,
  ContactSelf,
  Message,
  Post,
} from '../user-modules/mod.ts'
import type {
  Sayable,
  SayableSayer,
} from '../sayable/mod.ts'
import type {
  WechatyPlugin,
  WechatyPluginUninstaller,
} from '../plugin.ts'
import type { Io } from '../io.ts'

import { PuppetManager } from '../components/puppet-manager.ts'
import { AuthManager } from '../components/auth-manager.ts'
import { PluginManager } from '../components/plugin-manager.ts'
import { UserModuleManager } from '../components/user-module-manager.ts'
import { IoManager } from '../components/io-manager.ts'

let _singletonInstance: Wechaty | undefined

export class Wechaty extends WechatyEventTarget implements AsyncDisposable, SayableSayer {

  // --- Static Members ---
  static readonly VERSION: string = VERSION
  static readonly log: Loggable = log

  static async start (options?: WechatyOptions): Promise<Wechaty> {
    const bot = new Wechaty(options)
    try {
      await bot.start()
    } catch (e) {
      await bot.stop().catch(() => {})
      throw e
    }
    return bot
  }

  static singleton (options?: WechatyOptions): Wechaty {
    if (_singletonInstance) {
      if (options && Object.keys(options).length > 0) {
        log.warn('Wechaty', 'singleton() options were passed but a singleton instance already exists; existing instance returned.')
      }
      return _singletonInstance
    }
    _singletonInstance = new Wechaty(options)
    return _singletonInstance
  }

  static valid (target: unknown): target is Wechaty {
    return target instanceof Wechaty
  }

  // --- Instance Properties ---
  readonly id: string = crypto.randomUUID()
  readonly log: Loggable = log
  readonly wrapAsync: WrapAsync = wrapAsyncError((e: unknown) => this.emitError(e))

  // --- ECMAScript Hard Private Fields ---
  readonly #options: WechatyOptions
  readonly #puppetManager: PuppetManager
  readonly #authManager: AuthManager
  readonly #pluginManager: PluginManager
  readonly #userModuleManager: UserModuleManager
  readonly #ioManager: IoManager
  readonly #state: StateSwitch
  readonly #stopCallbackList: (() => void)[] = []

  #memory?: MemoryCard

  constructor (options: WechatyOptions = {}) {
    super()
    this.#options = options
    this.#memory = options.memory
    this.#state = new StateSwitch('Wechaty', { log })

    this.#puppetManager = new PuppetManager(this, options)
    this.#authManager = new AuthManager(this, this.#puppetManager)
    this.#pluginManager = new PluginManager(this)
    this.#userModuleManager = new UserModuleManager(this)
    this.#ioManager = new IoManager(this, options)
  }

  // --- Core State & Subsystem Getters ---
  get memory (): MemoryCard {
    if (!this.#memory) {
      this.#memory = new MemoryCard({ name: this.#options.name || 'wechaty' })
    }
    return this.#memory
  }

  get state (): StateSwitch {
    return this.#state
  }

  get puppet (): PUPPET.Puppet {
    return this.#puppetManager.puppet
  }

  get currentUser (): ContactSelf {
    return this.#authManager.currentUser
  }

  get isLoggedIn (): boolean {
    return this.#authManager.isLoggedIn
  }

  get authQrCode (): undefined | string {
    return this.#authManager.authQrCode
  }

  get io (): Io {
    return this.#ioManager.io
  }

  get wechaty (): this {
    return this
  }

  // --- User Module Entity Constructors ---
  get Contact (): ContactConstructor { return this.#userModuleManager.Contact }
  get ContactSelf (): ContactSelfConstructor { return this.#userModuleManager.ContactSelf }
  get Delay (): DelayConstructor { return this.#userModuleManager.Delay }
  get Friendship (): FriendshipConstructor { return this.#userModuleManager.Friendship }
  get Image (): ImageConstructor { return this.#userModuleManager.Image }
  get Location (): LocationConstructor { return this.#userModuleManager.Location }
  get Message (): MessageConstructor { return this.#userModuleManager.Message }
  get MiniProgram (): MiniProgramConstructor { return this.#userModuleManager.MiniProgram }
  get Post (): PostConstructor { return this.#userModuleManager.Post }
  get Room (): RoomConstructor { return this.#userModuleManager.Room }
  get RoomInvitation (): RoomInvitationConstructor { return this.#userModuleManager.RoomInvitation }
  get Tag (): TagConstructor { return this.#userModuleManager.Tag }
  get UrlLink (): UrlLinkConstructor { return this.#userModuleManager.UrlLink }

  // --- Bot Lifecycle ---
  async init (): Promise<void> {
    log.verbose('Wechaty', 'init()')
    if (this.#memory) {
      await this.#memory.load().catch((e: unknown) => {
        if (!(e instanceof Error && e.message.includes('already loaded'))) {
          throw e
        }
      })
    }
    await this.#puppetManager.init()
  }

  async start (): Promise<void> {
    log.verbose('Wechaty', 'start()')

    if (this.#state.active()) {
      log.verbose('Wechaty', 'start() already active')
      return
    }

    this.#state.active('pending')

    try {
      await this.init()

      const lifeTimer = setInterval(() => {
        log.silly('Wechaty', 'onStart() setInterval() this timer is to keep Wechaty running...')
      }, 1000 * 60 * 60)
      if (typeof (lifeTimer as any)?.unref === 'function') {
        (lifeTimer as any).unref()
      }
      this.#stopCallbackList.push(() => clearInterval(lifeTimer))

      await this.#puppetManager.start()
      await this.#ioManager.start()

      this.dispatchEvent(new WechatyEvent('start'))
      this.#state.active(true)
      log.verbose('Wechaty', 'start() ... done')
    } catch (e) {
      this.#stopCallbackList.forEach(fn => fn())
      this.#stopCallbackList.length = 0
      this.#state.inactive(true)
      this.emitError(e)
      throw GError.from(e)
    }
  }

  async stop (): Promise<void> {
    log.verbose('Wechaty', 'stop()')

    if (this.#state.inactive()) {
      log.verbose('Wechaty', 'stop() already inactive')
      this.#stopCallbackList.forEach(fn => fn())
      this.#stopCallbackList.length = 0
      return
    }

    this.#state.inactive('pending')

    try {
      this.#stopCallbackList.forEach(fn => fn())
      this.#stopCallbackList.length = 0

      await this.#ioManager.stop()
      await this.#puppetManager.stop()

      this.dispatchEvent(new WechatyEvent('stop'))
      this.#state.inactive(true)
      log.verbose('Wechaty', 'stop() ... done')
    } catch (e) {
      this.#state.inactive(true)
      this.emitError(e)
      throw GError.from(e)
    }
  }

  async reset (): Promise<void> {
    log.verbose('Wechaty', 'reset()')
    await this.stop()
    await this.start()
  }

  async ready (): Promise<void> {
    log.verbose('Wechaty', 'ready()')
    await this.#puppetManager.ready()
  }

  async [Symbol.asyncDispose] (): Promise<void> {
    log.verbose('Wechaty', '[Symbol.asyncDispose]()')
    await this.stop()
  }

  // --- Operations & Facades ---
  async say (sayable: Sayable): Promise<void> {
    log.verbose('Wechaty', 'say(%s)', sayable)
    await this.currentUser.say(sayable)
  }

  async publish (post: Post): Promise<void | Post> {
    log.verbose('Wechaty', 'publish(%s)', post)
    const postId = await this.puppet.postPublish(post.payload)
    if (postId) {
      return this.Post.find({ id: postId })
    }
  }

  async logout (): Promise<void> {
    await this.#authManager.logout()
  }

  use (
    ...plugins: (
      | WechatyPlugin
      | WechatyPlugin[]
    )[]
  ): WechatyPluginUninstaller {
    return this.#pluginManager.use(...plugins)
  }

  ding (data?: string): void {
    log.verbose('Wechaty', 'ding(%s)', data || '')
    this.puppet.ding(data)
  }

  name (): string {
    return this.#options.name || 'wechaty'
  }

  version (): string {
    return VERSION
  }

  async sleep (milliseconds: number): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, milliseconds))
  }

  emitError (e: unknown): void {
    const gerror = e instanceof GError ? e : GError.from(e)
    this.dispatchEvent(new WechatyEvent('error', { detail: gerror }))
  }

  /**
   * Internal emit compatibility required by state-switch ServiceCtl.
   * Routes 'error' events with GError normalization. Throws a descriptive migration hint for others.
   * @internal
   */
  emit (event: string, ...args: any[]): boolean {
    if (event === 'error') {
      this.emitError(args[0])
      return true
    }
    throw new Error(`Wechaty.emit() is not supported in Wechaty 2.0. Use bot.dispatchEvent() instead.`)
  }

  // --- Typed WinterTC EventTarget Methods ---
  override addEventListener<E extends keyof WechatyEventDetailMap>(
    type: E,
    listener: (this: Wechaty, event: WechatyCustomEvent<E>) => void | Promise<void>,
    options?: boolean | AddEventListenerOptions,
  ): void
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void
  override addEventListener(
    type: string,
    listener: any,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(type, listener, options)
  }

  override removeEventListener<E extends keyof WechatyEventDetailMap>(
    type: E,
    listener: (this: Wechaty, event: WechatyCustomEvent<E>) => void | Promise<void>,
    options?: boolean | EventListenerOptions,
  ): void
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void
  override removeEventListener(
    type: string,
    listener: any,
    options?: boolean | EventListenerOptions,
  ): void {
    super.removeEventListener(type, listener, options)
  }

  override next<E extends keyof WechatyEventDetailMap>(
    type: E,
    options?: { signal?: AbortSignal },
  ): Promise<WechatyEventDetailMap[E]>
  override next<T = any>(
    type: string,
    options?: { signal?: AbortSignal },
  ): Promise<T>
  override next<T = any>(
    type: string,
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    return super.next<T>(type, options)
  }

  override events<E extends keyof WechatyEventDetailMap>(
    type: E,
    options?: EventIteratorOptions,
  ): AsyncIterable<WechatyEventDetailMap[E]>
  override events<T = any>(
    type: string,
    options?: EventIteratorOptions,
  ): AsyncIterable<T>
  override events<T = any>(
    type: string,
    options?: EventIteratorOptions,
  ): AsyncIterable<T> {
    return super.events<T>(type, options)
  }

  // --- WinterTC Streaming API ---
  messages (options?: EventIteratorOptions): AsyncIterable<Message> {
    return this.events('message', options)
  }

  messageStream (options?: { signal?: AbortSignal }): ReadableStream<Message> {
    const iterator = this.messages({ signal: options?.signal })[Symbol.asyncIterator]()
    return new ReadableStream<Message>({
      async pull (controller) {
        try {
          const { value, done } = await iterator.next()
          if (done) {
            controller.close()
          } else {
            controller.enqueue(value)
          }
        } catch (error) {
          controller.error(error)
        }
      },
      async cancel () {
        await iterator.return?.()
      },
    })
  }

  override toString (): string {
    if (Object.keys(this.#options).length <= 0) {
      return this.constructor.name
    }
    return [
      'Wechaty#',
      this.id,
      `<${(this.#options.puppet) || ''}>`,
      `(${(this.#memory && this.#memory.name) || ''})`,
    ].join('')
  }

}

/**
 * Backwards compatibility aliases for Wechaty interface and constructor types.
 */
export type WechatyInterface = {
  [K in keyof Wechaty]: Wechaty[K]
}
export type WechatyConstructor = typeof Wechaty
