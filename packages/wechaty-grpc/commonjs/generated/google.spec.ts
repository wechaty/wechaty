#!/usr/bin/env -S ts-node --project tsconfig.cjs.json

import { test } from 'tstest'

import google from './google.cjs'

test('CJS: HealthCheckResponse', async t => {
  t.ok(google.HealthCheckResponse, 'should exists "HealthCheckResponse"')
})

test('CJS: ServingStatus.SERVING', async t => {
  t.ok(google.HealthCheckResponse.ServingStatus.SERVING, 'should exists "ServingStatus.SERVING"')
})
