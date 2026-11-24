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
 * `WatchdogAgent`: watches a running puppet's `heartbeat` events and asks it to
 * `reset` when they stop arriving.
 */
import type { PuppetSkeleton } from '../puppet/mod.ts'
import type { ServiceMixin } from '../mixins/service-mixin.ts'

import {
  log,
} from '../config.ts'

const DEFAULT_WATCHDOG_TIMEOUT_SECONDS = 60

class WatchdogAgent {

  private cleanCallbackList: (() => void)[]
  protected readonly puppet: PuppetSkeleton & InstanceType<ServiceMixin>
  private timer?: ReturnType<typeof setTimeout>
  private readonly timeoutMs: number

  constructor (
    puppet: PuppetSkeleton & InstanceType<ServiceMixin>,
  ) {
    this.puppet = puppet
    log.verbose('PuppetWatchdogAgent', 'constructor(%s)', puppet.id)

    this.cleanCallbackList = []

    const timeoutSeconds = puppet.options.timeoutSeconds || DEFAULT_WATCHDOG_TIMEOUT_SECONDS
    log.verbose('PuppetWatchdogAgent', 'constructor() timeout %d seconds', timeoutSeconds)
    this.timeoutMs = 1000 * timeoutSeconds
  }

  feed (): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.triggerReset(), this.timeoutMs)
    }
  }

  private triggerReset (): void {
    log.warn('PuppetWatchdogAgent', 'triggerReset() timeout %d ms', this.timeoutMs)
    this.puppet.emit('error', new Error(
      `WatchdogAgent reset: timeout after ${this.timeoutMs}ms`,
    ))
    this.puppet.wrapAsync(this.puppet.reset())
  }

  start (): void {
    const onHeartbeat = () => this.feed()
    this.puppet.on('heartbeat', onHeartbeat)
    log.verbose('PuppetWatchdogAgent', 'start() "heartbeat" event listener added')

    this.cleanCallbackList.push(() => {
      this.puppet.off('heartbeat', onHeartbeat)
      log.verbose('PuppetWatchdogAgent', 'start() "heartbeat" event listener removed')
    })
  }

  stop (): void {
    while (this.cleanCallbackList.length) {
      const callback = this.cleanCallbackList.shift()
      if (callback) {
        callback()
      }
    }
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }

}

export { WatchdogAgent }
