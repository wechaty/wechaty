import {
  looseInstanceOfClass,
}                         from 'clone-class'

import { FileBox }  from 'file-box'
import { Puppet }   from './puppet'

/**
 * Huan(202011):
 *  Create a `looseInstanceOfClass` to check `FileBox` and `Puppet` instances #2090
 *    https://github.com/wechaty/wechaty/issues/2090
 */
const looseInstanceOfFileBox = looseInstanceOfClass(FileBox)
const looseInstanceOfPuppet  = looseInstanceOfClass(Puppet)

export {
  looseInstanceOfFileBox,
  looseInstanceOfPuppet,
}
