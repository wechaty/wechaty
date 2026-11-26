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
 * Cloud IO client manager for Wechaty bot instances.
 *
 * Why this module exists:
 * Encapsulates optional Wechaty Cloud IO client lifecycle (`ioToken`),
 * replacing the legacy `ioMixin`.
 *
 * Architectural boundaries:
 * Owned by `Wechaty`. Internal to `packages/wechaty/src/components/`.
 */
import { log } from 'wechaty-puppet'
import type { Io } from '../io.ts'
import type { WechatyOptions } from '../schemas/wechaty-options.ts'
import type { Wechaty } from '../wechaty/wechaty.ts'

export class IoManager {

  readonly #wechaty: Wechaty
  readonly #ioToken?: string
  #io?: Io

  constructor (wechaty: Wechaty, options: WechatyOptions) {
    this.#wechaty = wechaty
    this.#ioToken = options.ioToken
  }

  get io (): Io {
    if (!this.#io) {
      throw new Error('NO IO')
    }
    return this.#io
  }

  async start (): Promise<void> {
    log.verbose('IoManager', 'start()')
    if (!this.#ioToken) {
      return
    }

    if (this.#io) {
      log.error('IoManager', 'start() found existing io instance: stopping...')
      try {
        await this.#io.stop()
      } catch (e) {
        this.#wechaty.emitError(e)
      }
    }

    log.verbose('IoManager', 'start() starting io ...')
    const { Io } = await import('../io.ts')
    const io = new Io({
      token: this.#ioToken,
      wechaty: this.#wechaty,
    })

    try {
      await io.start()
      this.#io = io
    } catch (e) {
      this.#wechaty.emitError(e)
    }
  }

  async stop (): Promise<void> {
    log.verbose('IoManager', 'stop()')
    if (!this.#io) {
      return
    }

    try {
      await this.#io.stop()
    } catch (e) {
      this.#wechaty.emitError(e)
    } finally {
      this.#io = undefined
    }
  }

}
