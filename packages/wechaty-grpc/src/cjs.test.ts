/**
 * Unit tests for `cjs.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  codeRoot,
  puppet,
  google,
}                 from './cjs.ts'

test('ESM: codeRoot', async _t => {
  assert.ok(codeRoot, 'should exists "codeRoot"')
})

test('ESM: puppet', async _t => {
  assert.ok(puppet, 'should exists "puppet"')
  assert.ok(puppet.EventRequest, 'should exists "EventRequest"')
})

test('ESM: puppet.EventTypeMap', async _t => {
  const map: puppet.EventTypeMap = {} as any
  map.EVENT_TYPE_DIRTY = puppet.EventType.EVENT_TYPE_DIRTY
  assert.equal(Object.keys(map).length, 1, 'should export type "EventTypeMap"')
})

test('ESM: puppet.DingRequest', async _t => {
  assert.equal(typeof puppet.DingRequest, 'function', 'should exists "DingRequest"')
})

test('ESM: google.HealthCheckResponse', async _t => {
  assert.ok(google.HealthCheckResponse, 'should exists "HealthCheckResponse"')
})

test('ESM: google.ServingStatus.SERVING', async _t => {
  assert.ok(google.HealthCheckResponse.ServingStatus.SERVING, 'should exists "ServingStatus.SERVING"')
})
