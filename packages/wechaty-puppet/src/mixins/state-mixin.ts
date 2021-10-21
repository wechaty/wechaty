import { StateSwitch }        from 'state-switch'

import {
  log,
}           from '../config.js'

import type { PuppetSkelton } from '../puppet/skelton.js'
import { BusyIndicator }      from '../busy-indicator.js'
import { WatchdogAgent }      from '../agents/watchdog-agent.js'

let PUPPET_COUNTER = 0

const stateMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  abstract class StateMixin extends mixinBase {

    readonly counter        : number
    readonly resetIndicator : BusyIndicator
    readonly state          : StateSwitch
    readonly watchdog       : WatchdogAgent

    constructor (...args: any[]) {
      super(...args)

      PUPPET_COUNTER++
      this.counter = PUPPET_COUNTER
      log.verbose('PuppetStateMixin', 'constructor() #%s', PUPPET_COUNTER)

      this.resetIndicator = new BusyIndicator('PuppetBusyIndicator', { log })
      this.state          = new StateSwitch('PuppetState', { log })
      this.watchdog       = new WatchdogAgent(this)
    }

    /**
     * Issue #157 - reset() method and 'reset' event breaking change #157
     *  @see https://github.com/wechaty/puppet/issues/157
     *
     * Updates:
     *  - Huan(201808):
     *      reset() Should not be called directly.
     *      `protected` is for testing, not for the child class.
     *      should use `emit('reset', 'reason')` instead.
     *  - Huan(202008): Update from protected to private
     *  - Huan(202110): We decided to use `reset()` to trigger the reset action
     *      instead of `emit('reset', 'reason')`
     */
    async reset (reason: string): Promise<void> {
      log.verbose('PuppetStateMixin', 'reset(%s)', reason)

      /**
       * Do not start Puppet if it's OFF
       */
      if (this.state.off()) {
        log.verbose('PuppetStateMixin', 'reset() `state` is `off`, do nothing')
        return
      }

      /**
       * Do not reset again if it's already resetting
       */
      if (this.resetIndicator.busy()) {
        log.verbose('PuppetStateMixin', 'reset() `resetBusy` is `busy`, wait `available()`...')
        await this.resetIndicator.available()
        log.verbose('PuppetStateMixin', 'reset() `resetBusy` is `busy`, wait `available()` done')
        return
      }

      this.resetIndicator.busy(true)

      try {
        /**
         * If the Puppet is starting/stopping, wait for it
         * The state will be `'on'` after await `ready()`
         */
        await this.state.ready()

        await this.stop()
        await this.start()

      } catch (e) {
        // log.warn('PuppetStateMixin', 'reset() rejection: %s', e)
        this.emitError(e)

      } finally {
        log.verbose('PuppetStateMixin', 'reset() done')
        this.resetIndicator.busy(false)
      }

    }

    override async start (): Promise<void> {
      log.verbose('PuppetStateMixin', 'start()')
      await super.start()
      this.watchdog.start()
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetStateMixin', 'stop()')
      this.watchdog.stop()
      await super.stop()
    }

  }

  return StateMixin
}

type StateMixin = ReturnType<typeof stateMixin>

type ProtectedPropertyStateMixin = never
  | 'resetIndicator'
  | 'counter'

export type {
  ProtectedPropertyStateMixin,
  StateMixin,
}
export { stateMixin }
