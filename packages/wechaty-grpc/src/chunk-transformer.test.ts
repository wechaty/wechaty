/**
 * Unit tests for `chunk-transformer.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Type-level equality check, as tstest's `AssertEqual` did. */
type AssertEqual<T, Expected> = T extends Expected ? (Expected extends T ? true : false) : false

import type {
  Chunk,
}                   from './chunk-transformer.ts'

test('Chunk type imported from generated code', async _t => {
  const typeOk: AssertEqual<
    Chunk,
    string | Uint8Array
  > = true
  assert.ok(typeOk, 'should be `string | Uint8Array`')
})
