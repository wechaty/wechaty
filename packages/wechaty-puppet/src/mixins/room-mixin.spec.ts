#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  RoomMixin,
  ProtectedPropertyRoomMixin,
}                                         from './room-mixin.js'

test('ProtectedPropertyRoomMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyRoomMixin, keyof InstanceType<RoomMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
