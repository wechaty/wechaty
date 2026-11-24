/**
 * Tests that `StringValue` and optional protobuf fields let a request carry
 * absent values distinct from empty strings.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  create,
  toBinary,
  fromBinary,
} from '@bufbuild/protobuf'

import {
  StringValue,
  ContactAliasRequestSchema,
} from '../../src/mod.ts'

test('StringValue supports nullable values', async _t => {
  const unset = new StringValue()
  assert.equal(unset.value, undefined, 'initial value should be undefined')
  assert.equal(unset.getValue(), '', 'getValue() on unset should return empty string')

  const set = new StringValue('test-alias')
  assert.equal(set.value, 'test-alias', 'value should match')
  assert.equal(set.getValue(), 'test-alias', 'getValue() should return test-alias')

  set.setValue('updated-alias')
  assert.equal(set.getValue(), 'updated-alias', 'updated value should match')
})

test('Optional protobuf fields preserve absent vs present values across binary wire format', async _t => {
  // Case 1: alias is present
  const reqWithAlias = create(ContactAliasRequestSchema, {
    id: 'test-id',
    alias: 'my-alias',
  })
  const bytesWith = toBinary(ContactAliasRequestSchema, reqWithAlias)
  const restoredWith = fromBinary(ContactAliasRequestSchema, bytesWith)
  assert.equal(restoredWith.id, 'test-id')
  assert.equal(restoredWith.alias, 'my-alias')

  // Case 2: alias is omitted / absent
  const reqWithoutAlias = create(ContactAliasRequestSchema, {
    id: 'test-id',
  })
  const bytesWithout = toBinary(ContactAliasRequestSchema, reqWithoutAlias)
  const restoredWithout = fromBinary(ContactAliasRequestSchema, bytesWithout)
  assert.equal(restoredWithout.id, 'test-id')
  assert.equal(restoredWithout.alias, undefined)
})
