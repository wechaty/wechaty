#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'
import type http2 from 'http2'

import {
  Metadata,
}             from './grpc-js.js'

import { monkeyPatchMetadataFromHttp2Headers } from './mokey-patch-header-authorization.js'

test('monkeyPatchMetadataFromHttp2Headers', async t => {
  const AUTHORITY = '__authority__'
  const headers: http2.IncomingHttpHeaders = {
    ':authority': AUTHORITY,
  }

  const dispose = monkeyPatchMetadataFromHttp2Headers(Metadata)
  const meta = Metadata.fromHttp2Headers(headers)

  const authorization = meta.get('authorization')[0]
  const EXPECTED = `Wechaty ${AUTHORITY}`
  t.equal(authorization, EXPECTED, 'should get authority from metadata')

  dispose()
})
