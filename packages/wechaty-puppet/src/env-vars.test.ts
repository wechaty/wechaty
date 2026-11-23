/**
 * Unit tests for `env-vars.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { getNumberEnv } from './env-vars.ts'

test('getNumberEnv() no env', async _t => {
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
    assert.equal(getNumberEnv(env)(KEY, DEFAULT_VALUE), value, `should get ${value} from "${JSON.stringify(env)}"`)
  }
})
