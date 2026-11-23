/**
 * Unit tests for `sayable-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  SayableMixin,
  ProtectedPropertySayableMixin,
}                                         from './sayable-mixin.ts'

test('ProtectedPropertySayableMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertySayableMixin, keyof InstanceType<SayableMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
