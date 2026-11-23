/**
 * Tests for the `helpers` entry point.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as helpers from '../../src/mods/helpers.ts'

test('Re-export helper modules', async _t => {
  assert.equal(typeof helpers.resolvePuppet, 'function', 'should export resolvePuppet()')
  assert.equal(typeof helpers.typeName, 'function', 'should export typeName()')
})
