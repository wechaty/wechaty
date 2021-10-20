import {
  Constructor,
  looseInstanceOfClass,
  interfaceOfClass,
}                         from 'clone-class'

import {
  Puppet,
}                         from '../puppet/mod.js'
import type {
  PuppetInterface,
}                         from '../puppet/mod.js'

import type { PuppetSkelton }   from '../puppet/skelton.js'

const interfaceOfPuppet     = interfaceOfClass(Puppet as any as Constructor<Puppet>)<PuppetInterface>()
const looseInstanceOfPuppet = looseInstanceOfClass(Puppet as any as Constructor<Puppet>)

const validationMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  abstract class ValidationMixin extends mixinBase {

    /**
     * Check if obj satisfy Puppet interface
     */
    static validInterface (target: any): target is PuppetInterface {
      return interfaceOfPuppet(target)
    }

    /**
     * loose check instance of Puppet
     */
    static validInstance (target: any): target is Puppet {
      return looseInstanceOfPuppet(target)
    }

  }

  return ValidationMixin
}

type ProtectedPropertyValidationMixin = never
  | 'validInterface'
  | 'validInstance'

export type {
  ProtectedPropertyValidationMixin,
}
export { validationMixin }
