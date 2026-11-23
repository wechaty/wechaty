/**
 * Unit tests for `package-json.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { packageJson } from './package-json.ts'

test('Make sure the packageJson is fresh in source code', async _t => {
  const keyNum = Object.keys(packageJson).length
  assert.equal(keyNum, 0, 'packageJson should be empty in source code, only updated before publish to NPM')
})
