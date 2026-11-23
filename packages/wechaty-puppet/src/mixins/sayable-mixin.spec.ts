#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  SayableMixin,
  ProtectedPropertySayableMixin,
}                                         from './sayable-mixin.js'

test('ProtectedPropertySayableMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertySayableMixin, keyof InstanceType<SayableMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
