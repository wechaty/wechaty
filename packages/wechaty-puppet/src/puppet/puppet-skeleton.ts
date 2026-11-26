/**
 * `PuppetSkeleton`: the base every mixin extends. It owns the puppet `id`,
 * `options`, the typed event emitter and `wrapAsync()`.
 */
/**
 *   Wechaty - https://github.com/wechaty/wechaty
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
import {
  log,
}                       from '../config.ts'
/**
 * Issue #165 - ReferenceError: Cannot access 'PuppetSkeleton' before initialization
 *  @see https://github.com/wechaty/puppet/issues/165
 */

import {
  GError,
  wrapAsyncError,
}                     from 'gerror'
import type {
  WrapAsync,
}                     from 'gerror'

import type { EventErrorPayload } from '../schemas/event.ts'

import type {
  PuppetOptions,
}                                 from '../schemas/puppet.ts'

import {
  PuppetEventEmitter,
  WechatyEvent,
}                                 from './events.ts'

/**
 * Normalizes an arbitrary error value or error payload into an `EventErrorPayload`
 * containing a stringified GError JSON object.
 *
 * @param error - Error instance, existing EventErrorPayload, or arbitrary error value.
 * @returns Canonical EventErrorPayload containing serialized GError.
 */
function normalizeErrorPayload (error: unknown): EventErrorPayload {
  let gerr: GError

  if (error instanceof GError) {
    gerr = error
  } else if (error && typeof error === 'object' && 'gerror' in error) {
    gerr = GError.from((error as any).gerror)
  } else {
    gerr = GError.from(error)
  }

  return {
    gerror: JSON.stringify(gerr),
  }
}

abstract class PuppetSkeleton extends PuppetEventEmitter {

  /**
   * Puppet ID (UUID)
   *
   * Issue #160 - puppet.id will change to puppet.loggedInUserId #160
   *  - `id` is NOT logged in user ID
   *  - `currentUserId` is the logged in user ID
   *  @see https://github.com/wechaty/puppet/issues/160
   */
  readonly id: string

  readonly options: PuppetOptions

  /**
   * Wrap promise in sync way (catch error by emitting it)
   *  1. convert a async callback function to be sync function
   *    by catcing any errors and emit them to error event
   *  2. wrap a Promise by catcing any errors and emit them to error event
   */
  wrapAsync: WrapAsync = wrapAsyncError((e: any) => this.dispatchEvent(new WechatyEvent('error', { detail: e })))

  /**
   * Huan(202110): keep constructor with `args: any[]` parameters
   *  because mixins required it
   *
   * We will save args[0] to `this.options` so that all mixins can access it
   * @param args
   */
  constructor (
    ...args: any[]
  ) {
    super()
    log.verbose('PuppetSkeleton', 'constructor(%s)',
      args.length
        ? JSON.stringify(args[0])
        : '',
    )

    this.id       = crypto.randomUUID()
    this.options  = args[0] || {}

    /**
     * We will use RxJS & Redux to handle the state of the puppet
     *  which means there will be lots of listeners will be registered later.
     */
    this.setMaxListeners(1024)
  }

  /**
   * Huan(202110): Issue #156 - https://github.com/wechaty/puppet/issues/156
   *
   *  All mixins should implemente both `start()` and `stop()`,
   *  and they must call `super.start()` and `super.stop()`
   *  so that all start()/stop() calls can be chained through all mixins.
   */
  async start (): Promise<void> {
    log.verbose('PuppetSkeleton', 'start()')
  }

  async stop (): Promise<void> {
    log.verbose('PuppetSkeleton', 'stop()')
  }

  /**
   * Dispatches an event, normalizing any error payloads to standard GError JSON structure
   * while preserving event cancellation flags and propagating cancellation state.
   */
  override dispatchEvent (event: Event): boolean {
    if (event.type === 'error' && event instanceof CustomEvent) {
      const payload = normalizeErrorPayload(event.detail)

      const normalizedEvent = new WechatyEvent('error', {
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        composed: event.composed,
        detail: payload,
        id: (event as any).id,
        source: (event as any).source,
        traceId: (event as any).traceId,
      })

      const notCancelled = super.dispatchEvent(normalizedEvent)
      if (normalizedEvent.defaultPrevented && !event.defaultPrevented && event.cancelable) {
        event.preventDefault()
      }
      return notCancelled
    }

    return super.dispatchEvent(event)
  }

  /**
   * Convert any error payload to GError,
   * and emit an `error` event with EventErrorPayload(GError) via legacy EventEmitter adapter,
   * preserving unhandled error throw semantics when no error listener is attached.
   */
  override emit (event: any, ...args: any): boolean {
    if (event !== 'error') {
      return super.emit(event, ...args)
    }

    const payload = normalizeErrorPayload(args[0])
    return super.emit('error', payload)
  }

}

type PuppetSkeletonProtectedProperty = never

export type {
  PuppetSkeletonProtectedProperty,
}
export { PuppetSkeleton }
