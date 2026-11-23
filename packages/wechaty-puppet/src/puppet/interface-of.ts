/**
 * Runtime interface checks for puppets (`interfaceOfPuppet`,
 * `looseInstanceOfPuppet`), which work across duplicate copies of this package.
 */
import {
  type Constructor,
  interfaceOfClass,
  looseInstanceOfClass,
}                         from 'clone-class'

import {
  Puppet,
}                     from './puppet-abstract.ts'
import type {
  PuppetInterface,
}                     from './puppet-interface.ts'

const interfaceOfPuppet     = interfaceOfClass(Puppet as any as Constructor<Puppet>)<PuppetInterface>()
const looseInstanceOfPuppet = looseInstanceOfClass(Puppet as any as Constructor<Puppet>)

export {
  interfaceOfPuppet,
  looseInstanceOfPuppet,
}
