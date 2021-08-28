import { looseInstanceOfClass } from 'clone-class'
import {
  Puppet,
  FileBox,
}             from 'wechaty-puppet'
/**
 * Huan(202011):
 *  Create a `looseInstanceOfClass` to check `FileBox` and `Puppet` instances #2090
 *    https://github.com/wechaty/wechaty/issues/2090
 */
 type FileBoxClass = FileBox & {
  new (...args: any): FileBox
}
const looseInstanceOfFileBox = looseInstanceOfClass(
  FileBox as any as FileBoxClass
)

/**
 * Huan(202011):
 *  Create a `looseInstanceOfClass` to check `FileBox` and `Puppet` instances #2090
 *    https://github.com/wechaty/wechaty/issues/2090
 */
const looseInstanceOfPuppet = looseInstanceOfClass(
  Puppet as any as Puppet & {
    new (...args: any): Puppet
    }
)

export {
  looseInstanceOfPuppet,
  looseInstanceOfFileBox,
}
