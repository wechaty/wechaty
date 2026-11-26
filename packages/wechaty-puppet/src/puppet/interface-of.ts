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

let _interfaceOfPuppet: ((target: unknown) => boolean) | undefined
let _looseInstanceOfPuppet: ((target: unknown) => boolean) | undefined

function interfaceOfPuppet (target: unknown): target is Puppet {
  _interfaceOfPuppet ??= interfaceOfClass(Puppet as any as Constructor<Puppet>)<Puppet>()
  return _interfaceOfPuppet(target)
}

function looseInstanceOfPuppet (target: unknown): target is Puppet {
  _looseInstanceOfPuppet ??= looseInstanceOfClass(Puppet as any as Constructor<Puppet>)
  return _looseInstanceOfPuppet(target)
}

export {
  interfaceOfPuppet,
  looseInstanceOfPuppet,
}
