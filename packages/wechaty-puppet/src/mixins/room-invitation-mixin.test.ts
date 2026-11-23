/**
 * Unit tests for `room-invitation-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  RoomInvitationMixin,
  ProtectedPropertyRoomInvitationMixin,
}                                         from './room-invitation-mixin.ts'

test('ProtectedPropertyRoomInvitationMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyRoomInvitationMixin, keyof InstanceType<RoomInvitationMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
