/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan Li <huan@chatie.io>
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
 * Ready mixin: a `readyIndicator` that turns on with the `ready` event and off
 * on `logout`, on `reset`, and when the puppet stops.
 */
import {
  log,
} from '../config.ts'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.ts'

/**
 * Lightweight boolean indicator maintaining backward-compatible `.value()` state
 * without requiring the legacy `state-switch` package.
 */
class BooleanIndicator {

  #value: boolean

  constructor (initial = false) {
    this.#value = initial
  }

  value (val?: boolean): boolean {
    if (typeof val === 'boolean') {
      this.#value = val
    }
    return this.#value
  }

}

const readyMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class ReadyMixin extends mixinBase {

    readyIndicator: BooleanIndicator

    constructor (...args: any[]) {
      super(...args)
      log.verbose('ReadyMixin', 'constructor()')

      this.readyIndicator = new BooleanIndicator()
    }

    override async start (): Promise<void> {
      log.verbose('ReadyMixin', 'start()')
      await super.start()

      this.on('ready', () => {
        this.readyIndicator.value(true)
      })

      this.on('logout', () => {
        this.readyIndicator.value(false)
      })
      this.on('reset', () => {
        this.readyIndicator.value(false)
      })

    }

    override async stop (): Promise<void> {
      log.verbose('ReadyMixin', 'stop()')
      this.readyIndicator.value(false)

      /**
       * Huan(202201) NOTE: super.stop() should be the last line of this method
       *  becasue we should keep the reverse order of logic in start()
       */
      await super.stop()
    }

  }

  return ReadyMixin
}

type ReadyMixin = ReturnType<typeof readyMixin>

export type {
  ReadyMixin,
}
export { BooleanIndicator, readyMixin }
