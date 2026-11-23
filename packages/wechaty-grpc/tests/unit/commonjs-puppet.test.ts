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
