/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 * Tests for the lifecycle error types (D13, README §Errors): stable codes and
 * names, preserved `cause`, the class hierarchy, and `isLifecycleError`
 * recognizing errors from another installed copy of the module by shape.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  isLifecycleError,
  LifecycleChildFailureError,
  LifecycleError,
  LifecycleOverrideError,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
}                           from './errors.ts'
import type { LifecycleErrorCode } from './errors.ts'
import * as mod from './mod.ts'

const cause = new Error('root cause')

const CASES: ReadonlyArray<readonly [ string, LifecycleErrorCode, () => LifecycleError ]> = [
  [ 'LifecycleSupersededError', 'ERR_LIFECYCLE_SUPERSEDED', () => new LifecycleSupersededError('superseded', { cause }) ],
  [ 'LifecycleTimeoutError', 'ERR_LIFECYCLE_TIMEOUT', () => new LifecycleTimeoutError('stop', 1500, { cause }) ],
  [ 'LifecycleUnsafeStateError', 'ERR_LIFECYCLE_UNSAFE_STATE', () => new LifecycleUnsafeStateError('unsafe', { cause }) ],
  [ 'LifecycleChildFailureError', 'ERR_LIFECYCLE_CHILD_FAILURE', () => new LifecycleChildFailureError('child failed', { cause }) ],
  [ 'LifecycleOverrideError', 'ERR_LIFECYCLE_OVERRIDE', () => new LifecycleOverrideError('start', { cause }) ],
]

for (const [ name, code, make ] of CASES) {
  test(`${name} has code ${code}, its own name, and keeps its cause`, () => {
    const error = make()
    assert.equal(error.code, code)
    assert.equal(error.name, name)
    assert.equal(error.cause, cause)
    assert.ok(error instanceof LifecycleError)
    assert.ok(error instanceof Error)
    assert.match(String(error.stack), new RegExp(`^${name}`))
  })

  test(`isLifecycleError recognizes ${name} with and without its code`, () => {
    const error = make()
    assert.equal(isLifecycleError(error), true)
    assert.equal(isLifecycleError(error, code), true)
    const other = CASES.find(([ , otherCode ]) => otherCode !== code)![1]
    assert.equal(isLifecycleError(error, other), false)
  })
}

test('default messages describe the error without extra arguments', () => {
  assert.match(new LifecycleSupersededError().message, /superseded/)
  assert.match(new LifecycleChildFailureError().message, /child/)
})

test('LifecycleTimeoutError reports which deadline expired and its length', () => {
  const error = new LifecycleTimeoutError('start', 250)
  assert.equal(error.phase, 'start')
  assert.equal(error.timeoutMs, 250)
  assert.match(error.message, /start.*250 ms/)
})

test('LifecycleOverrideError names the overridden member', () => {
  const error = new LifecycleOverrideError('restart')
  assert.equal(error.member, 'restart')
  assert.match(error.message, /"restart"/)
})

test('isLifecycleError recognizes an error from another copy of the module by its code', () => {
  // Another installed copy has its own classes, so instanceof fails, but the code is the same.
  class ForeignError extends Error {
    readonly code = 'ERR_LIFECYCLE_SUPERSEDED'
  }
  const foreign = new ForeignError('from another copy')
  assert.equal(foreign instanceof LifecycleError, false)
  assert.equal(isLifecycleError(foreign), true)
  assert.equal(isLifecycleError(foreign, 'ERR_LIFECYCLE_SUPERSEDED'), true)
  assert.equal(isLifecycleError(foreign, 'ERR_LIFECYCLE_TIMEOUT'), false)
})

test('isLifecycleError rejects values that are not lifecycle errors', () => {
  const unrelated = Object.assign(new Error('fs'), { code: 'ENOENT' })
  for (const value of [ undefined, null, 0, '', 'ERR_LIFECYCLE_TIMEOUT', new Error('plain'), unrelated, { code: 42 } ]) {
    assert.equal(isLifecycleError(value), false, `expected false for ${String(value)}`)
  }
})

test('isLifecycleError rejects a plain object that only carries a lifecycle code', () => {
  // The guard narrows to an Error shape, so `message` must really exist.
  assert.equal(isLifecycleError({ code: 'ERR_LIFECYCLE_TIMEOUT' }), false)
  assert.equal(isLifecycleError({ code: 'ERR_LIFECYCLE_TIMEOUT', name: 'X' }), false)
  assert.equal(isLifecycleError({ code: 'ERR_LIFECYCLE_TIMEOUT', name: 'X', message: 'm' }), true)
})

test('the module entry point exports the errors and the guard', () => {
  assert.equal(mod.LifecycleSupersededError, LifecycleSupersededError)
  assert.equal(mod.isLifecycleError, isLifecycleError)
  assert.equal(typeof mod.LifecycleError, 'function')
})
