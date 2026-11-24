/**
 * Unit test for `callCredToken()`: verifies that the client interceptor
 * injects `authorization: Wechaty <token>` into outgoing request headers.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { callCredToken } from './call-cred.ts'

test('callCredToken() sets authorization header', async () => {
  const TOKEN = 'UUIDv4'
  const interceptor = callCredToken(TOKEN)

  const headers = new Headers()
  const req = {
    header: headers,
  }

  let capturedReq: any
  const next = async (r: any) => {
    capturedReq = r
    return { ok: true }
  }

  await interceptor(next as any)(req as any)

  assert.equal(
    capturedReq.header.get('authorization'),
    `Wechaty ${TOKEN}`,
    'should generate authorization in headers',
  )
})
