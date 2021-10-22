import type { Constructor } from 'clone-class'
import type { MixinProtectedProperty } from '../mixins/mod.js'

import type { SkeltonProtectedProperty } from './puppet-skelton.js'
import type { PuppetAbstractImpl } from './mod.js'

type PuppetProtectedProperty = never
  | MixinProtectedProperty
  | SkeltonProtectedProperty

// https://stackoverflow.com/questions/44983560/how-to-exclude-a-key-from-an-interface-in-typescript
type Puppet = Omit<PuppetAbstractImpl, PuppetProtectedProperty>

type PuppetConstructor = Constructor<Puppet>

export type {
  PuppetProtectedProperty,
  PuppetConstructor,
  Puppet,
}
