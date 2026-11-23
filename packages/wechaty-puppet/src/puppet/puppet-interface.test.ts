/**
 * Unit tests for `puppet-interface.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Puppet } from './mod.ts'
import type { PuppetProtectedProperty } from './puppet-interface.ts'

test('ProtectedProperties', async _t => {
  type NotExistInPuppet = Exclude<PuppetProtectedProperty, keyof Puppet>
  type NotExistTest = NotExistInPuppet extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Puppet properties for every protected property')
})
