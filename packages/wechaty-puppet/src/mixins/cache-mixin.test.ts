/**
 * Unit tests for `cache-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  CacheMixin,
  ProtectedPropertyCacheMixin,
}                               from './cache-mixin.ts'

test('ProtectedPropertyCacheMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyCacheMixin, keyof InstanceType<CacheMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
