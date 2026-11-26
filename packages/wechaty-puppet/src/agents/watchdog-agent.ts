/**
 * `WatchdogAgent`: watches a running puppet's `heartbeat` events and asks it to
 * `reset` when they stop arriving. `service-mixin.ts` starts and stops it with
 * the puppet.
 */
import {
  Watchdog,
  type WatchdogFood,
}                       from 'watchdog'

import type { PuppetSkeleton } from '../puppet/mod.ts'
import type { ServiceMixin } from '../mixins/service-mixin.ts'

import {
  log,
}           from '../config.ts'
import { WechatyEvent } from '../events/event-target.ts'

const DEFAULT_WATCHDOG_TIMEOUT_SECONDS  = 60

class WatchdogAgent {

  protected readonly watchdog : Watchdog

  private cleanCallbackList: Function[]

  protected readonly puppet: PuppetSkeleton & InstanceType<ServiceMixin>

  constructor (
    puppet: PuppetSkeleton & InstanceType<ServiceMixin>,
  ) {
    this.puppet = puppet
    log.verbose('PuppetWatchdogAgent', 'constructor(%s)', puppet.id)

    this.cleanCallbackList = []

    /**
     * 1. Setup Watchdog
     *  puppet implementation class only need to do one thing:
     *  feed the watchdog by `this.emit('heartbeat', ...)`
     */
    const timeoutSeconds = puppet.options.timeoutSeconds || DEFAULT_WATCHDOG_TIMEOUT_SECONDS
    log.verbose('PuppetWatchdogAgent', 'constructor() timeout %d seconds', timeoutSeconds)
    this.watchdog = new Watchdog(1000 * timeoutSeconds, 'Puppet')

    // /**
    //   * 2. Setup `reset` Event via a 1 second Throttle Queue:
    //   */
    // this.resetThrottleQueue = new ThrottleQueue<string>(1000)
    // this.resetThrottleQueue.subscribe(reason => {
    //   log.silly('PuppetWatchdogAgent', 'constructor() resetThrottleQueue.subscribe() reason: "%s"', reason)
    //   puppet.reset(reason)
    // })
  }

  start (): void {
    /**
     * puppet event `heartbeat` to feed() watchdog
     */
    const feed = (food: WatchdogFood) => { this.watchdog.feed(food) }
    const onHeartbeat = (e: { data?: string }) => feed({ data: e.data })
    this.puppet.on('heartbeat', onHeartbeat)
    log.verbose('PuppetWatchdogAgent', 'start() "heartbeat" event listener added')

    this.cleanCallbackList.push(() => {
      this.puppet.off('heartbeat', onHeartbeat)
      log.verbose('PuppetWatchdogAgent', 'start() "heartbeat" event listener removed')
    })

    /**
     * watchdog event `reset` to reset() puppet
     */
    const reset = (lastFood: WatchdogFood) => {
      log.warn('PuppetWatchdogAgent', 'start() reset() reason: %s', JSON.stringify(lastFood))
      this.puppet.dispatchEvent(new WechatyEvent('error', {
        detail: new Error(
          `WatchdogAgent reset: lastFood: "${JSON.stringify(lastFood)}"`,
        ),
      }))
      this.puppet.wrapAsync(this.puppet.reset())
    }
    this.watchdog.on('reset', reset)
    log.verbose('PuppetWatchdogAgent', 'start() "reset" event listener added')

    this.cleanCallbackList.push(() => {
      this.watchdog.off('reset', reset)
      log.verbose('PuppetWatchdogAgent', 'start() "reset" event listener removed')
    })

    // this.puppet.on('reset', this.throttleReset)
  }

  stop (): void {
    while (this.cleanCallbackList.length) {
      const callback = this.cleanCallbackList.shift()
      if (callback) {
        callback()
      }
    }
    this.watchdog.sleep()
  }

}

export { WatchdogAgent }
