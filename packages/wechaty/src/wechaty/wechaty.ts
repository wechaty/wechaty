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
 * `#pluginManager`, `#userModuleManager`, `#ioManager`, `#lifecycle`).
 *
 * Architectural boundaries:
 * Part of `packages/wechaty`. Exports canonical concrete `Wechaty` class.
 */
import { MemoryCard } from 'memory-card'
import * as PUPPET from 'wechaty-puppet'
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
import type {
  Lifecycle,
  LifecycleConditionHandle,
  LifecycleController,
  LifecycleScope,
  LifecycleState,
  LifecycleWaitOptions,
} from 'scopelet'
import {
  createLifecycle,
  LifecycleChildFailureError,
} from 'scopelet'

import {
  config,
  VERSION,
} from '../config.ts'
import { NO_PUPPET_MESSAGE } from '../puppet-config.ts'
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

/**
 * `state-switch`'s read side, which today's `Wechaty` calls as
 * `state.active()` / `state.inactive()`: `true` when settled in that state,
 * `'pending'` while moving towards it, `false` otherwise.
 */
export interface LegacyStateView {
  active (): boolean | 'pending'
  inactive (): boolean | 'pending'
}

/**
 * Derive the `state-switch` view from a lifecycle's state (D24, integration
 * layer). Read live, so it can never drift from `state`:
 *
 * | `state.kind` | `active()` | `inactive()` |
 * | --- | --- | --- |
 * | `starting` | `'pending'` | `false` |
 * | `running` | `true` | `false` |
 * | `stopping` | `false` | `'pending'` |
 * | `stopped`, `failed` | `false` | `true` |
 */
export function legacyStateView (lifecycle: Pick<Lifecycle, 'state'>): LegacyStateView {
  return {
    active: () => {
      const kind = lifecycle.state.kind
      return kind === 'running' ? true : kind === 'starting' ? 'pending' : false
    },
    inactive: () => {
      const kind = lifecycle.state.kind
      return kind === 'stopped' || kind === 'failed' ? true : kind === 'stopping' ? 'pending' : false
    },
  }
}

/**
 * Dynamic state view exposed via `wechaty.state`, combining modern `LifecycleState`
 * properties with backwards-compatible `StateSwitch` query methods.
 */
export type WechatyState = LifecycleState & {
  active (): boolean | 'pending'
  inactive (): boolean | 'pending'
  on (): boolean | 'pending'
  off (): boolean | 'pending'
  stable (expected?: 'active' | 'inactive'): Promise<void>
}

/**
 * Creates a frozen `WechatyState` view derived consistently from the current lifecycle state.
 *
 * @param lifecycle - Lifecycle controller instance.
 * @returns Frozen `WechatyState` combining current snapshot properties with query methods.
 */
export function createWechatyState (lifecycle: Pick<Lifecycle, 'state' | 'whenState'>): WechatyState {
  const current = lifecycle.state
  const active = (): boolean | 'pending' => {
    const kind = current.kind
    return kind === 'running' ? true : kind === 'starting' ? 'pending' : false
  }
  const inactive = (): boolean | 'pending' => {
    const kind = current.kind
    return kind === 'stopped' || kind === 'failed' ? true : kind === 'stopping' ? 'pending' : false
  }
  const stable = async (expected?: 'active' | 'inactive'): Promise<void> => {
    if (expected === 'active') {
      await lifecycle.whenState(st => st.kind === 'running')
    } else if (expected === 'inactive') {
      await lifecycle.whenState(st => st.kind === 'stopped' || st.kind === 'failed')
    } else {
      await lifecycle.whenState(st => st.kind === 'running' || st.kind === 'stopped' || st.kind === 'failed')
    }
  }
  return Object.freeze({
    ...current,
    active,
    inactive,
    on: active,
    off: inactive,
    stable,
  })
}

export class Wechaty extends WechatyEventTarget implements Lifecycle, AsyncDisposable, SayableSayer {

  // --- Static Members ---
  static readonly VERSION: string = VERSION
  static readonly log: Loggable = log

  /**
   * Resolves a named or default Puppet provider before returning a constructed Wechaty bot.
   */
  static async create (options: WechatyOptions = {}): Promise<Wechaty> {
    let resolvedOptions = options
    if (!options.puppet || typeof options.puppet === 'string') {
      const puppetName = options.puppet || config.systemPuppetName()
      if (!puppetName) {
        throw new Error(NO_PUPPET_MESSAGE)
      }
      const puppetInstance = await PUPPET.helpers.resolvePuppet({
        puppet: puppetName,
        puppetOptions: 'puppetOptions' in options ? options.puppetOptions : undefined,
      })
      resolvedOptions = { ...options, puppet: puppetInstance }
    }
    return new Wechaty(resolvedOptions)
  }

  static async start (options?: WechatyOptions): Promise<Wechaty> {
    const bot = await Wechaty.create(options)
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
  readonly #lifecycle: LifecycleController
  readonly #readyCondition: LifecycleConditionHandle

  #memory?: MemoryCard

  constructor (options: WechatyOptions = {}) {
    super()
    this.#options = options
    this.#memory = options.memory

    this.#puppetManager = new PuppetManager(
      this,
      options,
      state => this.#setReady(state),
    )
    this.#authManager = new AuthManager(this, this.#puppetManager)
    this.#pluginManager = new PluginManager(this)
    this.#userModuleManager = new UserModuleManager(this)
    this.#ioManager = new IoManager(this, options)

    this.#lifecycle = createLifecycle({
      onStart: scope => this.#lifecycleStart(scope),
      onStateChange: (state, previous) => this.#onLifecycleStateChange(state, previous),
    }, { name: 'Wechaty', stopTimeoutMs: 30_000 })
    this.#readyCondition = this.#lifecycle.condition('ready')
  }

  async #lifecycleStart (scope: LifecycleScope): Promise<void> {
    log.verbose('Wechaty', 'lifecycle onStart()')

    await this.init()

    const lifeTimer = setInterval(() => {
      log.silly('Wechaty', 'onStart() setInterval() this timer is to keep Wechaty running...')
    }, 1000 * 60 * 60)
    scope.defer(() => clearInterval(lifeTimer))

    // Arm Io event capture before either child starts, then boot Io and Puppet concurrently.
    if (this.#ioManager.hasIo) {
      await this.#ioManager.prepare(scope)
    }

    await Promise.all([
      this.#ioManager.hasIo ? this.#ioManager.start(scope) : Promise.resolve(),
      scope.start(this.puppet),
    ])
  }

  #onLifecycleStateChange (state: LifecycleState, previous: LifecycleState): void {
    if (state.kind === 'running' && previous.kind !== 'running') {
      this.dispatchEvent(new WechatyEvent('start'))
    } else if (state.kind === 'stopped' && previous.kind !== 'stopped') {
      this.dispatchEvent(new WechatyEvent('stop'))
    } else if (state.kind === 'failed' && previous.kind !== 'failed') {
      const err = (state.error instanceof LifecycleChildFailureError && state.error.cause !== undefined)
        ? state.error.cause
        : state.error
      this.emitError(err)
    }
  }

  #setReady (state: 'active' | 'inactive'): void {
    if (this.#lifecycle.isActive) {
      if (state === 'active') {
        this.#readyCondition.set()
      } else {
        this.#readyCondition.clear()
      }
    }
  }

  // --- Core State & Subsystem Getters ---
  get memory (): MemoryCard {
    if (!this.#memory) {
      throw new Error('NOMEMORY')
    }
    return this.#memory
  }

  /**
   * Current lifecycle state of the bot, combining modern `LifecycleState` properties
   * with backwards-compatible `StateSwitch` query methods (`.active()`, `.inactive()`, `.stable()`).
   */
  get state (): WechatyState {
    return createWechatyState(this.#lifecycle)
  }

  /** See {@link Lifecycle.isRunning}. */
  get isRunning (): boolean {
    return this.#lifecycle.isRunning
  }

  /** See {@link Lifecycle.isActive}. */
  get isActive (): boolean {
    return this.#lifecycle.isActive
  }

  /** See {@link Lifecycle.isStarting}. */
  get isStarting (): boolean {
    return this.#lifecycle.isStarting
  }

  /** See {@link Lifecycle.isStopping}. */
  get isStopping (): boolean {
    return this.#lifecycle.isStopping
  }

  /** See {@link Lifecycle.isStopped}. */
  get isStopped (): boolean {
    return this.#lifecycle.isStopped
  }

  /** See {@link Lifecycle.isFailed}. */
  get isFailed (): boolean {
    return this.#lifecycle.isFailed
  }

  /** See {@link Lifecycle.whenRunning}. */
  whenRunning (options?: LifecycleWaitOptions): Promise<void> {
    return this.#lifecycle.whenRunning(options)
  }

  /** See {@link Lifecycle.whenStopped}. */
  whenStopped (options?: LifecycleWaitOptions): Promise<void> {
    return this.#lifecycle.whenStopped(options)
  }

  /**
   * Backwards-compatible `state-switch` view interface.
   */
  get legacyState (): LegacyStateView {
    return legacyStateView(this.#lifecycle)
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
    if (!this.#memory) {
      const isBrowser = typeof (globalThis as any).process?.cwd !== 'function'
      if (isBrowser) {
        this.#memory = new MemoryCard({
          name: typeof this.#options.name === 'string' ? this.#options.name : undefined,
          storageOptions: { type: 'nop' },
        })
      } else {
        this.#memory = new MemoryCard(this.#options.name)
      }
    }
    try {
      await this.#memory.load()
    } catch (err: any) {
      if (!err?.message?.includes?.('already loaded')) {
        throw err
      }
      log.silly('Wechaty', 'init() memory.load() had already loaded')
    }
    await this.#puppetManager.init()
  }

  async start (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'start()')
    try {
      await this.#lifecycle.start(options)
    } catch (error) {
      if (options?.signal?.aborted || (error as Error)?.name === 'LifecycleSupersededError') {
        throw error
      }
      if (this.#lifecycle.state.kind === 'stopping') {
        await this.#lifecycle.whenState(
          s => s.kind === 'failed' || s.kind === 'stopped',
          { signal: options?.signal },
        ).catch(() => {})
      }
      throw error
    }
  }

  stop (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'stop()')
    return this.#lifecycle.stop(options)
  }

  /**
   * Restarts the bot lifecycle atomically.
   *
   * @param options - Optional wait options.
   */
  restart (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'restart()')
    return this.#lifecycle.restart(options)
  }

  /**
   * Alias for restart().
   *
   * @param options - Optional wait options.
   */
  reset (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'reset()')
    return this.restart(options)
  }

  /**
   * Awaits a lifecycle state transition matching the given predicate.
   *
   * @param predicate - Function returning true when target state is reached.
   * @param options - Optional wait options (signal, timeout).
   * @returns Promise resolving to matching LifecycleState.
   */
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> {
    return this.#lifecycle.whenState(predicate, options)
  }

  /**
   * Resolves when the bot's puppet is ready to handle operations.
   * Waits created before `start()` bind to the next generation and reject
   * with `LifecycleSupersededError` if the bot stops or fails before becoming ready.
   *
   * @param options - Optional wait options (signal).
   * @returns Promise resolving when ready.
   */
  ready (options?: LifecycleWaitOptions): Promise<void> {
    log.verbose('Wechaty', 'ready()')
    return this.#readyCondition.wait(options)
  }

  /**
   * Asynchronously disposes the bot by stopping its lifecycle.
   */
  [Symbol.asyncDispose] (): Promise<void> {
    log.verbose('Wechaty', '[Symbol.asyncDispose]()')
    return this.stop()
  }

  // --- Operations & Facades ---

  /**
   * Sends a message to a conversation or sends a Sayable directly to bot itself.
   * Execution is bound to the puppet's active lifecycle generation and drains on stop.
   *
   * @param conversationId - Target conversation identifier.
   * @param text - Text message content.
   * @returns Promise resolving to the sent message ID, or void if unsupported by puppet.
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

  /**
   * Publishes a post moment.
   * Execution is bound to the puppet's active lifecycle generation and drains on stop.
   *
   * @param post - Post instance to publish.
   * @returns Promise resolving to the created Post or undefined.
   */
  async publish (post: Post): Promise<void | Post> {
    log.verbose('Wechaty', 'publish(%s)', post)
    return this.puppet.operation(async () => {
      const postId = await this.puppet.postPublish(post.payload)
      if (postId) {
        return this.Post.find({ id: postId })
      }
      return undefined
    })
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
    try {
      this.puppet.ding(data)
    } catch (e) {
      this.emitError(e)
    }
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
   * Internal emit compatibility required by legacy callers.
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
