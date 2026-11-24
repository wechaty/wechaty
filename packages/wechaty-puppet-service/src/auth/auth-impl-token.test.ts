/**
 * Unit tests for `authImplToken()`: a valid token reaches the wrapped
 * handler; a missing token is rejected through the callback or, for a stream,
 * through an `error` event.
 */
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import {
  GrpcStatus,
  Metadata,
  type UntypedServiceImplementation,
}                                   from './grpc-js.ts'

import { authImplToken } from './auth-impl-token.ts'

test('authImplToken()', async _t => {
  const spy = mock.fn()

  const TOKEN = 'UUIDv4'
  const IMPL: UntypedServiceImplementation = {
    spy,
  }

  const implWithAuth = authImplToken(TOKEN)(IMPL)
  const validMetadata = new Metadata()
  validMetadata.add('Authorization', 'Wechaty ' + TOKEN)

  const TEST_LIST = [
    { // Valid Token Request
      call: {
        metadata: validMetadata,
      } as any,
      callback: mock.fn(),
      ok: true,
    },
    { // Invalid request for Callback
      call: {
        metadata: new Metadata(),
      } as any,
      callback: mock.fn(),
      ok: false,
    },
    { // Invalid request for Stream
      call: {
        emit: mock.fn(),
        metadata: new Metadata(),
      } as any,
      callback: undefined,
      ok: false,
    },
  ] as const

  const method = implWithAuth['spy']!

  for (const { call, callback, ok } of TEST_LIST) {
    spy.mock.resetCalls()

    method(call, callback as any)

    if (ok) {
      assert.equal(spy.mock.callCount(), 1, 'should call IMPL handler')
      continue
    }

    /**
      * not ok
      */
    assert.equal(spy.mock.callCount(), 0, 'should not call IMPL handler')
    if (callback) {
      assert.equal(callback.mock.calls[0]!.arguments[0].code, GrpcStatus.UNAUTHENTICATED, 'should return UNAUTHENTICATED')
    } else {
      assert.equal(call.emit.mock.calls[0]!.arguments[0], 'error', 'should emit error')
      assert.equal(call.emit.mock.calls[0]!.arguments[1].code, GrpcStatus.UNAUTHENTICATED, 'should emit UNAUTHENTICATED')
    }

    // console.info(spy.args)
    // console.info(callback?.args)
  }
  mock.restoreAll()
})
