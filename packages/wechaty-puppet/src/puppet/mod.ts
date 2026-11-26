/**
 * Barrel for the puppet classes: `Puppet`, `PuppetSkeleton`, their types, and
 * `resolvePuppet()`.
 */
import { PuppetSkeleton } from './puppet-skeleton.ts'
import {
  Puppet,
  PuppetImpl,
}                         from './puppet-abstract.ts'
import type {
  PuppetConstructor,
  PuppetInterface,
  PuppetProtectedProperty,
  PuppetState,
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
  PuppetState,
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
