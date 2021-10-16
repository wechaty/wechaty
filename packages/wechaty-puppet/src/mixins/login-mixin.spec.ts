#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  LoginMixin,
  ProtectedPropertyLoginMixin,
}                                   from './login-mixin.js'

test('ProtectedPropertyLoginMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyLoginMixin, keyof InstanceType<LoginMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
