#!/usr/bin/env node
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  validationMixin,
}                       from './validation.ts'

type AssertEqual<Actual, Expected> =
  (<Value>() => Value extends Actual ? 1 : 2) extends
  (<Value>() => Value extends Expected ? 1 : 2) ? true : false

test('validationMixin() valid()', async _t => {
  class Parent {

    foo () { return 'foo' }

  }

  class Child extends Parent {

    bar () { return 'bar' }

  }

  class UserClassImpl extends validationMixin(Child)<UserClass>() {}
  interface UserClass extends UserClassImpl {}

  const FIXTURES = [
    [ new UserClassImpl(),       true ],
    // Invalid things
    [ {},                        false ],
    [ [],                        false ],
    [ new Map(),                 false ],
    // Object interface
    [ { bar: true, foo: true },  true ],
    [ { bar: true },             false ],
    [ { foo: true },             false ],
  ]

  for (const [ input, expected ] of FIXTURES) {
    const valid = expected ? 'valid' : 'invalid'
    /* eslint-disable multiline-ternary */
    const type = typeof input !== 'object' ? typeof input
      : typeof input.constructor === 'function' ? input.constructor.name
        : 'object'

    assert.equal(
      UserClassImpl.valid(input),
      expected,
      `should be ${valid} for ${type} "${JSON.stringify(input)}"`,
    )
  }
})

test('validationMixin() type guard', async _t => {
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
    assert.ok(validType, 'should be type `UserClass`')
  } else {
    const stringType: AssertEqual<
      typeof obj,
      string
    > = true
    assert.ok(stringType, 'should be type `string`')
  }
})
