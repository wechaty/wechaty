#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  WechatySkeleton,
  ProtectedPropertyWechatySkeleton,
}                                         from './wechaty-skeleton.js'

test('ProtectedPropertyWechatySkeleton', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyWechatySkeleton, keyof WechatySkeleton>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
