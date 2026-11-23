#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  RoomInvitationMixin,
  ProtectedPropertyRoomInvitationMixin,
}                                         from './room-invitation-mixin.js'

test('ProtectedPropertyRoomInvitationMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyRoomInvitationMixin, keyof InstanceType<RoomInvitationMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
