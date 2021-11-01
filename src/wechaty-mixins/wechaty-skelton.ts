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
import { MemoryCard } from 'memory-card'
import { log } from 'wechaty-puppet'

import {
  WechatyEventEmitter,
}                             from '../events/wechaty-events.js'
import type { WechatyOptions } from '../wechaty.js'

abstract class WechatySkelton extends WechatyEventEmitter {

  /**
   * @protected
   */
  _memory?: MemoryCard
  get memory (): MemoryCard {
    if (!this._memory) {
      throw new Error('NOMEMORY')
    }
    return this._memory
  }

  /**
   * @protected
   */
  _options: WechatyOptions

  constructor (...args: any[]) {
    log.verbose('WechatySkelton', 'constructor()')
    super()
    this._options = args[0] || {} as WechatyOptions
  }

  async start (): Promise<void> {
    log.verbose('WechatySkelton', 'start()')
    // no super.start()

    if (!this._memory) {
      this._memory = new MemoryCard(this._options.name)
      try {
        await this._memory.load()
      } catch (_) {
        log.silly('Wechaty', 'onStart() memory.load() had already loaded')
      }
    }

  }

  async stop  (): Promise<void> {
    log.verbose('WechatySkelton', 'stop()')
    // no super.stop()
  }

}

export {
  WechatySkelton,
}
