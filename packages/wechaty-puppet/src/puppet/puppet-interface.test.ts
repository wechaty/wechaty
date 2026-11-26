/**
 * Unit tests for `puppet-interface.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as PUPPET from '../mods/mod.ts'
import type {
  Puppet,
  PuppetImpl,
  PuppetInterface,
  PuppetEventTarget,
  PuppetEventTargetInterface,
  PuppetEventEmitter,
  PuppetEventEmitterInterface,
} from './mod.ts'
import type { PuppetProtectedProperty } from './puppet-interface.ts'

type AssertEqual<T, Expected> =
  [T] extends [Expected]
    ? [Expected] extends [T]
      ? true
      : false
    : false

test('ProtectedProperties', async _t => {
  type NotExistInPuppetImpl = Exclude<PuppetProtectedProperty, keyof PuppetImpl>
  type NotExistTest = NotExistInPuppetImpl extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match PuppetImpl properties for every protected property')

  type LeakedInPuppet = Extract<PuppetProtectedProperty, keyof Puppet>
  type ZeroLeakTest = LeakedInPuppet extends never ? true : false

  const zeroLeak: ZeroLeakTest = true
  assert.ok(zeroLeak, 'should omit all protected properties from canonical Puppet doc-typing')
})

test('Puppet canonical type assignability and declaration merging', async _t => {
  const isPuppetSame: AssertEqual<Puppet, PuppetInterface> = true
  const isPuppetFromModSame: AssertEqual<PUPPET.Puppet, PuppetInterface> = true
  const isEventTargetSame: AssertEqual<PuppetEventTarget, PuppetEventTargetInterface> = true
  const isEventEmitterSame: AssertEqual<PuppetEventEmitter, PuppetEventEmitterInterface> = true

  assert.ok(isPuppetSame, 'Puppet and PuppetInterface must be identical types')
  assert.ok(isPuppetFromModSame, 'PUPPET.Puppet in type position must match PuppetInterface')
  assert.ok(isEventTargetSame, 'PuppetEventTarget and PuppetEventTargetInterface must be identical types')
  assert.ok(isEventEmitterSame, 'PuppetEventEmitter and PuppetEventEmitterInterface must be identical types')
})

test('Puppet value and type declaration merging', async _t => {
  // Verifies Puppet can be used in value position (class / constructor checks)
  assert.equal(typeof PUPPET.Puppet, 'function', 'PUPPET.Puppet must be a constructor function in value space')

  // Verifies Puppet can be used directly as a type annotation
  const dummy: PUPPET.Puppet = {} as unknown as PUPPET.Puppet
  assert.ok(dummy !== undefined, 'PUPPET.Puppet type annotation must be valid')
})

test('instanceof Puppet preserves pure doc-typing in narrowing', async () => {
  const puppet: unknown = {}
  if (puppet instanceof PUPPET.Puppet) {
    // @ts-expect-error __cacheMixinCleanCallbackList is protected and omitted from Puppet prototype doc-typing
    puppet.__cacheMixinCleanCallbackList
    // @ts-expect-error __memory is protected and omitted from Puppet prototype doc-typing
    puppet.__memory
  }
})

test('Puppet runtime class name is Puppet for looseInstanceOfClass', async () => {
  assert.equal(PUPPET.Puppet.name, 'Puppet', 'PUPPET.Puppet.name must be "Puppet"')
  assert.equal(PUPPET.PuppetImpl.name, 'Puppet', 'PUPPET.PuppetImpl.name must be "Puppet"')
})
