import {
  Constructor,
  interfaceOfClass,
  looseInstanceOfClass,
}                         from 'clone-class'

import {
  Puppet,
}                     from './puppet-abstract.js'
import type {
  PuppetInterface,
}                     from './puppet-interface.js'

const interfaceOfPuppet     = interfaceOfClass(Puppet as any as Constructor<Puppet>)<PuppetInterface>()
const looseInstanceOfPuppet = looseInstanceOfClass(Puppet as any as Constructor<Puppet>)

export {
  interfaceOfPuppet,
  looseInstanceOfPuppet,
}
