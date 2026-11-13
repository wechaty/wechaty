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
 * Root base class (`WechatySkeleton`) owning bot UUID identity, typed
 * `EventEmitter` plumbing, options storage, and idempotent `MemoryCard`
 * initialization.
 *
 * Lifecycle orchestration lives in `WechatyBase` via `LifecycleController` +
 * `ResourceScope`; `WechatySkeleton.start()` guards against redundant
 * re-initialization when `WechatyBase` has already awaited `init()`.
 */
import { randomUUID }     from 'node:crypto'
import { MemoryCard }     from 'memory-card'
import { log }            from 'wechaty-puppet'
import type { Loggable }  from 'brolog'

import {
  WechatyEventEmitter,
  type WechatyEventName,
}                               from '../schemas/mod.ts'

import type { WechatyOptions }  from '../schemas/wechaty-options.ts'

abstract class WechatySkeleton extends WechatyEventEmitter {

  static readonly log: Loggable = log
  readonly log: Loggable = log

  /**
   * the UUID of the Wechaty
   * @ignore
   */
  readonly id: string

  __memory?: MemoryCard
  __skeletonInitialized = false

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

    this.id = randomUUID()
    this.__options = args[0] || {} as WechatyOptions

    /**
     * Huan(202008):
     *
     * Set max listeners to 1K, so that we can add lots of listeners without the warning message.
     * The listeners might be one of the following functionilities:
     *  1. Plugins
     *  2. Redux Observables
     *  3. etc...
     */
    super.setMaxListeners(1024)
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
      this.__memory = new MemoryCard(this.__options.name)
      try {
        await this.__memory.load()
      } catch (_) {
        log.silly('WechatySkeleton', 'onStart() memory.load() had already loaded')
      }
    }
    this.__skeletonInitialized = true
  }

  async start (): Promise<void> {
    log.verbose('WechatySkeleton', 'start()')
    // Avoid redundant double `init()` when an outer orchestrator (`WechatyBase`)
    // already initialized the instance for this startup attempt.
    if (!this.__skeletonInitialized) {
      await this.init()
    }
  }

  async stop  (): Promise<void> {
    log.verbose('WechatySkeleton', 'stop()')
    // no super.stop()
  }

  override on (event: WechatyEventName, listener: (...args: any[]) => any): this {
    log.verbose('WechatySkeleton', 'on(%s, listener) registering... listenerCount: %s',
      event,
      this.listenerCount(event),
    )

    return super.on(event, listener)
  }

}

type WechatySkeletonProtectedProperty =
  | '__events'
  | '__memory'
  | '__options'
  | '__skeletonInitialized'
  | 'memory'

export type {
  WechatySkeletonProtectedProperty,
}
export {
  WechatySkeleton,
}
