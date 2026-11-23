/**
 * Unit tests for `login-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  LoginMixin,
  ProtectedPropertyLoginMixin,
}                                   from './login-mixin.ts'

test('ProtectedPropertyLoginMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyLoginMixin, keyof InstanceType<LoginMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
