import { test } from 'node:test'
import assert from 'node:assert/strict'

test('intentional runner failure probe', () => {
  assert.fail('failure probe should produce a nonzero runner exit')
})
