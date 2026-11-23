/**
 * Unit tests for `room-member-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  RoomMemberMixin,
  ProtectedPropertyRoomMemberMixin,
}                                         from './room-member-mixin.ts'

test('ProtectedPropertyRoomMemberMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyRoomMemberMixin, keyof InstanceType<RoomMemberMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
