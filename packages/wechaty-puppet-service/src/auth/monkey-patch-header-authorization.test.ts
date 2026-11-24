/**
 * Unit test for `monkeyPatchMetadataFromHttp2Headers()`: metadata built from
 * headers with only `:authority` gets an `authorization` value.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type http2 from 'http2'

import {
  Metadata,
}             from './grpc-js.ts'

import { monkeyPatchMetadataFromHttp2Headers } from './mokey-patch-header-authorization.ts'

test('monkeyPatchMetadataFromHttp2Headers', async _t => {
  const AUTHORITY = '__authority__'
  const headers: http2.IncomingHttpHeaders = {
    ':authority': AUTHORITY,
  }

  const dispose = monkeyPatchMetadataFromHttp2Headers(Metadata)
  const meta = Metadata.fromHttp2Headers(headers)

  const authorization = meta.get('authorization')[0]
  const EXPECTED = `Wechaty ${AUTHORITY}`
  assert.equal(authorization, EXPECTED, 'should get authority from metadata')

  dispose()
})
