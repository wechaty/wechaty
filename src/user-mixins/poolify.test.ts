#!/usr/bin/env node
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  poolifyMixin,
}                       from './poolify.ts'
import {
  wechatifyUserModule,
  wechatifyMixin,
}                       from './wechatify.ts'

type AssertEqual<Actual, Expected> =
  (<Value>() => Value extends Actual ? 1 : 2) extends
  (<Value>() => Value extends Expected ? 1 : 2) ? true : false

test('poolifyMixin()', async _t => {
  class Life {

    meaning = 42
    constructor () {}

  }

  class UserClassTest extends poolifyMixin(Life)<UserClassTest>() {

    id = 0
    constructor () { super() }

  }

  const meaningType: AssertEqual<number, typeof UserClassTest.prototype.meaning> = true
  assert.ok(meaningType, 'should get meaning type for class instance')

  type PoolGetReturnType = Exclude<
    ReturnType<typeof UserClassTest.pool.get>,
    undefined
  >
  const poolGetType: AssertEqual<
    PoolGetReturnType,
    UserClassTest
  > = true
  assert.ok(poolGetType, 'should get Life type for pool.get()')

  type LoadReturnType = ReturnType<typeof UserClassTest.load>
  const loadType: AssertEqual<
    LoadReturnType,
    UserClassTest
  > = true
  assert.ok(loadType, 'should get UserClassTest type for load()')
})

test('poolifyMixin() pool', async _t => {
  class Life {

    meaning = 42

  }

  class UserClassTest extends wechatifyMixin(
    poolifyMixin(Life)<UserClassTest>(),
  ) {

    id = 0
    constructor () { super() }

  }

  const UserClass1 = wechatifyUserModule(UserClassTest)({} as any)
  const UserClass2 = wechatifyUserModule(UserClassTest)({} as any)

  assert.equal(UserClass1.pool.size, 0, 'should be size 0 for class 1')
  assert.equal(UserClass2.pool.size, 0, 'should be size 0 for class 2')

  UserClass1.load('id1')
  assert.equal(UserClass1.pool.size, 1, 'should be size 1 for class 1 after class1.load()')
  assert.equal(UserClass2.pool.size, 0, 'should be size 0 for class 2 after class1.load()')

  UserClass2.load('id2')
  assert.equal(UserClass1.pool.size, 1, 'should be size 1 for class 1 after class2.load()')
  assert.equal(UserClass2.pool.size, 1, 'should be size 1 for class 2 after class2.load()')
})

test('static findAll()', async _t => {

  class UserClassTest extends wechatifyMixin(
    poolifyMixin(Object)<UserClassTest>(),
  ) {

    static async findAll<T extends typeof UserClassTest> (
      this : T,
      id   : string,
    ) {
      return this.load(id)
    }

    id = 0
    constructor () { super() }

  }

  /* eslint-disable no-undef */
  type findAllReturnType = ReturnType<
    typeof UserClassTest.findAll
  >
  const typeTest: AssertEqual<
    findAllReturnType,
    Promise<UserClassTest>
  > = true

  assert.ok(typeTest, 'should return the UserClassTest type')
})
