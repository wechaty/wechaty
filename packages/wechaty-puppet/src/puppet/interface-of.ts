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

const interfaceOfPuppet     = interfaceOfClass(Puppet as any as Constructor<Puppet>)<Puppet>()
const looseInstanceOfPuppet = looseInstanceOfClass(Puppet as any as Constructor<Puppet>)

export {
  interfaceOfPuppet,
  looseInstanceOfPuppet,
}
