#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  ServiceMixin,
  ProtectedPropertyServiceMixin,
}                                 from './service-mixin.js'

test('ProtectedPropertyServiceMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyServiceMixin, keyof InstanceType<ServiceMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
