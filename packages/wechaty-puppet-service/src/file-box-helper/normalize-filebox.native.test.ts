/**
 * Native unit test for `canPassthrough()`: only the Node.js build of
 * `file-box` can create a file box from a path. The portable cases are in
 * `normalize-filebox.test.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FileBox } from 'file-box'

import { canPassthrough } from './normalize-filebox.ts'

test('canPassthrough(): always false for local files', async _t => {
  const localFileBox = FileBox.fromFile('tests/fixtures/smoke-testing.ts')
  assert.ok(!(canPassthrough(localFileBox)), 'should not passthrough File')
})
