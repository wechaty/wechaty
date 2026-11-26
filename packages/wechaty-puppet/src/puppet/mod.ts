/**
 * Barrel for the puppet classes: `Puppet`, `PuppetSkeleton`, their types, and
 * `resolvePuppet()`.
 */
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
import './interface-of.ts'

import { PuppetSkeleton } from './puppet-skeleton.ts'
import {
  Puppet,
  PuppetImpl,
}                         from './puppet-abstract.ts'
import type {
  PuppetConstructor,
  PuppetInterface,
  PuppetProtectedProperty,
}                         from './puppet-interface.ts'
import type {
  PuppetCustomEvent,
  PuppetEventDetail,
  PuppetEventDetailMap,
  PuppetEventName,
  PuppetEventTargetListener,
  PuppetEventTarget,
  PuppetEventTargetInterface,
  PuppetEventEmitterInterface,
}                         from './events.ts'
import {
  PuppetEventEmitter,
}                         from './events.ts'
import {
  resolvePuppet,
}                         from './puppet-resolver.ts'

export type {
  PuppetConstructor,
  PuppetInterface,
  PuppetProtectedProperty,
  PuppetCustomEvent,
  PuppetEventDetail,
  PuppetEventDetailMap,
  PuppetEventName,
  PuppetEventTargetListener,
  PuppetEventTarget,
  PuppetEventTargetInterface,
  PuppetEventEmitterInterface,
}
export {
  Puppet,
  PuppetImpl,
  PuppetSkeleton,
  PuppetEventEmitter,
  resolvePuppet,
}
