/**
 * We must import `instance-of.js` first, to prevent the following error:
 *
 *  ReferenceError: Cannot access 'Puppet' before initialization
 *   at file:///home/huan/git/wechaty/puppet/src/puppet/interface-of.ts:14:48
 */
import '../puppet/interface-of.js'

import {
  resolvePuppet,
}                   from '../puppet/puppet-resolver.js'

export {
  resolvePuppet,
}
