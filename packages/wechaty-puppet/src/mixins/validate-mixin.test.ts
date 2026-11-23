/**
 * Unit tests for `validate-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  ValidateMixin,
  ProtectedPropertyValidateMixin,
}                                         from './validate-mixin.ts'

test('ProtectedPropertyValidateMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyValidateMixin, keyof InstanceType<ValidateMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
