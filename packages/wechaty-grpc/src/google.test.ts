/**
 * Unit tests for `google.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  Timestamp,
}                 from './google.ts'

test('Timestamp', async _t => {
  const timestamp: Timestamp = new Timestamp()
  timestamp.fromDate(new Date())
  assert.ok(timestamp, 'should create a timestamp protocol buffer')
})
