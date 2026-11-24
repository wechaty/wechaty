/**
 * Unit tests for `serverErrorInterceptor` and `toConnectError`.
 *
 * Verifies that unexpected runtime exceptions thrown during unary or streaming
 * RPC execution are caught, logged, and converted into ConnectError with Code.Internal.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Code, ConnectError } from '@connectrpc/connect'

import { serverErrorInterceptor, toConnectError } from './grpc-error.ts'

test('toConnectError() wraps plain errors in Code.Internal ConnectError', () => {
  const plainError = new Error('database connection lost')
  const connectErr = toConnectError('testMethod', plainError)

  assert.equal(connectErr.code, Code.Internal, 'error code should be Internal')
  assert.equal(connectErr.rawMessage, 'database connection lost', 'error message should match')
})

test('toConnectError() preserves valid gRPC status codes from GError', () => {
  const deadlineError = Object.assign(new Error('timeout exceeded'), { code: 4 })
  const deadlineConnectErr = toConnectError('testTimeout', deadlineError)
  assert.equal(deadlineConnectErr.code, Code.DeadlineExceeded, 'error code should preserve DeadlineExceeded')

  const invalidArgError = Object.assign(new Error('invalid argument'), { code: 'InvalidArgument' })
  const invalidArgConnectErr = toConnectError('testArg', invalidArgError)
  assert.equal(invalidArgConnectErr.code, Code.InvalidArgument, 'error code should preserve InvalidArgument')
})

test('serverErrorInterceptor() converts unary thrown error to Code.Internal', async () => {
  const interceptor = serverErrorInterceptor()
  const mockNext = async () => {
    throw new Error('unary failure')
  }

  const intercepted = interceptor(mockNext as any)
  const fakeReq: any = {
    method: { name: 'testUnary' },
    stream: false,
  }

  await assert.rejects(
    async () => intercepted(fakeReq),
    (err: any) => {
      assert.ok(err instanceof ConnectError, 'should be instance of ConnectError')
      assert.equal(err.code, Code.Internal, 'code should be Internal')
      assert.equal(err.rawMessage, 'unary failure', 'message should be preserved')
      return true
    },
  )
})

test('serverErrorInterceptor() converts streaming thrown error to Code.Internal', async () => {
  const interceptor = serverErrorInterceptor()
  async function* failingStream () {
    yield 'first chunk'
    throw new Error('streaming failure')
  }

  const mockNext = async () => ({
    stream: true,
    message: failingStream(),
  })

  const intercepted = interceptor(mockNext as any)
  const fakeReq: any = {
    method: { name: 'testStream' },
    stream: true,
  }

  const res: any = await intercepted(fakeReq)
  assert.ok(res.stream, 'response should be stream')

  const received: string[] = []
  await assert.rejects(
    async () => {
      for await (const chunk of res.message) {
        received.push(chunk)
      }
    },
    (err: any) => {
      assert.ok(err instanceof ConnectError, 'stream error should be ConnectError')
      assert.equal(err.code, Code.Internal, 'stream error code should be Internal')
      assert.equal(err.rawMessage, 'streaming failure', 'stream error message should match')
      return true
    },
  )
  assert.deepEqual(received, ['first chunk'], 'first chunk should have been received before failure')
})
