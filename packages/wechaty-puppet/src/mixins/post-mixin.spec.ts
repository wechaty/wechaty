#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  PostMixin,
  ProtectedPropertyPostMixin,
}                                   from './post-mixin.js'

test('ProtectedPropertyPostMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyPostMixin, keyof InstanceType<PostMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
