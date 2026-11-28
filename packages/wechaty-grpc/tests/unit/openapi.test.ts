/**
 * Verifies that the generated and enriched OpenAPI 3.2.0 specification exported by
 * `wechaty-grpc/openapi` includes BearerAuth, ConnectRPC HTTP/JSON routes (including
 * GET for NO_SIDE_EFFECTS RPCs), Health routes, declared tags, and no empty PathItems.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { openApiSpec } from '../../src/openapi.ts'

test('openApiSpec is a valid OpenAPI 3.2.0 document with Puppet and Health routes', () => {
  assert.equal(openApiSpec.openapi, '3.2.0')
  assert.equal(openApiSpec.info.title, 'Wechaty Puppet Service API')
  assert.ok(openApiSpec.info.version)
  assert.ok(openApiSpec.components.securitySchemes?.['BearerAuth'])
  assert.deepEqual(openApiSpec.security, [{ BearerAuth: [] }])

  assert.ok(openApiSpec.paths['/wechaty.Puppet/MessageSendText']?.['post'])
  assert.ok(openApiSpec.paths['/wechaty.Puppet/Version']?.['get'], 'NO_SIDE_EFFECTS RPC should expose GET')
  assert.ok(openApiSpec.paths['/grpc.health.v1.Health/Check']?.['post'])

  const declaredTags = new Set((openApiSpec.tags ?? []).map(t => t.name))
  for (const [route, item] of Object.entries(openApiSpec.paths)) {
    assert.ok(Object.keys(item).length > 0, `PathItem for ${route} must not be empty`)
    for (const op of Object.values(item)) {
      const tags = (op as { tags?: string[] })?.tags ?? []
      for (const tag of tags) {
        assert.ok(declaredTags.has(tag), `Tag ${tag} on ${route} must be declared in top-level tags`)
      }
    }
  }
})
