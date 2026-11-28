/**
 * Smoke test for the packed tarball (run by scripts/npm-pack-testing.sh in a
 * temporary ESM project): the generated stubs load from the published `dist/`,
 * schemas serialize and deserialize cleanly, the bundled `puppet.proto` is readable,
 * and the embedded version is the real one.
 */
import assert from 'node:assert/strict'
import {
  create,
  toBinary,
  fromBinary,
} from '@bufbuild/protobuf'

import {
  Puppet,
  proto,
  EventResponseSchema,
  EventType,
  VERSION,
} from 'wechaty-grpc'
import { openApiSpec } from 'wechaty-grpc/openapi'

assert.notEqual(VERSION, '0.0.0', 'version should be set before publishing')
assert.equal(openApiSpec.openapi, '3.2.0', 'OpenAPI 3.2.0 spec should be exported from wechaty-grpc/openapi')
assert.equal(openApiSpec.info.version, VERSION, 'OpenAPI info.version should match package VERSION')
assert.match(proto.puppet.v0.data, /service Puppet/, 'puppet.proto should be bundled')
assert.equal(Puppet.typeName, 'wechaty.Puppet', 'Puppet service definition should be exposed')

const event = create(EventResponseSchema, {
  type: EventType.MESSAGE,
  payload: '{"smoke":true}',
})
const bytes = toBinary(EventResponseSchema, event)
const restored = fromBinary(EventResponseSchema, bytes)
assert.equal(restored.type, EventType.MESSAGE, 'event type should round-trip')
assert.equal(restored.payload, '{"smoke":true}', 'payload should round-trip')

console.info(`wechaty-grpc v${VERSION} smoking test passed.`)
