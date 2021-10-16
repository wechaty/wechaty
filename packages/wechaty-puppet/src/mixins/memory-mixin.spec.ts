#!/usr/bin/env -S node --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  MemoryMixin,
  ProtectedPropertyMemoryMixin,
}                                   from './memory-mixin.js'

test('ProtectedPropertyMemoryMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyMemoryMixin, keyof InstanceType<MemoryMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
