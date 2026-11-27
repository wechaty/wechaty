/**
 * Unit tests for the environment variable readers.
 */
// tslint:disable:no-shadowed-variable
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { WECHATY_PUPPET_SERVICE_AUTHORITY } from './env-vars.ts'

test('WECHATY_PUPPET_SERVICE_AUTHORITY()', async t => {
  const EXPECTED_AUTHORITY = 'api.wechaty.io'
  const oldValue = process.env['WECHATY_PUPPET_SERVICE_AUTHORITY']
  t.after(() => {
    if (oldValue === undefined) {
      delete process.env['WECHATY_PUPPET_SERVICE_AUTHORITY']
    } else {
      process.env['WECHATY_PUPPET_SERVICE_AUTHORITY'] = oldValue
    }
  })
  process.env['WECHATY_PUPPET_SERVICE_AUTHORITY'] = EXPECTED_AUTHORITY

  assert.equal(WECHATY_PUPPET_SERVICE_AUTHORITY(), EXPECTED_AUTHORITY, 'should read authority from env')
  assert.equal(WECHATY_PUPPET_SERVICE_AUTHORITY('explicit.example.com'), 'explicit.example.com', 'should prefer explicit authority')
})
