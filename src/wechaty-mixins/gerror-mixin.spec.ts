#!/usr/bin/env -S node --import=tsx/esm
import { test } from 'node:test'
import assert from 'node:assert/strict'

import type {
  GErrorMixin,
  ProtectedPropertyGErrorMixin,
}                                             from './gerror-mixin.js'

test('ProtectedPropertyGErrorMixin', async _t => {
  type NotExistInMixin = Exclude<ProtectedPropertyGErrorMixin, keyof InstanceType<GErrorMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
