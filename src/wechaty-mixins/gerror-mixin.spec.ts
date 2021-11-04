#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'

import type {
  GErrorMixin,
  ProtectedPropertyGErrorMixin,
}                                             from './gerror-mixin.js'

test('ProtectedPropertyGErrorMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyGErrorMixin, keyof InstanceType<GErrorMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
