/**
 * Unit tests for `service-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  ServiceMixin,
  ProtectedPropertyServiceMixin,
}                                 from './service-mixin.ts'

test('ProtectedPropertyServiceMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyServiceMixin, keyof InstanceType<ServiceMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
