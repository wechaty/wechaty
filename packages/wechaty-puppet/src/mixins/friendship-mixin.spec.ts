#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  FriendshipMixin,
  ProtectedPropertyFriendshipMixin,
}                                   from './friendship-mixin.js'

test('ProtectedPropertyFriendshipMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyFriendshipMixin, keyof InstanceType<FriendshipMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
