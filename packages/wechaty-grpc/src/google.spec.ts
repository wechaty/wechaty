#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import {
  Timestamp,
}                 from './google.js'

test('Timestamp', async t => {
  const timestamp: Timestamp = new Timestamp()
  timestamp.fromDate(new Date())
  t.ok(timestamp, 'should create a timestamp protocol buffer')
})
