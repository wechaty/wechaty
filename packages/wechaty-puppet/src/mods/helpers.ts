/**
 * Public `wechaty-puppet/helpers` entry point: `resolvePuppet()` and
 * `typeName()`.
 */
/**
 * We must import `instance-of.js` first, to prevent the following error:
 *
 *  ReferenceError: Cannot access 'Puppet' before initialization
 *   at file:///home/huan/git/wechaty/puppet/src/puppet/interface-of.ts:14:48
 */
import '../puppet/interface-of.ts'

import {
  resolvePuppet,
}                   from '../puppet/puppet-resolver.ts'
import {
  typeName,
}                   from '../schemas/type-name.ts'

export {
  resolvePuppet,
  typeName,
}
