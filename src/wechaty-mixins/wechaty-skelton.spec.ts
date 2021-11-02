#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  WechatySkelton,
  ProtectedPropertyWechatySkelton,
}                                         from './wechaty-skelton.js'

test('ProtectedPropertyWechatySkelton', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyWechatySkelton, keyof WechatySkelton>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
