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
import * as uuid from 'uuid'

import {
  log,
}                       from '../config.js'
/**
 * Issue #165 - ReferenceError: Cannot access 'PuppetSkelton' before initialization
 *  @see https://github.com/wechaty/puppet/issues/165
 */
import {
  GError,
}                       from '../gerror/gerror.js'
import type {
  WrapAsync,
}                     from '../helpers/wrap-async-error.js'
import {
  wrapAsyncError,
}                     from '../helpers/wrap-async-error.js'

import type { EventErrorPayload } from '../schemas/event.js'

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

  calledSkeltonStart : boolean
  calledSkeltonStop  : boolean

  readonly options: PuppetOptions

  /**
   * Wrap promise in sync way (catch error by emitting it)
   *  1. convert a async callback function to be sync function
   *    by catcing any errors and emit them to error event
   *  2. wrap a Promise by catcing any errors and emit them to error event
   */
  wrapAsync: WrapAsync = wrapAsyncError((e: any) => this.emit('error', e))

  /**
   * Huan(202110): mixins required the constructor arguments to be `...args: any[]`
   * @param args
   */
  constructor (
    ...args: any[]
  ) {
    super()
    log.verbose('PuppetSkelton', 'constructor(%s)',
      args.length
        ? JSON.stringify(args[0])
        : '',
    )

    this.id      = uuid.v4()
    this.options = args[0] || {}

    this.calledSkeltonStart = false
    this.calledSkeltonStop  = false
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
    this.calledSkeltonStart = true
  }

  async stop (): Promise<void> {
    log.verbose('PuppetSkelton', 'stop()')
    this.calledSkeltonStop  = true
  }

  /**
   * Convert any error payload to GError ,
   *  and re-emit a `error` event with EventErrorPayload(GError)
   */
  override emit (event: any, ...args: any) {
    if (event !== 'error') {
      return super.emit(event, ...args)
    }

    const err = args[0]
    let gerr: GError

    if (err instanceof GError) {
      gerr = err
    } else {
      gerr = GError.from(err)
    }

    /**
     * Convert everything to a GError toJSON object
     *  as EventErrorPayload
     */
    const payload: EventErrorPayload = {
      data: JSON.stringify(gerr),
    }

    return super.emit('error', payload)
  }

}

type PuppetSkeltonProtectedProperty =
  | 'calledSkeltonStart'
  | 'calledSkeltonStop'

export type {
  PuppetSkeltonProtectedProperty,
}
export { PuppetSkelton }
