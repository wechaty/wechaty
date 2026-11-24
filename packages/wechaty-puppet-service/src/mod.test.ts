/**
 * Unit test for the package entry: the default export is a class, which
 * Wechaty's puppet loader requires.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as mod from './mod.ts'

test('default export', async _t => {
  assert.equal(typeof mod.default, 'function', 'should export Puppet class as default, which is required from PuppetManager of Wechaty')
})
