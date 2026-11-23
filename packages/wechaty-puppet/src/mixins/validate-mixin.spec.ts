#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  ValidateMixin,
  ProtectedPropertyValidateMixin,
}                                         from './validate-mixin.js'

test('ProtectedPropertyValidateMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyValidateMixin, keyof InstanceType<ValidateMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
