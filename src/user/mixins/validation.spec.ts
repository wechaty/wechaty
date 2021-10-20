#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import {
  test,
  AssertEqual,
}               from 'tstest'

import {
  validationMixin,
}                       from './validation.js'

test('validationMixin() typing', async t => {
  class Life {

    meaning = 42

    hello () {
      return 'world'
    }

    constructor () {}

  }

  class UserClassImpl extends validationMixin<UserClass>()(Life) {

    id = 0
    constructor () { super() }

  }

  interface UserClass extends UserClassImpl {}

  const emptyObj: string | UserClass = {} as any
  t.notOk(UserClassImpl.valid(emptyObj), 'should invalid for a empty object')

  const instance = new UserClassImpl()
  t.ok(UserClassImpl.valid(instance), 'should valid for a instance')

  const map = new Map<any, any>()
  t.notOk(UserClassImpl.valid(map), 'should invalid for a map instance')

  const obj = {
    hello: () => 'world',
    id: 1,
    meaning: 42,
  }
  t.ok(UserClassImpl.valid(obj), 'should valid for a object that implements the interface')

  delete (obj as any).hello
  t.notOk(UserClassImpl.valid(obj), 'should invalid if an object has not fully implemented interface')
})

test('validationMixin() typing', async t => {
  class Life {

    meaning = 42

    hello () {
      return 'world'
    }

    constructor () {}

  }

  class UserClassImpl extends validationMixin<UserClass>()(Life) {

    id = 0
    constructor () { super() }

  }

  interface UserClass extends UserClassImpl {}

  const obj: string | UserClass = {} as any

  if (UserClassImpl.valid(obj)) {
    const validType: AssertEqual<
      typeof obj,
      UserClass
    > = true
    t.ok(validType, 'should be type `UserClass`')
  } else {
    const stringType: AssertEqual<
      typeof obj,
      string
    > = true
    t.ok(stringType, 'should be type `string`')
  }
})
