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
import uuid from 'uuid'

import {
  log,
}                       from '../config.js'

import type {
  PuppetOptions,
}                                 from '../schemas/puppet.js'

import {
  PuppetEventEmitter,
}                                 from './events.js'

abstract class PuppetSkelton extends PuppetEventEmitter {

  /**
   * Puppet ID (UUID)
   *
   * Issue #160 - puppet.id will change to puppet.loggedInUserId #160
   *  - `id` is NOT logged in user ID
   *  - `currentUserId` is the logged in user ID
   *  @see https://github.com/wechaty/puppet/issues/160
   */
  readonly id: string

  options: PuppetOptions

  /**
   * Huan(202110): mixins required the constructor arguments to be `...args: any[]`
   * @param args
   */
  constructor (
    ...args: any[]
  ) {
    super()
    log.verbose('PuppetSkelton', 'constructor("%s")', JSON.stringify(args))

    this.id      = uuid.v4()
    this.options = args[0] || {}
  }

  /**
   * Huan(202110): Issue #156 - https://github.com/wechaty/puppet/issues/156
   *
   *  All mixins should implemente both `start()` and `stop()`,
   *  and they must call `super.start()` and `super.stop()`
   *  so that all start()/stop() calls can be chained through all mixins.
   */
  async start (): Promise<void> {
    log.verbose('PuppetSkelton', 'start()')
  }

  async stop  (): Promise<void> {
    log.verbose('PuppetSkelton', 'stop()')
  }

}

export { PuppetSkelton }
