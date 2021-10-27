import {
  Constructor,
  interfaceOfClass,
  looseInstanceOfClass,
}                         from 'clone-class'

import { log }        from '../config.js'
import {
  Puppet,
}                     from './puppet-abstract.js'
import type {
  PuppetInterface,
}                     from './interface.js'

/**
 * @deprecated will be remove after Dec 31, 2022
 */
const looseInstanceOfPuppetDeprecated  = (target: any) => {
  log.warn('looseInstanceOfPuppet', '@deprecated: use Puppet.validInstance(target) instead\n%s', new Error().stack)
  return looseInstanceOfPuppet(target)
}

const interfaceOfPuppet     = interfaceOfClass(Puppet as any as Constructor<Puppet>)<PuppetInterface>()
const looseInstanceOfPuppet = looseInstanceOfClass(Puppet as any as Constructor<Puppet>)

export {
  interfaceOfPuppet,
  looseInstanceOfPuppet,
  looseInstanceOfPuppetDeprecated,
}
