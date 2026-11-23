#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import { getNumberEnv } from './env-vars.js'

test('getNumberEnv() no env', async t => {
  const DEFAULT_VALUE = 42
  const SET_VALUE = 17
  const KEY = 'TEST_NUMBER'

  const FIXTURE = [
    {
      env: {},
      value: DEFAULT_VALUE,
    },
    {
      env: {
        [KEY]: String(SET_VALUE),
      },
      value: SET_VALUE,
    },
    {
      env: {
        [KEY]: `xxx${SET_VALUE}xxx`,
      },
      value: DEFAULT_VALUE,
    },
  ]

  for (const { env, value } of FIXTURE) {
    t.equal(getNumberEnv(env)(KEY, DEFAULT_VALUE), value, `should get ${value} from "${JSON.stringify(env)}"`)
  }
})
