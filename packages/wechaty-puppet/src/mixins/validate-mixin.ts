import type {
  Puppet,
  PuppetInterface,
}                         from '../puppet/mod.js'

import type { PuppetSkelton }   from '../puppet/skelton.js'
import {
  interfaceOfPuppet,
  looseInstanceOfPuppet,
}                           from '../puppet/interface-of.js'

const validateMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  abstract class ValidateMixin extends mixinBase {

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

  return ValidateMixin
}

type ValidateMixin = ReturnType<typeof validateMixin>

/**
 * Huan(202110): it seems that that static properties should not be mixed in
 */
type ProtectedPropertyValidateMixin = never
// | 'validInterface'
// | 'validInstance'

export type {
  ProtectedPropertyValidateMixin,
  ValidateMixin,
}
export { validateMixin }
