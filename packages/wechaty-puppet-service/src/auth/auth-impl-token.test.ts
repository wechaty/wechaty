/**
 * Unit tests for `authImplToken()`: a valid token reaches the next handler,
 * while a missing or invalid token is rejected with Code.Unauthenticated.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Code, ConnectError } from '@connectrpc/connect'

import { authImplToken } from './auth-impl-token.ts'

test('authImplToken() with valid token', async () => {
  const TOKEN = 'test-token-uuid'
  const interceptor = authImplToken(TOKEN)

  let nextCalled = false
  const next = async (req: any) => {
    nextCalled = true
    return { ok: true, req }
  }

  const req = {
    header: new Headers({
      authorization: `Wechaty ${TOKEN}`,
    }),
  }

  const res = await interceptor(next as any)(req as any)
  assert.equal(nextCalled, true, 'next handler should have been called')
  assert.equal((res as any).ok, true)
})

test('authImplToken() with invalid token', async () => {
  const TOKEN = 'test-token-uuid'
  const interceptor = authImplToken(TOKEN)

  let nextCalled = false
  const next = async (req: any) => {
    nextCalled = true
    return { ok: true, req }
  }

  const req = {
    header: new Headers({
      authorization: 'Wechaty wrong-token',
    }),
  }

  await assert.rejects(
    async () => interceptor(next as any)(req as any),
    (err: any) => {
      assert.ok(err instanceof ConnectError)
      assert.equal(err.code, Code.Unauthenticated)
      return true
    },
    'should reject with Code.Unauthenticated',
  )
  assert.equal(nextCalled, false, 'next handler must not be called')
})

test('authImplToken() with legacy :authority header', async () => {
  const TOKEN = 'test-token-uuid'
  const interceptor = authImplToken(TOKEN)

  let nextCalled = false
  const next = async (req: any) => {
    nextCalled = true
    return { ok: true, req }
  }

  const req = {
    header: new Headers({
      authority: TOKEN,
    }),
  }

  const res = await interceptor(next as any)(req as any)
  assert.equal(nextCalled, true, 'next handler should have been called with authority header')
  assert.equal((res as any).ok, true)
})

test('authImplToken() rejects empty configured token or empty credentials', async () => {
  const emptyTokenInterceptor = authImplToken('')
  const next = async (req: any) => ({ ok: true, req })
  const emptyReq = { header: new Headers() }

  await assert.rejects(
    async () => emptyTokenInterceptor(next as any)(emptyReq as any),
    (err: any) => {
      assert.ok(err instanceof ConnectError)
      assert.equal(err.code, Code.Unauthenticated)
      return true
    },
    'empty server token must reject immediately',
  )

  const validInterceptor = authImplToken('configured-secret')
  await assert.rejects(
    async () => validInterceptor(next as any)(emptyReq as any),
    (err: any) => {
      assert.ok(err instanceof ConnectError)
      assert.equal(err.code, Code.Unauthenticated)
      return true
    },
    'empty request credentials must reject immediately',
  )
})
