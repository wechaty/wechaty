/**
 * Tests the generated gRPC health check service descriptor and schemas:
 * `Check` and `Watch` RPC schemas and `ServingStatus` enums.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  create,
  toBinary,
  fromBinary,
  toJson,
  fromJson,
} from '@bufbuild/protobuf'

import {
  google,
  HealthCheckRequestSchema,
  HealthCheckResponseSchema,
  ServingStatus,
} from '../../src/mod.ts'

test('HealthCheck protocol buffer schemas and serialization', async _t => {
  const request = create(HealthCheckRequestSchema, {
    service: 'wechaty.Puppet',
  })
  assert.equal(request.service, 'wechaty.Puppet', 'request service should match')

  const reqBytes = toBinary(HealthCheckRequestSchema, request)
  const restoredReq = fromBinary(HealthCheckRequestSchema, reqBytes)
  assert.equal(restoredReq.service, 'wechaty.Puppet', 'restored service should match')

  const response = create(HealthCheckResponseSchema, {
    status: ServingStatus.SERVING,
  })
  assert.equal(response.status, ServingStatus.SERVING, 'serving status should be SERVING')

  const resBytes = toBinary(HealthCheckResponseSchema, response)
  const restoredRes = fromBinary(HealthCheckResponseSchema, resBytes)
  assert.equal(restoredRes.status, ServingStatus.SERVING, 'restored status should match')

  const json = toJson(HealthCheckResponseSchema, response)
  const fromJsonRes = fromJson(HealthCheckResponseSchema, json)
  assert.equal(fromJsonRes.status, ServingStatus.SERVING, 'json restored status should match')
})

test('Health service descriptor exposes check and watch RPCs', async _t => {
  assert.ok(google.Health, 'Health service definition must exist')
  assert.equal(google.Health.typeName, 'grpc.health.v1.Health', 'service type name should match grpc.health.v1.Health')
  assert.ok(google.Health.method.check, 'check RPC must exist')
  assert.ok(google.Health.method.watch, 'watch RPC must exist')
  assert.equal(google.Health.method.check.methodKind, 'unary', 'check must be unary')
  assert.equal(google.Health.method.watch.methodKind, 'server_streaming', 'watch must be server_streaming')
})
