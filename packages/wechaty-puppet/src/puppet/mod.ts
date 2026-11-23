/**
 * Huan(202110): Issue #168 - ReferenceError: Cannot access 'Puppet' before initialization
 *  @see https://github.com/wechaty/puppet/issues/168
 *
 * We need to import `interface-of.js` before import `puppet-abstract.js`
 *  or we will get the following error message:
 *
 * ReferenceError: Cannot access 'Puppet' before initialization
    at file:///home/huan/git/wechaty/puppet/src/puppet/interface-of.ts:23:48
    at ModuleJob.run (node:internal/modules/esm/module_job:175:25)
    at async Loader.import (node:internal/modules/esm/loader:178:24)
    at async Object.loadESM (node:internal/process/esm_loader:68:5)

 * This is due to the circler dependence, the deeper reason is still not clear.
 */
import './interface-of.js'

import { PuppetSkeleton } from './puppet-skeleton.js'
import {
  Puppet,
}                         from './puppet-abstract.js'
import type {
  PuppetConstructor,
  PuppetInterface,
}                         from './puppet-interface.js'
import {
  resolvePuppet,
}                         from './puppet-resolver.js'

export type {
  PuppetConstructor,
  PuppetInterface,
}
export {
  Puppet,
  PuppetSkeleton,
  resolvePuppet,
}
