/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
 * Companion: an event listener whose removal is owned by a lifecycle scope
 * (README §15, C-COMP-01).
 *
 * Built only on the public {@link LifecycleScope}: a helper that needs nothing
 * private is a companion, not a scope member (D17). It replaces the repeated
 * `on` plus `defer(off)` pairs, so re-adding a listener on every start never
 * accumulates duplicates (wechaty/wechaty#2905 §3.5). It works with
 * EventEmitter-like objects and with Web `EventTarget`s without importing
 * `node:events`, so it runs in the browser too.
 */

import type { LifecycleScope } from '../types.ts'

/** An EventEmitter-like target: `on`, plus `off` or `removeListener`. */
interface EmitterLike {
  on (event: string, listener: (...args: any[]) => void): unknown
  off? (event: string, listener: (...args: any[]) => void): unknown
  removeListener? (event: string, listener: (...args: any[]) => void): unknown
}

/** A Web `EventTarget`-like target. */
interface EventTargetLike {
  addEventListener (type: string, listener: (event: any) => void): void
  removeEventListener (type: string, listener: (event: any) => void): void
}

/** Anything {@link listen} can attach to. */
type ListenTarget = EmitterLike | EventTargetLike

/**
 * Add `listener` to `target` for this generation only; its retirement removes
 * it (C-COMP-01).
 *
 * The removal is registered on the scope before the listener is added, so on a
 * sealed (retiring or retired) scope nothing is added and the scope's
 * retirement reason is thrown, as for any late registration (C-SCOPE-02).
 *
 * The target holds a wrapper made for this registration, not `listener`
 * itself, and only this registration's removal detaches it. So a stale
 * registration never removes the same handler a newer generation added, and
 * `target.off(event, listener)` does not remove it either. The wrapper keeps
 * the target's `this` and every argument.
 *
 * @throws TypeError when an EventEmitter-like target has neither `off` nor
 *         `removeListener`, because its listener could never be removed.
 */
function listen (
  scope: LifecycleScope,
  target: ListenTarget,
  event: string,
  listener: (...args: any[]) => void,
): void {
  const forward = function (this: unknown, ...args: unknown[]): unknown {
    return listener.apply(this, args)
  }
  if ('addEventListener' in target) {
    scope.defer(() => target.removeEventListener(event, forward))
    target.addEventListener(event, forward)
    return
  }
  const remove = target.off ?? target.removeListener
  if (typeof remove !== 'function') {
    throw new TypeError('listen() needs a target with off() or removeListener()')
  }
  scope.defer(() => { remove.call(target, event, forward) })
  target.on(event, forward)
}

export type {
  EmitterLike,
  EventTargetLike,
  ListenTarget,
}
export {
  listen,
}
