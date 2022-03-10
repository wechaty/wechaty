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
import { log }            from 'wechaty-puppet'
import * as UUID          from 'uuid'
import type { Loggable }  from 'brolog'

import {
  WechatyEventEmitter,
  WechatyEventName,
}                               from '../schemas/mod.js'

import type { WechatyOptions }  from '../schemas/wechaty-options.js'

abstract class WechatySkeleton extends WechatyEventEmitter {

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

    this.id = UUID.v4()
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
  | 'memory'

export type {
  WechatySkeletonProtectedProperty,
}
export {
  WechatySkeleton,
}
