#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}           from 'tstest'
import { GError }       from 'gerror'

import type {
  PuppetSkeletonProtectedProperty,
}                             from './puppet-skeleton.js'
import {
  PuppetSkeleton,
}                             from './puppet-skeleton.js'

test('ProtectedPropertySkeleton', async t => {
  type NotExistInMixin = Exclude<PuppetSkeletonProtectedProperty, keyof PuppetSkeleton>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('emit(error, ...) with GError', async t => {
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
    [1],
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
    t.equal(typeof payload.gerror, 'string', `should be an error payload for ${typeof data} "${JSON.stringify(data)}"`)
    t.doesNotThrow(() => GError.fromJSON(payload.gerror), 'should be successfully deserialized to GError')
  }
})

test('wrapAsync() promise', async t => {
  class PuppetSkeletonImpl extends PuppetSkeleton {}
  const puppet = new PuppetSkeletonImpl()

  const spy = sinon.spy()
  puppet.on('error', spy)

  const DATA = 'test'
  const promise = Promise.resolve(DATA)
  const wrappedPromise = puppet.wrapAsync(promise)
  t.equal(await wrappedPromise, undefined, 'should resolve Promise<any> to void')

  const rejection = Promise.reject(new Error('test'))
  const wrappedRejection = puppet.wrapAsync(rejection)
  t.equal(wrappedRejection, undefined, 'should be void and not to reject')

  t.equal(spy.callCount, 0, 'should have no error before sleep')
  await new Promise(resolve => setImmediate(resolve)) // wait async event loop task to be executed
  t.equal(spy.callCount, 1, 'should emit error when promise reject with error')
})
