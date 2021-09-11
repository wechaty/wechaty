#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}         from 'tstest'

import {
  GrpcStatus,
  Metadata,
  UntypedServiceImplementation,
}                                   from './grpc-js.js'

import { authImplToken } from './auth-impl-token.js'

test('authImplToken()', async t => {
  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()

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
      callback: sandbox.spy(),
      ok: true,
    },
    { // Invalid request for Callback
      call: {
        metadata: new Metadata(),
      } as any,
      callback: sandbox.spy(),
      ok: false,
    },
    { // Invalid request for Stream
      call: {
        emit: sandbox.spy(),
        metadata: new Metadata(),
      } as any,
      callback: undefined,
      ok: false,
    },
  ] as const

  const method = implWithAuth['spy']!

  for (const { call, callback, ok } of TEST_LIST) {
    spy.resetHistory()

    method(call, callback as any)

    if (ok) {
      t.ok(spy.calledOnce, 'should call IMPL handler')
      continue
    }

    /**
      * not ok
      */
    t.ok(spy.notCalled, 'should not call IMPL handler')
    if (callback) {
      t.equal(callback.args[0]![0].code, GrpcStatus.UNAUTHENTICATED, 'should return UNAUTHENTICATED')
    } else {
      t.equal(call.emit.args[0][0], 'error', 'should emit error')
      t.equal(call.emit.args[0][1].code, GrpcStatus.UNAUTHENTICATED, 'should emit UNAUTHENTICATED')
    }

    // console.info(spy.args)
    // console.info(callback?.args)
  }
  sandbox.restore()
})
