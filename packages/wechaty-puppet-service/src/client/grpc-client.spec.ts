#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { GrpcClient } from './grpc-client.js'

/**
 * Huan(202108):
 *  the Server Name Identifier (SNI) in the token
 *    is required by the gRPC client.
 */
test('GrpcClient smoke testing', async t => {
  t.throws(() => new GrpcClient({
    token: 'UUIDv4',
  }), 'should throw if there is no SNI prefix in token')

  t.doesNotThrow(() => new GrpcClient({
    token: 'SNI_UUIDv4',
  }), 'should not throw if there is SNI prefix in token')
})
