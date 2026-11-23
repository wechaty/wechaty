/**
 * The `PuppetInterface` and `PuppetConstructor` types that provider puppets
 * implement, derived from the abstract `Puppet` class.
 */
import type { Constructor } from 'clone-class'

import type { MixinProtectedProperty } from '../mixins/mod.ts'
import type { PuppetSkeletonProtectedProperty } from './puppet-skeleton.ts'
import type { Puppet } from './puppet-abstract.ts'

type PuppetProtectedProperty =
  | MixinProtectedProperty
  | PuppetSkeletonProtectedProperty

// https://stackoverflow.com/questions/44983560/how-to-exclude-a-key-from-an-interface-in-typescript
type PuppetInterface = Omit<
  Puppet,
  PuppetProtectedProperty | `_${string}`
>

type PuppetConstructor = Constructor<PuppetInterface>

export type {
  PuppetProtectedProperty,
  PuppetConstructor,
  PuppetInterface,
}
