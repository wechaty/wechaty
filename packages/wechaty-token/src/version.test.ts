/**
 * Checks that `src/version.ts` keeps its `0.0.0` placeholder in the source;
 * only `scripts/generate-version.sh` writes the real version, before packing.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { VERSION } from './version.ts'

test('Make sure the VERSION is fresh in source code', () => {
  assert.equal(VERSION, '0.0.0', 'version should be 0.0.0 in source code, only updated before publish to NPM')
})
