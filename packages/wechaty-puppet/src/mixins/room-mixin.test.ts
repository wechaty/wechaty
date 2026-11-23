/**
 * Unit tests for `room-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  RoomMixin,
  ProtectedPropertyRoomMixin,
}                                         from './room-mixin.ts'

test('ProtectedPropertyRoomMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyRoomMixin, keyof InstanceType<RoomMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
