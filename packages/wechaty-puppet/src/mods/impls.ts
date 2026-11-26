/**
 * Public `wechaty-puppet/impls` entry point: the puppet constructor and
 * interface types, and the abstract `Puppet` class as `PuppetAbstract`.
 */
import type {
  PuppetConstructor,
  PuppetInterface,
  PuppetProtectedProperty,
}                               from '../puppet/mod.ts'
import {
  Puppet,
  PuppetImpl as PuppetAbstract,
}                               from '../puppet/mod.ts'

export type {
  PuppetConstructor,
  PuppetInterface,
  PuppetProtectedProperty,
}
export {
  Puppet,
  PuppetAbstract,
}
