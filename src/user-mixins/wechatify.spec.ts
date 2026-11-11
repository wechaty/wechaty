#!/usr/bin/env -S node --import=tsx/esm
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Wechaty } from '../mods/mod.js'

import {
  isWechatified,
  wechatifyMixin,
  wechatifyUserModule,
}                       from './wechatify.js'

const wechaty = {
  puppet: {} as any,
} as any as Wechaty

test('isWechatified()', async _t => {

  class UserClassTest extends wechatifyMixin(Object) {}
  assert.ok(!isWechatified(UserClassTest), 'should not be wechatified')
  assert.throws(() => UserClassTest.wechaty, 'should throw before wechatified')

  const WechatifiedUserClass = wechatifyUserModule(UserClassTest)(wechaty)
  assert.ok(isWechatified(WechatifiedUserClass), 'should be wechatified')
  assert.doesNotThrow(() => WechatifiedUserClass.wechaty, 'should not throw after wechatified')

  const user: UserClassTest = new WechatifiedUserClass()
  assert.ok(user, 'should be able to assign with the correct typing')
})
