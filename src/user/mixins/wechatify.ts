import { log }              from 'wechaty-puppet'
import type { Constructor } from 'clone-class'

import type { WechatyInterface } from '../../interface/wechaty-interface.js'

const WECHATIFIED_PREFIX = 'Wechatified'

interface WechatyMinxin {
  wechaty: WechatyInterface,
  new (...args: any[]): {
    get wechaty (): WechatyInterface
  }
}

const wechatifyUserClass = <T extends WechatyMinxin> (UserClass: T) => {
  log.verbose('user/mixins/wechatify', 'wechatifyUserClass(%s)', UserClass.name)

  return (wechaty: WechatyInterface): T => {
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

const wechatifyMixin = <TBase extends Constructor> (Base: TBase) => {
  log.verbose('user/mixins/wechatify', 'wechatifyMixin(%s)', Base.name || '')

  abstract class AbstractWechatifyMixin extends Base {

    static get wechaty  (): WechatyInterface { return throwWechatifyError(this) }
    get wechaty         (): WechatyInterface { return throwWechatifyError(this.constructor) }

    constructor (...args: any[]) {
      super(...args)
      if (!isWechatified(this.constructor)) {
        throwWechatifyError(this.constructor)
      }
    }

  }

  return AbstractWechatifyMixin
}

class EmptyBase {}

export {
  EmptyBase,
  isWechatified,
  wechatifyMixin,
  wechatifyUserClass,
}
