/**
 * Verifies that the generated and enriched OpenAPI 3.2.0 specification exported by
 * `wechaty-grpc` includes BearerAuth, ConnectRPC HTTP/JSON routes (including GET
 * for NO_SIDE_EFFECTS RPCs), and plain-HTTP fallback routes (`/events`, `/files`,
 * `/files/{id}`, `/healthz`).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { openApiSpec } from '../../src/mod.ts'

test('openApiSpec is a valid OpenAPI 3.2.0 document with Puppet routes and BearerAuth', () => {
  assert.equal(openApiSpec.openapi, '3.2.0')
  assert.equal(openApiSpec.info.title, 'Wechaty Puppet Service API')
  assert.ok(openApiSpec.components.securitySchemes.BearerAuth)
  assert.deepEqual(openApiSpec.security, [{ BearerAuth: [] }])

  const paths = openApiSpec.paths as Record<string, Record<string, unknown>>
  assert.ok(paths['/wechaty.Puppet/MessageSendText']?.['post'])
  assert.ok(paths['/wechaty.Puppet/Version']?.['get'], 'NO_SIDE_EFFECTS RPC should expose GET')
  assert.ok(paths['/events']?.['get'])
  assert.ok(paths['/files']?.['post'])
  assert.ok(paths['/files/{id}']?.['get'])
  assert.ok(paths['/healthz']?.['get'])
})
