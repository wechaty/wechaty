/**
 * Tests that the generated `Puppet` service descriptor exposes the complete
 * set of methods required by `wechaty-puppet-service`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  Puppet,
} from '../../src/mod.ts'

test('Puppet service descriptor completeness', async _t => {
  assert.equal(Puppet.typeName, 'wechaty.Puppet', 'service type name should match wechaty.Puppet')
  assert.equal(Puppet.methods.length, 62, 'Puppet should define all 62 RPC methods')

  // Verify all streaming RPCs are correctly classified
  assert.equal(Puppet.method.event.methodKind, 'server_streaming')
  assert.equal(Puppet.method.download.methodKind, 'server_streaming')
  assert.equal(Puppet.method.upload.methodKind, 'client_streaming')
  assert.equal(Puppet.method.messageFileStream.methodKind, 'server_streaming')
  assert.equal(Puppet.method.messageImageStream.methodKind, 'server_streaming')
  assert.equal(Puppet.method.messageSendFileStream.methodKind, 'client_streaming')

  // Verify unary RPCs are correctly classified
  assert.equal(Puppet.method.start.methodKind, 'unary')
  assert.equal(Puppet.method.stop.methodKind, 'unary')
  assert.equal(Puppet.method.ding.methodKind, 'unary')
  assert.equal(Puppet.method.version.methodKind, 'unary')
  assert.equal(Puppet.method.contactPayload.methodKind, 'unary')
  assert.equal(Puppet.method.roomPayload.methodKind, 'unary')
  assert.equal(Puppet.method.messagePayload.methodKind, 'unary')
  assert.equal(Puppet.method.friendshipPayload.methodKind, 'unary')
})
