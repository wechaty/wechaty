/**
 * Unit tests for `puppet-skeleton.ts`.
 */
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { GError }       from 'gerror'

import type {
  PuppetSkeletonProtectedProperty,
}                             from './puppet-skeleton.ts'
import {
  PuppetSkeleton,
}                             from './puppet-skeleton.ts'

test('ProtectedPropertySkeleton', async _t => {
  type NotExistInMixin = Exclude<PuppetSkeletonProtectedProperty, keyof PuppetSkeleton>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('emit(error, ...) with GError', async _t => {
  class PuppetSkeletonImpl extends PuppetSkeleton {}

  const puppet = new PuppetSkeletonImpl()

  const FIXTURES = [
    undefined,
    null,
    true,
    false,
    0,
    1,
    '',
    'foo',
    [],
    [ 1 ],
    {},
    { foo: 'bar' },
    new Error(),
    new Error('foo'),
    GError.from(new Error('test')),
  ]

  let payload: any
  puppet.on('error', (...args: any[]) => {
    payload = args[0]
  })

  for (const data of FIXTURES) {
    puppet.emit('error', data)
    await Promise.resolve()
    assert.equal(typeof payload.gerror, 'string', `should be an error payload for ${typeof data} "${JSON.stringify(data)}"`)
    assert.doesNotThrow(() => GError.fromJSON(payload.gerror), 'should be successfully deserialized to GError')
  }
})

test('wrapAsync() promise', async _t => {
  class PuppetSkeletonImpl extends PuppetSkeleton {}
  const puppet = new PuppetSkeletonImpl()

  const spy = mock.fn()
  puppet.on('error', spy)

  const DATA = 'test'
  const promise = Promise.resolve(DATA)
  const wrappedPromise = puppet.wrapAsync(promise)
  assert.equal(await wrappedPromise, undefined, 'should resolve Promise<any> to void')

  const rejection = Promise.reject(new Error('test'))
  const wrappedRejection = puppet.wrapAsync(rejection)
  assert.equal(wrappedRejection, undefined, 'should be void and not to reject')

  assert.equal(spy.mock.callCount(), 0, 'should have no error before sleep')
  await new Promise(resolve => setImmediate(resolve)) // wait async event loop task to be executed
  assert.equal(spy.mock.callCount(), 1, 'should emit error when promise reject with error')
})
