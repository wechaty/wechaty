import { test } from 'node:test'
import assert from 'node:assert/strict'

import { coverageProbe } from './coverage-probe.ts'

test('coverage probe leaves a TypeScript line and branch uncovered', () => {
  assert.equal(coverageProbe(true), 'covered')
})
