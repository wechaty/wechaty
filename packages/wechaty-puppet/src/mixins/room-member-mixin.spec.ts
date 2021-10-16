#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  RoomMemberMixin,
  ProtectedPropertyRoomMemberMixin,
}                                         from './room-member-mixin.js'

test('ProtectedPropertyRoomMemberMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyRoomMemberMixin, keyof InstanceType<RoomMemberMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
