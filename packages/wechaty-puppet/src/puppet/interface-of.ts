import { FileBox }  from 'file-box'
import {
  Constructor,
  interfaceOfClass,
  looseInstanceOfClass,
}                         from 'clone-class'

import {
  PuppetAbstractImpl,
  Puppet,
}                     from './mod.js'
import { log }        from '../config.js'

/**
 * Huan(202011):
 *  Create a `looseInstanceOfClass` to check `FileBox` and `Puppet` instances #2090
 *    https://github.com/wechaty/wechaty/issues/2090
 *
 * @deprecated will be remove after Dec 31, 2022
 */
const looseInstanceOfFileBox = (target: any) => {
  log.warn('looseInstanceOfFileBox', '@deprecated: use FileBox.validInstance(target) instead\n%s', new Error().stack)
  return FileBox.validInstance(target)
}

/**
 * @deprecated will be remove after Dec 31, 2022
 */
const looseInstanceOfPuppetDeprecated  = (target: any) => {
  log.warn('looseInstanceOfPuppet', '@deprecated: use Puppet.validInstance(target) instead\n%s', new Error().stack)
  return looseInstanceOfPuppet(target)
}

const interfaceOfPuppet     = interfaceOfClass(PuppetAbstractImpl as any as Constructor<PuppetAbstractImpl>)<Puppet>()
const looseInstanceOfPuppet = looseInstanceOfClass(PuppetAbstractImpl as any as Constructor<PuppetAbstractImpl>)

export {
  interfaceOfPuppet,
  looseInstanceOfPuppet,
  looseInstanceOfFileBox,
  looseInstanceOfPuppetDeprecated,
}
