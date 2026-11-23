/**
 * Unit tests for `mod.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  grpc,
  puppet,
  google,
}                   from './mod.ts'

test('`grpc` is exported', async _t => {
  assert.ok(grpc, 'should imported grpc')
})

test('`IPuppetServer` is exported', async _t => {
  const i: puppet.IPuppetServer = {} as any
  assert.ok(i, 'should has typing IPuppetServer')
})

test('`PuppetService` is exported', async _t => {
  assert.ok(puppet.PuppetService, 'should export PuppetSevice')
})

test('CJS: HealthCheckResponse', async _t => {
  assert.ok(google.HealthCheckResponse, 'should exists "HealthCheckResponse"')
})

test('CJS: ServingStatus.SERVING', async _t => {
  assert.ok(google.HealthCheckResponse.ServingStatus.SERVING, 'should exists "ServingStatus.SERVING"')
})
