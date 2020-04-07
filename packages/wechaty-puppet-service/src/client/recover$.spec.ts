#!/usr/bin/env ts-node

import { test }  from 'tstest'

import {
  switchSuccess,
}                     from './recover$'

test('version()', async (t) => {
  const STATUS          = true
  const EXPECTED_RESULT = true

  t.equal(switchSuccess(STATUS), EXPECTED_RESULT, 'should get expected result')
})
