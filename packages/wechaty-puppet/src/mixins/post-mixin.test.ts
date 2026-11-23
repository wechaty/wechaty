/**
 * Unit tests for `post-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  PostMixin,
  ProtectedPropertyPostMixin,
}                                   from './post-mixin.ts'

test('ProtectedPropertyPostMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPostMixin, keyof InstanceType<PostMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
