/**
 * Unit tests for `contact-mixin.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  ContactMixin,
  ProtectedPropertyContactMixin,
}                                 from './contact-mixin.ts'

test('ProtectedPropertyContactMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyContactMixin, keyof InstanceType<ContactMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
