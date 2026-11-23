/**
 * Unit tests for `friendship-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  FriendshipMixin,
  ProtectedPropertyFriendshipMixin,
}                                   from './friendship-mixin.ts'

test('ProtectedPropertyFriendshipMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyFriendshipMixin, keyof InstanceType<FriendshipMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
