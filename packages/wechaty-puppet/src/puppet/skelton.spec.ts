#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  SkeltonProtectedProperty,
  PuppetSkelton,
}                             from './skelton.js'

test('ProtectedPropertySkelton', async t => {
  type NotExistInMixin = Exclude<SkeltonProtectedProperty, keyof PuppetSkelton>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
