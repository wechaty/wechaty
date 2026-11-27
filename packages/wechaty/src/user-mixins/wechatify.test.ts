#!/usr/bin/env node
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Wechaty } from '../mods/mod.ts'

import {
  isWechatified,
  wechatifyMixin,
  bindUserModule,
}                       from './wechatify.ts'

const wechaty = {
  puppet: {} as any,
} as any as Wechaty

test('isWechatified() and canonical instanceof', async _t => {

  class UserClassTest extends wechatifyMixin(Object) {}
  assert.ok(!isWechatified(UserClassTest), 'should not be wechatified')
  assert.throws(() => UserClassTest.wechaty, 'should throw before wechatified')
  assert.throws(() => new UserClassTest(), 'should throw when instantiating unbound class')

  const BoundUserClass = bindUserModule(UserClassTest)(wechaty)
  assert.ok(isWechatified(BoundUserClass), 'should be wechatified')
  assert.doesNotThrow(() => BoundUserClass.wechaty, 'should not throw after wechatified')

  const user: UserClassTest = new BoundUserClass()
  assert.ok(user, 'should be able to assign with the correct typing')
  assert.equal(user.wechaty, wechaty, 'instance should receive wechaty via constructor injection')
  assert.ok(user instanceof UserClassTest, 'instanceof canonical class should be true')
  assert.ok(user instanceof BoundUserClass, 'instanceof bound module should be true')
})
