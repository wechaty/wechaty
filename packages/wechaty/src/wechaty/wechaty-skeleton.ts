/**
 * Abstract Wechaty skeleton defining bot identity, memory card, and pure WinterTC EventTarget foundation.
 *
 * Why this module exists:
 * Provides the foundational abstract base class for Wechaty bot implementations, establishing
 * a pure WinterTC `EventTarget` without legacy Node.js EventEmitter surface (`on`, `off`, `once`),
 * managing unique bot identity (`id`), persistent `MemoryCard` lifecycle, and start/stop/init hooks.
 *
 * Architectural boundaries:
 * Extended by the bot mixin hierarchy (`WechatyBase`).
 *
 * Key relationships:
 * - `wechaty-puppet`: Provides `WechatyEventTarget`.
 * - `wechaty-base.ts`: Inherits from `WechatySkeleton` through functional mixin composition.
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
import { MemoryCard }     from 'memory-card'
import { GError }         from 'gerror'
import {
  log,
  type EventIteratorOptions,
  WechatyEventTarget,
  WechatyEvent,
}                         from 'wechaty-puppet'
import type { Loggable }  from 'brolog'

import type { MessageInterface } from '../user-modules/mod.ts'
import type { WechatyOptions }  from '../schemas/wechaty-options.ts'

abstract class WechatySkeleton extends WechatyEventTarget {

  static readonly log: Loggable = log
  readonly log: Loggable = log

  /**
   * the UUID of the Wechaty
   * @ignore
   */
  readonly id: string

  __memory?: MemoryCard
  get memory (): MemoryCard {
    if (!this.__memory) {
      throw new Error('NOMEMORY')
    }
    return this.__memory
  }

  __options: WechatyOptions

  constructor (...args: any[]) {
    log.verbose('WechatySkeleton', 'constructor()')
    super()

    this.id = crypto.randomUUID()
    this.__options = args[0] || {} as WechatyOptions
  }

  /**
   * Async iterator yielding hydrated incoming messages for AI Agent loops.
   *
   * @param options - EventIteratorOptions with backpressure and AbortSignal.
   * @returns AsyncIterable yielding hydrated Message entities.
   */
  messages (options?: EventIteratorOptions): AsyncIterable<MessageInterface> {
    return this.events('message', options)
  }

  /**
   * WHATWG ReadableStream yielding hydrated incoming messages.
   *
   * @param options - Options with AbortSignal.
   * @returns ReadableStream of Message entities.
   */
  messageStream (options?: { signal?: AbortSignal }): ReadableStream<MessageInterface> {
    const iterator = this.messages(options)[Symbol.asyncIterator]()
    return new ReadableStream<MessageInterface>({
      async pull (controller) {
        try {
          const { done, value } = await iterator.next()
          if (done) {
            controller.close()
          } else {
            controller.enqueue(value)
          }
        } catch (error) {
          controller.error(error)
        }
      },
      async cancel (reason) {
        if (iterator.return) {
          await iterator.return(reason)
        }
      },
    })
  }

  /**
   * Standard AsyncDisposable implementation for `await using bot = ...`.
   */
  async [Symbol.asyncDispose] (): Promise<void> {
    await this.stop()
  }

  /**
   * Initialize the Wechaty instance for ready to be started.
   *
   *  1. It will be called automatically by the start()
   *  2. It should be allowed for being called multiple times in the same instance,
   *    by skipping the second time initialization.
   */
  async init (): Promise<void> {
    log.verbose('WechatySkeleton', 'init()')

    if (!this.__memory) {
      const isBrowser = typeof (globalThis as any).process?.cwd !== 'function'
      if (isBrowser) {
        this.__memory = new MemoryCard({
          name: typeof this.__options.name === 'string' ? this.__options.name : undefined,
          storageOptions: { type: 'nop' },
        })
      } else {
        this.__memory = new MemoryCard(this.__options.name)
      }
      try {
        await this.__memory.load()
      } catch (err: any) {
        if (!err?.message?.includes?.('already loaded')) {
          throw err
        }
        log.silly('WechatySkeleton', 'onStart() memory.load() had already loaded')
      }
    }
  }

  async start (): Promise<void> {
    log.verbose('WechatySkeleton', 'start()')
    // no super.start()

    /**
     * Huan(202203): Call the init() functions (with super.init() inside them for chaining)
     */
    await this.init()
  }

  async stop  (): Promise<void> {
    log.verbose('WechatySkeleton', 'stop()')
    // no super.stop()
  }

  /**
   * Internal emit compatibility required by state-switch ServiceCtl.
   * Dispatches a WechatyEvent with GError normalization for error events.
   * Throws if invoked for unsupported events to prevent legacy EventEmitter usage.
   * @internal
   */
  emit (event: string, ...args: any[]): boolean {
    if (event === 'error') {
      const error = GError.from(args[0])
      return this.dispatchEvent(new WechatyEvent('error', { detail: error }))
    }
    throw new Error(`Wechaty.emit() is not supported in Wechaty 2.0. Use bot.dispatchEvent() instead.`)
  }

}

type WechatySkeletonProtectedProperty =
  | '__memory'
  | '__options'
  | 'memory'

export type {
  WechatySkeletonProtectedProperty,
}
export {
  WechatySkeleton,
}
