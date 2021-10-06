import { instanceToClass } from 'clone-class'

import type { Wechaty } from '../wechaty.js'

const throwWechatifyError = (WechatyUserClass: Function) => {
  throw new Error([
    `${WechatyUserClass.name}: Wechaty User Class (WUC) can not be instantiated directly!`,
    'See: https://github.com/wechaty/wechaty/issues/1217',
  ].join('\n'))
}

function guardWechatifyClass (
  this: { wechaty: Wechaty },
  WechatyUserClass: Function

) {
  const ThisClass = instanceToClass(this, WechatyUserClass)

  if (ThisClass === WechatyUserClass) {
    throwWechatifyError(WechatyUserClass)
  }

  if (!this.wechaty.puppet) {
    throw new Error([
      `${WechatyUserClass.name}: Wechaty User Class (WUC) can not be instantiated without a puppet!`,
    ].join('\n'))
  }
}

export {
  guardWechatifyClass,
  throwWechatifyError,
}
