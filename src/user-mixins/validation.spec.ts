#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import {
  test,
  AssertEqual,
}               from 'tstest'

import {
  validationMixin,
}                       from './validation.js'

test('validationMixin() valid()', async t => {
  class Parent {

    foo () { return 'foo' }

  }

  class Child extends Parent {

    bar () { return 'bar' }

  }

  class UserClassImpl extends validationMixin(Child)<UserClass>() {}
  interface UserClass extends UserClassImpl {}

  const FIXTURES = [
    [new UserClassImpl(),       true],
    // Invalid things
    [{},                        false],
    [[],                        false],
    [new Map(),                 false],
    // Object interface
    [{ bar: true, foo: true },  true],
    [{ bar: true },             false],
    [{ foo: true },             false],
  ]

  for (const [input, expected] of FIXTURES) {
    const valid = expected ? 'valid' : 'invalid'
    /* eslint-disable multiline-ternary */
    const type = typeof input !== 'object' ? typeof input
      : typeof input.constructor === 'function' ? input.constructor.name
        : 'object'

    t.equal(
      UserClassImpl.valid(input),
      expected,
      `should be ${valid} for ${type} "${JSON.stringify(input)}"`,
    )
  }
})

test('validationMixin() type guard', async t => {
  class Parent {

    foo () { return 'foo' }
    constructor () {}

  }

  class Child extends Parent {

    bar () { return 'bar' }
    constructor () { super() }

  }

  class UserClassImpl extends validationMixin(Child)<UserClass>() {}
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
