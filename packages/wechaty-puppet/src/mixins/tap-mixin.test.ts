/**
 * Unit tests for `tap-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  TapMixin,
  ProtectedPropertyTapMixin,
}                                         from './tap-mixin.ts'

test('ProtectedPropertyTapMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyTapMixin, keyof InstanceType<TapMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
