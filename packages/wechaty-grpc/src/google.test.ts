/**
 * Unit tests for `google.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  StringValue,
  Timestamp,
}                 from './google.ts'

test('Timestamp', async _t => {
  const timestamp: Timestamp = new Timestamp()
  timestamp.fromDate(new Date())
  assert.ok(timestamp, 'should create a timestamp protocol buffer')
})

test('Timestamp pre-1970 negative dates and property getters', async _t => {
  const preEpoch = new Date('1969-12-31T23:59:59.500Z')
  const ts = Timestamp.fromDate(preEpoch)
  assert.equal(ts.getSeconds(), -1)
  assert.equal(ts.getNanos(), 500000000)
  assert.equal(ts.seconds, -1n)
  assert.equal(ts.nanos, 500000000)
  assert.equal(ts.toDate().getTime(), preEpoch.getTime())
})

test('StringValue', async _t => {
  const stringVal = new StringValue('test-val')
  assert.equal(stringVal.getValue(), 'test-val')
  stringVal.setValue('new-val')
  assert.equal(stringVal.getValue(), 'new-val')
})
