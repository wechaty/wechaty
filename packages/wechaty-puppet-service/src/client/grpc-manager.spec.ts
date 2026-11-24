#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { GrpcManager } from './grpc-manager.js'

/**
 * Huan(202108):
 *  the Server Name Identifier (SNI) in the token
 *    is required by the gRPC client.
 */
test('GrpcManager smoke testing', async t => {
  t.throws(() => new GrpcManager({
    token: 'UUIDv4',
  }), 'should throw if there is no SNI prefix in token')

  t.doesNotThrow(() => new GrpcManager({
    token: 'SNI_UUIDv4',
  }), 'should not throw if there is SNI prefix in token')
})
