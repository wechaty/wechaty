import {
  interfaceOfClass,
  looseInstanceOfClass,
}                           from 'clone-class'
import type { Constructor } from 'clone-class'

import { log }              from 'wechaty-puppet'

const validationMixin = <MixinBase extends Constructor> (mixinBase: MixinBase) => <T>() => {
  log.verbose('ValidationMixin', 'validationMixin(%s)', mixinBase.name)

  const instanceOfUserClass   = looseInstanceOfClass(mixinBase)
  const interfaceOfUserClass  = interfaceOfClass(mixinBase)<T>()

  const validUserClass = (o: any): o is T => {
    if (instanceOfUserClass(o)) {
      // console.info('instanceOfUserClass(o) true')
      return true
    } else if (interfaceOfUserClass(o)) {
      // console.info('interfaceOfUserClass(o): true')
      return true
    }
    return false
  }

  class ValidationUserClass extends mixinBase {

    static valid          = validUserClass
    static validInstance  = instanceOfUserClass
    static validInterface = interfaceOfUserClass

  }

  return ValidationUserClass
}

export {
  validationMixin,
}
