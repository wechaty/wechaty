/**
 * Browser adapter bridging `node:assert/strict` to Chai's strict assert implementation.
 *
 * This module provides a drop-in replacement for Node's `node:assert/strict` and `node:assert`
 * module namespaces when executing unit tests inside web browser contexts.
 */
import { assert } from 'chai'

/**
 * Asserts shallow, coercive equality between actual and expected.
 */
export const equal = (...args: Parameters<typeof assert.equal>): ReturnType<typeof assert.equal> =>
  assert.equal(...args)

/**
 * Asserts strict equality (===) between actual and expected.
 */
export const strictEqual = (...args: Parameters<typeof assert.strictEqual>): ReturnType<typeof assert.strictEqual> =>
  assert.strictEqual(...args)

/**
 * Asserts shallow, coercive inequality between actual and expected.
 */
export const notEqual = (...args: Parameters<typeof assert.notEqual>): ReturnType<typeof assert.notEqual> =>
  assert.notEqual(...args)

/**
 * Asserts strict inequality (!==) between actual and expected.
 */
export const notStrictEqual = (...args: Parameters<typeof assert.notStrictEqual>): ReturnType<typeof assert.notStrictEqual> =>
  assert.notStrictEqual(...args)

/**
 * Asserts deep equality between actual and expected.
 */
export const deepEqual = (...args: Parameters<typeof assert.deepEqual>): ReturnType<typeof assert.deepEqual> =>
  assert.deepEqual(...args)

/**
 * Asserts strict deep equality between actual and expected.
 */
export const deepStrictEqual = (...args: Parameters<typeof assert.deepStrictEqual>): ReturnType<typeof assert.deepStrictEqual> =>
  assert.deepStrictEqual(...args)

/**
 * Asserts deep inequality between actual and expected.
 */
export const notDeepEqual = (...args: Parameters<typeof assert.notDeepEqual>): ReturnType<typeof assert.notDeepEqual> =>
  assert.notDeepEqual(...args)

/**
 * Asserts strict deep inequality between actual and expected.
 */
export const notDeepStrictEqual = (...args: Parameters<typeof assert.notDeepStrictEqual>): ReturnType<typeof assert.notDeepStrictEqual> =>
  assert.notDeepStrictEqual(...args)

/**
 * Asserts that value is truthy.
 */
export const ok = (...args: Parameters<typeof assert.ok>): ReturnType<typeof assert.ok> =>
  assert.ok(...args)

/**
 * Asserts that a function throws an expected error, conforming to node:assert semantics.
 */
export const throws = (
  fn: () => unknown,
  expectedOrMessage?: RegExp | ((err: unknown) => boolean) | string | Record<string, unknown>,
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

  let expected: RegExp | ((err: unknown) => boolean) | Record<string, unknown> | undefined
  let assertionMessage: string | undefined

  if (typeof expectedOrMessage === 'string') {
    assertionMessage = expectedOrMessage
  } else {
    expected = expectedOrMessage
    assertionMessage = message
  }

  if (!threw) {
    assert.fail(assertionMessage || 'Expected function to throw')
  }

  if (expected) {
    if (expected instanceof RegExp) {
      assert.match(String((thrownError as any)?.message || thrownError), expected, assertionMessage)
    } else if (typeof expected === 'function') {
      if ((expected as any).prototype instanceof Error || expected === Error) {
        assert.instanceOf(thrownError, expected as any, assertionMessage)
      } else {
        assert.ok((expected as (err: unknown) => boolean)(thrownError), assertionMessage)
      }
    }
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
    assert.fail(assertionMessage ? `${assertionMessage}: ${errMsg}` : `Expected function not to throw, but got ${errMsg}`)
  }
}

/**
 * Awaits a promise and asserts that it rejects with an expected error.
 */
export const rejects = (...args: Parameters<typeof assert.rejects>): ReturnType<typeof assert.rejects> =>
  assert.rejects(...args)

/**
 * Awaits a promise and asserts that it does not reject.
 */
export const doesNotReject = (...args: Parameters<typeof assert.doesNotReject>): ReturnType<typeof assert.doesNotReject> =>
  assert.doesNotReject(...args)

/**
 * Throws an assertion failure with an optional message.
 */
export const fail = (...args: Parameters<typeof assert.fail>): ReturnType<typeof assert.fail> =>
  assert.fail(...args)

/**
 * Asserts that actual matches the given RegExp pattern.
 */
export const match = (...args: Parameters<typeof assert.match>): ReturnType<typeof assert.match> =>
  assert.match(...args)

/**
 * Asserts that err is falsy, throwing it if truthy.
 */
export const ifError = (...args: Parameters<typeof assert.ifError>): ReturnType<typeof assert.ifError> =>
  assert.ifError(...args)

// Ensure default export shares the node:assert semantics for throws & doesNotThrow
;(assert as any).throws = throws
;(assert as any).doesNotThrow = doesNotThrow

/**
 * Default export representing the full assert function and namespace.
 */
export default assert
