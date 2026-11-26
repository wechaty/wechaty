/**
 * The `PuppetInterface` and `PuppetConstructor` types that provider puppets
 * implement, derived from the abstract `Puppet` class.
 */
import type { Constructor } from 'clone-class'

import {
  Puppet,
  PuppetImpl,
  type PuppetProtectedProperty,
} from './puppet-abstract.ts'

/**
 * @deprecated Use `Puppet` instead. `PuppetInterface` is retained for backwards compatibility.
 */
type PuppetInterface = Puppet

type PuppetConstructor = Constructor<Puppet>

export type {
  PuppetProtectedProperty,
  PuppetConstructor,
  PuppetInterface,
}
export {
  Puppet,
  PuppetImpl,
}
