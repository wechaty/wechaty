/**
 * Unit tests for the environment variable readers.
 */
// tslint:disable:no-shadowed-variable
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { WECHATY_PUPPET_SERVICE_AUTHORITY } from './env-vars.ts'

/**
 * Huan(202108): compatible with old env var
 *  See: https://github.com/wechaty/wechaty-puppet-service/issues/156
 *
 * This feature will be removed after Dec 31, 2022
 */
test('WECHATY_PUPPET_SERVICE_AUTHORITY()', async _t => {
  const EXPECTED_AUTHORITY = 'api.wechaty.io'
  const oldValue = process.env['WECHATY_SERVICE_DISCOVERY_ENDPOINT']
  process.env['WECHATY_SERVICE_DISCOVERY_ENDPOINT'] = `https://${EXPECTED_AUTHORITY}`

  const result = WECHATY_PUPPET_SERVICE_AUTHORITY()
  assert.equal(result, EXPECTED_AUTHORITY, 'should extract authority')

  process.env['WECHATY_SERVICE_DISCOVERY_ENDPOINT'] = oldValue
})
