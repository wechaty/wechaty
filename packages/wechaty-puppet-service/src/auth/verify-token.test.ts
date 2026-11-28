/**
 * Unit tests for constant-time token extraction and verification across
 * `Authorization: Bearer/Wechaty`, `x-wechaty-token`, and `:authority` headers.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  extractTokenFromHeaders,
  isTokenValid,
  verifyTokenFromHeaders,
} from './verify-token.ts'

test('extractTokenFromHeaders respects precedence order', () => {
  assert.equal(
    extractTokenFromHeaders({
      authorization: 'Bearer secret-1',
      'x-wechaty-token': 'secret-2',
      ':authority': 'secret-3',
    }),
    'secret-1',
  )
  assert.equal(
    extractTokenFromHeaders({
      authorization: 'Wechaty secret-w',
    }),
    'secret-w',
  )
  assert.equal(
    extractTokenFromHeaders({
      'x-wechaty-token': 'secret-x',
      host: 'localhost:8788',
    }),
    'secret-x',
  )
  assert.equal(
    extractTokenFromHeaders({
      ':authority': 'legacy-token',
    }),
    'legacy-token',
  )
})

test('verifyTokenFromHeaders validates tokens in constant time and rejects empty/mismatch', () => {
  assert.equal(isTokenValid('abc', 'abc'), true)
  assert.equal(isTokenValid('abc', 'abd'), false)
  assert.equal(isTokenValid('abc', 'abcd'), false)
  assert.equal(isTokenValid('', 'abc'), false)
  assert.equal(verifyTokenFromHeaders({ authorization: 'Bearer my-token' }, 'my-token'), true)
  assert.equal(verifyTokenFromHeaders({ 'x-wechaty-token': 'my-token' }, 'my-token'), true)
  assert.equal(verifyTokenFromHeaders({ authorization: 'Bearer wrong' }, 'my-token'), false)
})
