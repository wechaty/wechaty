/**
 * Unit test for `metaGeneratorToken()`: it yields metadata with
 * `authorization: Wechaty <token>`.
 */
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import { metaGeneratorToken } from './call-cred.ts'

test('metaGeneratorToken()', async _t => {
  const TOKEN = 'UUIDv4'
  const EXPECTED_AUTHORIZATION = `Wechaty ${TOKEN}`
  const spy = mock.fn()

  const metaGenerator = metaGeneratorToken(TOKEN)

  metaGenerator({} as any, spy)
  assert.equal(spy.mock.calls[0]!.arguments[0], null, 'should no error')

  const metadata = spy.mock.calls[0]!.arguments[1]
  const authorization = metadata.get('Authorization')[0]
  assert.equal(authorization, EXPECTED_AUTHORIZATION, 'should generate authorization in metadata')
})
