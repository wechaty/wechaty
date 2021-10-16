#!/usr/bin/env -S node --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  StateMixin,
  ProtectedPropertyStateMixin,
}                                         from './state-mixin.js'

test('ProtectedPropertyStateMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyStateMixin, keyof InstanceType<StateMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
