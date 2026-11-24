/**
 * Tests for the `helpers` entry point.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as helpers from '../../src/mods/helpers.ts'
import { PuppetTest } from '../fixtures/puppet-test/puppet-test.ts'

test('Re-export helper modules', async _t => {
  assert.equal(typeof helpers.resolvePuppet, 'function', 'should export resolvePuppet()')
  assert.equal(typeof helpers.typeName, 'function', 'should export typeName()')
})

test('resolvePuppet returns an explicitly supplied Puppet', async () => {
  const puppet = new PuppetTest()

  assert.equal(await helpers.resolvePuppet({ puppet }), puppet)
})
