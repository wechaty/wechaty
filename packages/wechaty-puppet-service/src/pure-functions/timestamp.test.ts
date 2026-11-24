/**
 * Unit tests for `timestamp.ts` pure functions.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  millisecondsFromTimestamp,
  timestampFromMilliseconds,
} from './timestamp.ts'

test('timestampFromMilliseconds and millisecondsFromTimestamp roundtrip', () => {
  const now = Date.now()
  const pbTs = timestampFromMilliseconds(now)

  assert.equal(typeof pbTs.seconds, 'bigint')
  assert.equal(typeof pbTs.nanos, 'number')
  assert.equal(millisecondsFromTimestamp(pbTs), now)
})

test('timestamp roundtrips pre-1970 negative dates correctly', () => {
  const preEpoch = -500
  const pbTs = timestampFromMilliseconds(preEpoch)

  assert.equal(pbTs.seconds, -1n)
  assert.equal(pbTs.nanos, 500_000_000)
  assert.equal(millisecondsFromTimestamp(pbTs), preEpoch)
})

test('millisecondsFromTimestamp handles undefined, null, and legacy objects', () => {
  assert.equal(millisecondsFromTimestamp(undefined), 0)
  assert.equal(millisecondsFromTimestamp(null), 0)

  const legacyObj = {
    getSeconds: () => 1700000000,
    getNanos: () => 123000000,
  }
  assert.equal(millisecondsFromTimestamp(legacyObj), 1700000000123)
})
