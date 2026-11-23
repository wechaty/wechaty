/**
 * Unit tests for `message-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  MessageMixin,
  ProtectedPropertyMessageMixin,
}                                   from './message-mixin.ts'

test('ProtectedPropertyMessageMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyMessageMixin, keyof InstanceType<MessageMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
