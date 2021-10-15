import {
  log,
}           from '../config.js'

import type { PuppetSkelton } from '../puppet/skelton.js'
import { StateSwitch }        from 'state-switch'

const stateMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  abstract class StateMixin extends mixinBase {

    state: StateSwitch
    resetState: StateSwitch

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetStateMixin', 'constructor()')
      this.resetState = new StateSwitch('StateMixin', { log })
      this.state      = new StateSwitch('Puppet', { log })
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

      if (this.state.off()) {
        log.verbose('PuppetStateMixin', 'reset() `state` is `off`, do nothing')
        return
      }

      if (this.resetState.pending) {
        log.verbose('PuppetStateMixin', 'reset() `resetState` is `pending`, wait `ready()`...')
        await this.resetState.ready()
        log.verbose('PuppetStateMixin', 'reset() `resetState` is `pending`, wait `ready()` done')
        return
      }

      this.resetState.on('pending')

      /**
       * If the state is `on/pending` or `off/pending`,
       *  wait it to be stable before reset it
       */
      await this.state.ready()

      /**
       * Huan(202003):
       *  do not care state.off()
       *  reset will cause the puppet to start (?)
       */
      return Promise.resolve()
        .then(() => this.stop())
        .then(() => this.start())
        .catch(e => {
          log.warn('Puppet', 'reset() rejection: %s', e)
          this.emit('error', e)
        })
        .finally(() => {
          log.verbose('Puppet', 'reset() done')
          this.resetState.off(true)
        })
    }

  }

  return StateMixin
}

type StateMixin = ReturnType<typeof stateMixin>

export type {
  StateMixin,
}
export { stateMixin }
