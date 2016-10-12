import { test } from 'ava'
// import { log }  from '../'

import { spy } from 'sinon'

test('Node.js function params destructuring behaviour test', t => {
  const DEFAULT_N = 1
  const DEFAULT_S = 't'

  const paramSpy = spy()
  function paramTest({
    n   = DEFAULT_N
    , s = DEFAULT_S
  } = {}) {
    paramSpy(n, s)
  }

  paramSpy.reset()
  paramTest()
  t.deepEqual(paramSpy.args[0], [DEFAULT_N, DEFAULT_S], 'should be equal to default args')

  paramSpy.reset()
  paramTest({n: 42})
  t.deepEqual(paramSpy.args[0], [42, DEFAULT_S], 'should be equal to default s args')

  paramSpy.reset()
  paramTest({s: 'life'})
  t.deepEqual(paramSpy.args[0], [DEFAULT_N, 'life'], 'should be equal to default n args')
})
