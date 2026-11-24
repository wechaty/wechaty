/**
 * Smoke test for `GrpcManager`: the constructor requires an SNI prefix in
 * the token (`<sni>_<token>`).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { GrpcManager } from './grpc-manager.ts'

/**
 * Huan(202108):
 *  the Server Name Identifier (SNI) in the token
 *    is required by the gRPC client.
 */
test('GrpcManager smoke testing', async _t => {
  assert.throws(() => new GrpcManager({
    token: 'UUIDv4',
  }), 'should throw if there is no SNI prefix in token')

  assert.doesNotThrow(() => new GrpcManager({
    token: 'SNI_UUIDv4',
  }), 'should not throw if there is SNI prefix in token')
})
