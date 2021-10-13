import { log }              from 'wechaty-puppet'
import type { Constructor } from 'clone-class'

import type { Wechaty } from '../../wechaty.js'

const WECHATIFIED_PREFIX = 'Wechatified'

interface WechatyMinxin {
  wechaty: Wechaty,
  new (...args: any[]): {
    get wechaty (): Wechaty
  }
}

const wechatifyUserClass = <T extends WechatyMinxin> (UserClass: T) => {
  log.verbose('user/mixins/wechatify', 'wechatifyUserClass(%s)', UserClass.name)

  return (wechaty: Wechaty): T => {
    log.verbose('user/mixins/wechatify', 'wechatifyUserClass(%s)(%s)', UserClass.name, wechaty)

    class WechatifiedUserClass extends UserClass {

      static override get wechaty () { return wechaty }
      override get wechaty        () { return wechaty }

    }

    Reflect.defineProperty(WechatifiedUserClass, 'name', {
      value: WECHATIFIED_PREFIX + UserClass.name,
    })

    return WechatifiedUserClass
  }
}

const throwWechatifyError = (WechatyUserClass: Function) => {
  throw new Error([
    `${WechatyUserClass.name}: Wechaty User Class (WUC) can not be instantiated directly!`,
    'See: https://github.com/wechaty/wechaty/issues/1217',
  ].join('\n'))
}

const isWechatified = (klass: Function) => klass.name.startsWith(WECHATIFIED_PREFIX)

const wechatifyMixin = <TBase extends Constructor<{}>> (base: TBase) => {
  log.verbose('user/mixins/wechatify', 'wechatifyMixin(%s)', base.name)

  abstract class AbstractWechatifyMixin extends base {

    static get wechaty  (): Wechaty { return throwWechatifyError(this) }
    get wechaty         (): Wechaty { return throwWechatifyError(this.constructor) }

    constructor (...args: any[]) {
      super(...args)
      if (!isWechatified(this.constructor)) {
        throwWechatifyError(this.constructor)
      }
    }

  }

  return AbstractWechatifyMixin
}

export {
  isWechatified,
  wechatifyUserClass,
  wechatifyMixin,
}
