#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  CacheMixin,
  ProtectedPropertyCacheMixin,
}                               from './cache-mixin.js'

test('ProtectedPropertyCacheMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyCacheMixin, keyof InstanceType<CacheMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
