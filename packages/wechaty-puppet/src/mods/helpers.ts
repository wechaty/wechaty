/**
 * Public `wechaty-puppet/helpers` entry point (also exposed via the root
 * `helpers` namespace): `parseGErrorPayload()`, `resolvePuppet()`,
 * `timeoutPromise()`, `TimeoutPromiseGError`, `typeName()`, `WrapAsync`, and
 * `wrapAsyncError()`.
 */
/**
 * We must import `instance-of.js` first, to prevent the following error:
 *
 *  ReferenceError: Cannot access 'Puppet' before initialization
 *   at file:///home/huan/git/wechaty/puppet/src/puppet/interface-of.ts:14:48
 */
import '../puppet/interface-of.ts'

import {
  parseGErrorPayload,
  timeoutPromise,
  TimeoutPromiseGError,
  type WrapAsync,
  wrapAsyncError,
}                   from '../pure-functions/async-error.ts'
import {
  resolvePuppet,
}                   from '../puppet/puppet-resolver.ts'
import {
  typeName,
}                   from '../schemas/type-name.ts'

export {
  parseGErrorPayload,
  resolvePuppet,
  timeoutPromise,
  TimeoutPromiseGError,
  typeName,
  type WrapAsync,
  wrapAsyncError,
}
