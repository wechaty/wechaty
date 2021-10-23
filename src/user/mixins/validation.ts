import {
  interfaceOfClass,
  looseInstanceOfClass,
}                           from 'clone-class'
import { log }              from 'wechaty-puppet'
import type { Constructor } from 'clone-class'

const validationMixin = <T>() => <MixinBase extends Constructor> (mixinBase: MixinBase) => {
  log.verbose('user/mixins/validation', 'validationMixin(%s)', mixinBase.name)

  const instanceOfUserClass   = looseInstanceOfClass(mixinBase)
  const interfaceOfUserClass  = interfaceOfClass(mixinBase)<T>()

  const validUserClass = (o: any): o is T =>
    instanceOfUserClass(o) || interfaceOfUserClass(o)

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
