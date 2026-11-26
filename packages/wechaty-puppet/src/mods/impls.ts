/**
 * @fileoverview Legacy Hungarian export facade (`PuppetAbstract`, `PuppetInterface`, `PuppetConstructor`).
 *
 * @deprecated The Hungarian notation export facade (`wechaty-puppet/impls`) is retained
 * for backwards compatibility with Wechaty 1.x and will be retired in Wechaty 3.0.
 *
 * Please import the canonical `Puppet` declaration from `wechaty-puppet`:
 * - `import { Puppet } from 'wechaty-puppet'`
 *
 * With TypeScript Declaration Merging, `Puppet` represents both the instance type
 * and the abstract constructor class.
 */
import type {
  PuppetConstructor,
  PuppetInterface,
  PuppetProtectedProperty,
  PuppetState,
}                               from '../puppet/mod.ts'
import {
  Puppet,
  PuppetImpl as PuppetAbstract,
}                               from '../puppet/mod.ts'

export type {
  PuppetConstructor,
  PuppetInterface,
  PuppetProtectedProperty,
  PuppetState,
}
export {
  Puppet,
  PuppetAbstract,
}
