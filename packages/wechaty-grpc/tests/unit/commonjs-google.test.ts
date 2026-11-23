/**
 * Tests `commonjs/generated/google.cjs`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import google from '../../commonjs/generated/google.cjs'

test('CJS: HealthCheckResponse', async _t => {
  assert.ok(google.HealthCheckResponse, 'should exists "HealthCheckResponse"')
})

test('CJS: ServingStatus.SERVING', async _t => {
  assert.ok(google.HealthCheckResponse.ServingStatus.SERVING, 'should exists "ServingStatus.SERVING"')
})
