#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}           from 'tstest'

import {
  wrapAsyncError,
}                             from './wrap-async-error.js'

test('wrapAsyncError() smoke testing', async t => {
  const spy = sinon.spy()

  const wrapAsync = wrapAsyncError(spy)

  const DATA = 'test'
  const promise = Promise.resolve(DATA)
  const wrappedPromise = wrapAsync(promise)
  t.equal(await wrappedPromise, undefined, 'should resolve Promise<any> to void')

  const rejection = Promise.reject(new Error('test'))
  const wrappedRejection = wrapAsync(rejection)
  t.equal(wrappedRejection, undefined, 'should be void and not to reject')

  t.equal(spy.callCount, 0, 'should have no error before sleep')
  await new Promise(resolve => setImmediate(resolve)) // wait async event loop task to be executed
  t.equal(spy.callCount, 1, 'should emit error when promise reject with error')
})
