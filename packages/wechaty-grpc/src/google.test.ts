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

  stringVal.value = 'property-val'
  assert.equal(stringVal.value, 'property-val')

  const bytes = stringVal.serializeBinary()
  assert.ok(bytes instanceof Uint8Array)
  const deserialized = StringValue.deserializeBinary(bytes)
  assert.equal(deserialized.getValue(), 'property-val')
})

test('Timestamp serializeBinary and deserializeBinary', async _t => {
  const date = new Date('2026-11-24T12:00:00.123Z')
  const ts = Timestamp.fromDate(date)

  ts.setSeconds(12345)
  ts.setNanos(67890)
  assert.equal(ts.getSeconds(), 12345)
  assert.equal(ts.getNanos(), 67890)

  ts.seconds = 54321n
  ts.nanos = 98765
  assert.equal(ts.seconds, 54321n)
  assert.equal(ts.nanos, 98765)

  const bytes = ts.serializeBinary()
  assert.ok(bytes instanceof Uint8Array)

  const deserialized = Timestamp.deserializeBinary(bytes)
  assert.equal(deserialized.getSeconds(), ts.getSeconds())
  assert.equal(deserialized.getNanos(), ts.getNanos())
})
