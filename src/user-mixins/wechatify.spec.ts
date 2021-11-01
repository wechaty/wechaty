#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'
import type { Wechaty } from '../mods/mod.js'

import {
  isWechatified,
  wechatifyMixin,
  wechatifyUserModule,
}                       from './wechatify.js'

const wechaty = {
  puppet: {} as any,
} as any as Wechaty

test('isWechatified()', async t => {

  class UserClassTest extends wechatifyMixin(Object) {}
  t.notOk(isWechatified(UserClassTest), 'should not be wechatified')
  t.throws(() => UserClassTest.wechaty, 'should throw before wechatified')

  const WechatifiedUserClass = wechatifyUserModule(UserClassTest)(wechaty)
  t.ok(isWechatified(WechatifiedUserClass), 'should be wechatified')
  t.doesNotThrow(() => WechatifiedUserClass.wechaty, 'should not throw after wechatified')

  const user: UserClassTest = new WechatifiedUserClass()
  t.ok(user, 'should be able to assign with the correct typing')
})
