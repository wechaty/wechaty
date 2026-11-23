/**
 * Tests `commonjs/code-root.cjs`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { codeRoot } from '../../commonjs/code-root.cjs'

test('CJS: codeRoot()', async _t => {
  assert.ok(codeRoot, 'should exist codeRoot')
})
