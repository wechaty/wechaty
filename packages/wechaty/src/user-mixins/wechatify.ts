/**
 * Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 * @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Canonical bot-binding and constructor injection for Wechaty User Classes (WUC).
 *
 * Why this module exists:
 * Replaces dynamic runtime subclassing (`WechatifiedContact extends ContactImpl`)
 * with a canonical `Proxy` facade (`bindUserModule`) and synchronous constructor
 * injection (`instanceWechatyMap` `WeakMap`), preserving `instanceof` identity
 * across bots while keeping per-bot `pool` and `wechaty` contexts isolated.
 */
import { log }              from 'wechaty-puppet'
import type { Constructor } from 'clone-class'

import type { Wechaty } from '../wechaty/mod.ts'

interface WechatyMinxin {
  wechaty: Wechaty,
  new (...args: any[]): {
    get wechaty (): Wechaty
  }
}

interface WechatyStackEntry {
  target: Function
  wechaty: Wechaty
}

const wechatyStack: WechatyStackEntry[] = []
const boundModules = new WeakSet<object>()
const instanceWechatyMap = new WeakMap<object, Wechaty>()

/**
 * Push `{ target, wechaty }` onto the synchronous constructor-context stack while
 * running `fn`, then pop it in `finally`.
 *
 * Precondition: `fn` must construct the target synchronously; the context is
 * popped as soon as `fn` returns (or throws), before any async continuation runs.
 */
function withWechaty<R> (target: Function, wechaty: Wechaty, fn: () => R): R {
  wechatyStack.push({ target, wechaty })
  try {
    return fn()
  } finally {
    wechatyStack.pop()
  }
}

const throwWechatifyError = (WechatyUserClass: Function): never => {
  throw new Error([
    `${WechatyUserClass.name}: Wechaty User Class (WUC) can not be instantiated directly!`,
    'See: https://github.com/wechaty/wechaty/issues/1217',
  ].join('\n'))
}

/**
 * Bind a canonical User Class constructor to a specific {@link Wechaty} bot instance.
 *
 * Returns a `Proxy` facade with an isolated `pool` (on poolified modules), `wechaty`
 * getter, and `construct` trap so instances remain canonical
 * (`obj instanceof ContactImpl === true`) across bots without generating runtime
 * subclasses. Note that `instance.constructor` is the canonical `UserClass` (not the
 * proxy), so instance methods must use `this.wechaty.<Module>` rather than
 * `this.constructor` to access per-bot `wechaty` or `pool`.
 */
const bindUserModule = <T extends WechatyMinxin> (UserClass: T) => {
  log.verbose('WechatifyMixin', 'bindUserModule(%s)', UserClass.name)

  return (wechaty: Wechaty): T => {
    log.verbose('WechatifyMixin', 'bindUserModule(%s)(%s)', UserClass.name, wechaty)

    const pool = new Map<string, InstanceType<T>>()
    const boundFnCacheByReceiver = new WeakMap<object, WeakMap<Function, Function>>()

    const proxy = new Proxy(UserClass, {
      construct (target, args, newTarget) {
        return withWechaty(target, wechaty, () => Reflect.construct(target, args, newTarget))
      },
      get (target, prop, receiver) {
        if (prop === 'wechaty') {
          return wechaty
        }
        if (prop === 'pool' && prop in target) {
          return pool
        }
        const value = Reflect.get(target, prop, receiver)
        if (
          typeof value === 'function'
          && prop !== Symbol.hasInstance
          && !Object.hasOwn(value, 'prototype')
        ) {
          let receiverCache = boundFnCacheByReceiver.get(receiver as object)
          if (!receiverCache) {
            receiverCache = new WeakMap<Function, Function>()
            boundFnCacheByReceiver.set(receiver as object, receiverCache)
          }
          let bound = receiverCache.get(value)
          if (!bound) {
            bound = value.bind(receiver)
            receiverCache.set(value, bound!)
          }
          return bound
        }
        return value
      },
    })

    boundModules.add(proxy)
    return proxy
  }
}

/** Return true if `klass` is a bot-bound module proxy created by {@link bindUserModule}. */
const isWechatified = (klass: Function): boolean => boundModules.has(klass)

/**
 * Mixin injecting per-instance `wechaty` binding into `instanceWechatyMap` on
 * construction and rejecting direct unbound instantiation.
 */
const wechatifyMixin = <TBase extends Constructor> (Base: TBase) => {
  log.verbose('WechatifyMixin', 'wechatifyMixin(%s)', Base.name || '')

  abstract class AbstractWechatifyMixin extends Base {

    static get wechaty (): Wechaty { return throwWechatifyError(this) }

    get wechaty (): Wechaty {
      return instanceWechatyMap.get(this) ?? throwWechatifyError(this.constructor)
    }

    constructor (...args: any[]) {
      super(...args)
      const entry = wechatyStack.at(-1)
      const wechaty = entry && this instanceof entry.target
        ? entry.wechaty
        : throwWechatifyError(this.constructor)
      instanceWechatyMap.set(this, wechaty)
    }

  }

  return AbstractWechatifyMixin
}

/** Mixin base for user modules that do not extend another base class. */
const wechatifyMixinBase = () => wechatifyMixin(class EmptyBase {})

export {
  bindUserModule,
  isWechatified,
  wechatifyMixin,
  wechatifyMixinBase,
}
