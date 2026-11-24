/**
 * Browser adapter bridging `node:assert/strict` to Chai's assertion implementation.
 *
 * This module provides a strict, drop-in replacement for Node's `node:assert/strict` and `node:assert`
 * module namespaces when executing unit tests inside web browser contexts.
 * All equality assertions enforce strict semantics (=== and strict deep equality).
 */
import { assert as chaiAssert } from 'chai'

/**
 * Asserts that value is truthy, conforming to node:assert `ok`.
 */
export const ok = (value: unknown, message?: string | Error): void =>
  chaiAssert.ok(value, typeof message === 'string' ? message : message?.message)

/**
 * Asserts strict equality (===) between actual and expected.
 */
export const strictEqual = (actual: unknown, expected: unknown, message?: string | Error): void =>
  chaiAssert.strictEqual(actual, expected, typeof message === 'string' ? message : message?.message)

/**
 * Asserts strict inequality (!==) between actual and expected.
 */
export const notStrictEqual = (actual: unknown, expected: unknown, message?: string | Error): void =>
  chaiAssert.notStrictEqual(actual, expected, typeof message === 'string' ? message : message?.message)

/**
 * Asserts strict deep equality between actual and expected.
 */
export const deepStrictEqual = (actual: unknown, expected: unknown, message?: string | Error): void =>
  chaiAssert.deepStrictEqual(actual, expected, typeof message === 'string' ? message : message?.message)

/**
 * Asserts strict deep inequality between actual and expected.
 */
export const notDeepStrictEqual = (actual: unknown, expected: unknown, message?: string | Error): void =>
  chaiAssert.notDeepEqual(actual, expected, typeof message === 'string' ? message : message?.message)

/**
 * In node:assert/strict, `equal` is an alias for `strictEqual`.
 */
export const equal = strictEqual

/**
 * In node:assert/strict, `notEqual` is an alias for `notStrictEqual`.
 */
export const notEqual = notStrictEqual

/**
 * In node:assert/strict, `deepEqual` is an alias for `deepStrictEqual`.
 */
export const deepEqual = deepStrictEqual

/**
 * In node:assert/strict, `notDeepEqual` is an alias for `notDeepStrictEqual`.
 */
export const notDeepEqual = notDeepStrictEqual

/**
 * Internal validator matching an error against expected error descriptors.
 */
function validateExpectedError (
  thrownError: unknown,
  expected: RegExp | ((err: unknown) => boolean) | Record<string, unknown> | Function,
  assertionMessage?: string,
): void {
  if (expected instanceof RegExp) {
    const msg = thrownError instanceof Error ? thrownError.message : String(thrownError)
    chaiAssert.match(msg, expected, assertionMessage)
  } else if (typeof expected === 'function') {
    if ((expected as any).prototype instanceof Error || expected === Error) {
      chaiAssert.instanceOf(thrownError, expected as any, assertionMessage)
    } else {
      chaiAssert.ok((expected as (err: unknown) => boolean)(thrownError), assertionMessage)
    }
  } else if (typeof expected === 'object' && expected !== null) {
    for (const [key, val] of Object.entries(expected)) {
      if (val instanceof RegExp) {
        chaiAssert.match(String((thrownError as any)?.[key]), val, assertionMessage)
      } else {
        chaiAssert.deepStrictEqual((thrownError as any)?.[key], val, assertionMessage)
      }
    }
  }
}

/**
 * Asserts that a synchronous function throws an expected error, conforming to node:assert semantics.
 */
export const throws = (
  fn: () => unknown,
  expectedOrMessage?: RegExp | ((err: unknown) => boolean) | string | Record<string, unknown> | Function,
  message?: string,
): void => {
  let threw = false
  let thrownError: unknown

  try {
    fn()
  } catch (err) {
    threw = true
    thrownError = err
  }

  let expected: RegExp | ((err: unknown) => boolean) | Record<string, unknown> | Function | undefined
  let assertionMessage: string | undefined

  if (typeof expectedOrMessage === 'string') {
    assertionMessage = expectedOrMessage
  } else {
    expected = expectedOrMessage
    assertionMessage = message
  }

  if (!threw) {
    chaiAssert.fail(assertionMessage || 'Expected function to throw')
  }

  if (expected) {
    validateExpectedError(thrownError, expected, assertionMessage)
  }
}

/**
 * Asserts that a function does not throw an error, conforming to node:assert semantics.
 */
export const doesNotThrow = (
  fn: () => unknown,
  expectedOrMessage?: RegExp | ((err: unknown) => boolean) | string,
  message?: string,
): void => {
  let threw = false
  let thrownError: unknown

  try {
    fn()
  } catch (err) {
    threw = true
    thrownError = err
  }

  const assertionMessage = typeof expectedOrMessage === 'string' ? expectedOrMessage : message

  if (threw) {
    const errMsg = thrownError instanceof Error ? thrownError.message : String(thrownError)
    chaiAssert.fail(assertionMessage ? `${assertionMessage}: ${errMsg}` : `Expected function not to throw, but got ${errMsg}`)
  }
}

/**
 * Awaits a promise or asynchronous function and asserts that it rejects with an expected error.
 */
export const rejects = async (
  asyncFn: Promise<unknown> | (() => Promise<unknown>),
  expectedOrMessage?: RegExp | ((err: unknown) => boolean) | string | Record<string, unknown> | Function,
  message?: string,
): Promise<void> => {
  let threw = false
  let thrownError: unknown

  try {
    const promise = typeof asyncFn === 'function' ? asyncFn() : asyncFn
    await promise
  } catch (err) {
    threw = true
    thrownError = err
  }

  let expected: RegExp | ((err: unknown) => boolean) | Record<string, unknown> | Function | undefined
  let assertionMessage: string | undefined

  if (typeof expectedOrMessage === 'string') {
    assertionMessage = expectedOrMessage
  } else {
    expected = expectedOrMessage
    assertionMessage = message
  }

  if (!threw) {
    chaiAssert.fail(assertionMessage || 'Expected promise to reject')
  }

  if (expected) {
    validateExpectedError(thrownError, expected, assertionMessage)
  }
}

/**
 * Awaits a promise or asynchronous function and asserts that it does not reject.
 */
export const doesNotReject = async (
  asyncFn: Promise<unknown> | (() => Promise<unknown>),
  message?: string,
): Promise<void> => {
  let threw = false
  let thrownError: unknown

  try {
    const promise = typeof asyncFn === 'function' ? asyncFn() : asyncFn
    await promise
  } catch (err) {
    threw = true
    thrownError = err
  }

  if (threw) {
    const errMsg = thrownError instanceof Error ? thrownError.message : String(thrownError)
    chaiAssert.fail(message ? `${message}: ${errMsg}` : `Expected promise not to reject, but got ${errMsg}`)
  }
}

/**
 * Throws an assertion failure with an optional message.
 */
export const fail = (message?: string | Error): never =>
  chaiAssert.fail(typeof message === 'string' ? message : message?.message || 'Failed')

/**
 * Asserts that actual matches the given RegExp pattern.
 */
export const match = (actual: string, regexp: RegExp, message?: string | Error): void =>
  chaiAssert.match(actual, regexp, typeof message === 'string' ? message : message?.message)

/**
 * Asserts that err is falsy, throwing it if truthy.
 */
export const ifError = (err: unknown): void =>
  chaiAssert.ifError(err)

/**
 * Strict assert callable function and object namespace.
 */
const strictAssert = Object.assign(
  function (value: unknown, message?: string | Error): void {
    ok(value, message)
  },
  {
    deepEqual,
    deepStrictEqual,
    doesNotReject,
    doesNotThrow,
    equal,
    fail,
    ifError,
    match,
    notDeepEqual,
    notDeepStrictEqual,
    notEqual,
    notStrictEqual,
    ok,
    rejects,
    strictEqual,
    throws,
  },
)

export default strictAssert
