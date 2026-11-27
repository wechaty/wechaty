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
  assert.equal((BoundUserClass as any).pool, undefined, 'non-poolified module should not synthesize pool')
})

test('bindUserModule() stack unwinding, cross-class guard, and subclass instanceof', async _t => {
  class InnerClass extends wechatifyMixin(Object) {}
  class OuterClass extends wechatifyMixin(Object) {
    constructor (shouldThrow = false, callInner = false) {
      super()
      if (callInner) {
        new InnerClass()
      }
      if (shouldThrow) {
        throw new Error('constructor boom')
      }
    }
  }

  const BoundOuter = bindUserModule(OuterClass)(wechaty)

  // 1. Stack unwinds when bound constructor throws
  assert.throws(() => new BoundOuter(true), /constructor boom/)
  assert.throws(() => new OuterClass(), /can not be instantiated directly/)

  // 2. Synchronous direct new InnerClass() inside BoundOuter constructor still throws
  assert.throws(() => new BoundOuter(false, true), /can not be instantiated directly/)

  // 3. Subclassing bound module preserves prototype chain and instanceof in both orders
  class CustomOuter extends BoundOuter {}
  const base = new BoundOuter()
  const sub = new CustomOuter()
  assert.ok(base instanceof BoundOuter)
  assert.ok(!(base instanceof CustomOuter))
  assert.ok(sub instanceof CustomOuter)
  assert.ok(sub instanceof BoundOuter)
  assert.ok(sub instanceof OuterClass)
})
