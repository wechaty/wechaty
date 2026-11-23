/**
 * Unit tests for `proto.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  puppet,
}                 from './proto.ts'

test('puppet.v0.file', async _t => {
  const EXPECTED_PATH_REG = /puppet\.proto$/
  assert.ok(EXPECTED_PATH_REG.test(puppet.v0.file), 'puppet proto file should be puppet.proto')
})

test('puppet.v0.data', async _t => {
  assert.ok(puppet.v0.data.length > 0, 'should get proto data for puppet.v0.data')
})
