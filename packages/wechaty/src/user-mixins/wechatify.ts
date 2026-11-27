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
 * injection (`#wechaty`), preserving `instanceof` identity across bots while keeping
 * per-bot `pool` and `wechaty` contexts isolated.
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

const wechatyStack: Wechaty[] = []
const boundModules = new WeakSet<object>()
const instanceWechatyMap = new WeakMap<object, Wechaty>()

function withWechaty<R> (wechaty: Wechaty, fn: () => R): R {
  wechatyStack.push(wechaty)
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
 * Returns a `Proxy` facade with an isolated `pool`, `wechaty` getter, and `construct`
 * trap so instances remain canonical (`obj instanceof ContactImpl === true`) across bots
 * without generating runtime subclasses.
 */
const bindUserModule = <T extends WechatyMinxin> (UserClass: T) => {
  log.verbose('WechatifyMixin', 'bindUserModule(%s)', UserClass.name)

  return (wechaty: Wechaty): T => {
    log.verbose('WechatifyMixin', 'bindUserModule(%s)(%s)', UserClass.name, wechaty)

    const pool = new Map<string, InstanceType<T>>()
    const boundFnCache = new WeakMap<Function, Function>()

    const proxy = new Proxy(UserClass, {
      construct (target, args) {
        return withWechaty(wechaty, () => Reflect.construct(target, args, target))
      },
      get (target, prop, receiver) {
        if (prop === 'wechaty') {
          return wechaty
        }
        if (prop === 'pool') {
          return pool
        }
        const value = Reflect.get(target, prop, target)
        if (typeof value === 'function') {
          let bound = boundFnCache.get(value)
          if (!bound) {
            bound = (...args: unknown[]) => value.apply(receiver, args)
            boundFnCache.set(value, bound)
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

/** Mixin injecting `#wechaty` on construction and rejecting direct unbound instantiation. */
const wechatifyMixin = <TBase extends Constructor> (Base: TBase) => {
  log.verbose('WechatifyMixin', 'wechatifyMixin(%s)', Base.name || '')

  abstract class AbstractWechatifyMixin extends Base {

    static get wechaty (): Wechaty { return throwWechatifyError(this) }

    get wechaty (): Wechaty {
      return instanceWechatyMap.get(this) ?? throwWechatifyError(this.constructor)
    }

    constructor (...args: any[]) {
      super(...args)
      const wechaty = wechatyStack.at(-1)
      instanceWechatyMap.set(this, wechaty ?? throwWechatifyError(this.constructor))
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
