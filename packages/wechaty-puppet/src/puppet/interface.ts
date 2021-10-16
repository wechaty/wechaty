import type { Constructor } from 'clone-class'
import type { PuppetProtectedProperty } from '../mixins/mod.js'

import type { Puppet } from './mod.js'

// https://stackoverflow.com/questions/44983560/how-to-exclude-a-key-from-an-interface-in-typescript
type PuppetInterface = Omit<Puppet, PuppetProtectedProperty>

type PuppetImplementation = Constructor<PuppetInterface>

export type {
  PuppetProtectedProperty,
  PuppetImplementation,
  PuppetInterface,
}
