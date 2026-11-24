/**
 * Verifies the public schema exports and the behavior of native helpers when
 * the entry loads in a browser.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  chunkDecoder,
  chunkEncoder,
  codeRoot,
  getProtoPath,
  proto,
  Puppet,
  puppet,
  google,
  StringValue,
  Timestamp,
  UploadRequestSchema,
  VERSION,
}                   from './mod.ts'

test('`Puppet` GenService is exported', async _t => {
  assert.ok(Puppet, 'should export Puppet GenService')
  assert.equal(Puppet.typeName, 'wechaty.Puppet', 'Puppet service type name should match')
  assert.ok(puppet.PuppetService, 'should export PuppetService alias')
})

test('`EventRequestSchema` and `EventResponseSchema` are exported', async _t => {
  assert.ok(puppet.EventRequestSchema, 'should export EventRequestSchema')
  assert.ok(puppet.EventResponseSchema, 'should export EventResponseSchema')
  assert.ok(typeof puppet.EventType.MESSAGE === 'number', 'should export EventType numbers')
})

test('`Health` service and schemas are exported', async _t => {
  assert.ok(google.Health, 'should export Health service')
  assert.ok(google.HealthCheckRequestSchema, 'should export HealthCheckRequestSchema')
  assert.ok(google.HealthCheckResponseSchema, 'should export HealthCheckResponseSchema')
  assert.equal(google.ServingStatus.SERVING, 1, 'ServingStatus.SERVING should equal 1')
})

test('`StringValue` and `Timestamp` are exported', async _t => {
  assert.ok(StringValue, 'should export StringValue')
  assert.ok(Timestamp, 'should export Timestamp')
  assert.ok(VERSION, 'should export VERSION')
})

test('browser rejects access to native file and stream helpers', {
  skip: typeof document === 'undefined',
}, () => {
  assert.equal(codeRoot, '')

  const filesystemError = /Raw protobuf files require a native filesystem/
  assert.throws(() => getProtoPath('wechaty', 'puppet.proto'), filesystemError)
  assert.throws(() => proto.puppet.v0.file, filesystemError)
  assert.throws(() => proto.puppet.v0.data, filesystemError)

  const streamsError = /gRPC chunk transformers require native Node streams/
  assert.throws(() => chunkEncoder(UploadRequestSchema), streamsError)
  assert.throws(() => chunkDecoder(), streamsError)
})
