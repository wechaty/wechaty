#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  TapMixin,
  ProtectedPropertyTapMixin,
}                                         from './tap-mixin.js'

test('ProtectedPropertyTapMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyTapMixin, keyof InstanceType<TapMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
