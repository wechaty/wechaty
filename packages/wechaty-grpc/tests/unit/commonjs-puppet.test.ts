/**
 * Tests `commonjs/generated/puppet.cjs`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import puppet from '../../commonjs/generated/puppet.cjs'

test('CJS: EventRequest', async _t => {
  assert.ok(puppet.EventRequest, 'should export EventRequest')
})

test('CJS: PuppetService', async _t => {
  assert.ok(puppet.PuppetService, 'should export PuppetSevice')
})

test('CJS: EventTypeMap', async _t => {
  const map: puppet.EventTypeMap = {} as any
  map.EVENT_TYPE_DIRTY = puppet.EventType.EVENT_TYPE_DIRTY
  assert.equal(Object.keys(map).length, 1, 'should export type EventTypeMap')
})

test('CJS: every generated wechaty message module is in the puppet wrapper', async () => {
  // Each *_pb.js that declares messages or enums must be listed in
  // commonjs/generated/puppet.cjs, or its messages are unreachable (as
  // ConversationReadRequest was). The *_grpc_pb.js service stubs of files
  // without a service are empty and need no entry.
  const { readdirSync, readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const outDir = fileURLToPath(new URL('../../out/wechaty/', import.meta.url))
  const wrapper = readFileSync(fileURLToPath(new URL('../../commonjs/generated/puppet.cjs', import.meta.url)), 'utf8')
  const generated = (readdirSync(outDir, { recursive: true }) as string[])
    .filter(file => file.endsWith('_pb.js') && !file.endsWith('_grpc_pb.js'))
  assert.ok(generated.length > 0, 'should find generated message modules')
  for (const file of generated) {
    assert.ok(wrapper.includes(`'../../out/wechaty/${file.split('\\').join('/')}'`), `puppet.cjs should load ${file}`)
  }
  assert.equal(typeof puppet.ConversationReadRequest, 'function', 'conversation messages should be reachable')
})
