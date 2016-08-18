'use strict'

const sinon = require('sinon')
const test  = require('tape')

const log   = require('../src/npmlog-env')

test('Node.js function params destructuring behaviour test', function(t) {
  const DEFAULT_N = 1
  const DEFAULT_S = 't'

  const spy = sinon.spy()
  function paramTest({
    n   = DEFAULT_N
    , s = DEFAULT_S
  } = {}) {
    spy(n, s)
  }

  spy.reset()
  paramTest()
  t.deepEqual(spy.args[0], [DEFAULT_N, DEFAULT_S], 'should be equal to default args')

  spy.reset()
  paramTest({n: 42})
  t.deepEqual(spy.args[0], [42, DEFAULT_S], 'should be equal to default s args')

  spy.reset()
  paramTest({s: 'life'})
  t.deepEqual(spy.args[0], [DEFAULT_N, 'life'], 'should be equal to default n args')

  t.end()
})
