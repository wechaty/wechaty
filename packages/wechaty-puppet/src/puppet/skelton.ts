/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
import {
  log,
}                       from '../config.js'

import type {
  PuppetOptions,
}                                 from '../schemas/puppet.js'

import {
  PuppetEventEmitter,
}                                 from '../events.js'

abstract class PuppetSkelton extends PuppetEventEmitter {

  /**
  * Login-ed User ID
  *
  * FIXME: remove the override
  * FIXME: rename the id to loggedInUserId?
  */
  id?: string

  public options: PuppetOptions

  constructor (
    ...args: any[]
  ) {
    super()
    log.verbose('PuppetSkelton', 'constructor("%s")', JSON.stringify(args))

    this.options = args[0] || {}
  }

  /**
   * Huan(202110): Issue #156 - https://github.com/wechaty/puppet/issues/156
   *
   *  All mixins should implemente both `start()` and `stop()`,
   *  and they must call `super.start()` and `super.stop()`
   *  so that all start()/stop() can be chained.
   */
  async start (): Promise<void> {}
  async stop  (): Promise<void> {}

  /**
   * Updates:
   *  - Huan(201808):
   *      reset() Should not be called directly.
   *      `protected` is for testing, not for the child class.
   *      should use `emit('reset', 'reason')` instead.
   *  - Huan(202008): Update from protected to private
   *  - Huan(202110): We decided to use `reset()` to trigger the reset action
   *      instead of `emit('reset', 'reason')`
   *
   * @protected
   */
  async reset (reason: string): Promise<void> {
    log.verbose('PuppetSkelton', 'reset(%s)', reason)

    /**
     * Huan(202003):
     *  do not care state.off()
     *  reset will cause the puppet to start (?)
     */
    // if (this.state.off()) {
    //   log.verbose('Puppet', 'reset(%s) state is off(), make the watchdog to sleep', reason)
    //   this.watchdog.sleep()
    //   return
    // }

    return Promise.resolve()
      .then(() => this.stop())
      .then(() => this.start())
      .catch(e => {
        log.warn('Puppet', 'reset() exception: %s', e)
        this.emit('error', e)
      })
      .finally(() => {
        log.verbose('Puppet', 'reset() done')
      })
  }

}

export { PuppetSkelton }
