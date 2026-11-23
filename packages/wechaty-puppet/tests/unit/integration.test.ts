/**
 * Smoke test that the `PuppetTest` fixture, a minimal provider puppet, can be
 * constructed.
 */
// @ts-check

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PuppetTest } from '../fixtures/puppet-test/puppet-test.ts'

test('Integration testing', async _t => {

  const puppet = new PuppetTest()

  assert.ok(puppet, 'tbw')
})
