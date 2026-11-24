/** Tests the process environment adapter used for native provider selection. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { config } from './config.ts'

test('systemPuppetName ()', async _t => {
  const WECHATY_PUPPET_ORIG = process.env['WECHATY_PUPPET']

  delete process.env['WECHATY_PUPPET']
  assert.equal(config.systemPuppetName(), undefined, 'should have no default puppet')

  process.env['WECHATY_PUPPET'] = 'wechaty-puppet-mock'
  assert.equal(config.systemPuppetName(), 'wechaty-puppet-mock', 'should get puppet name from process.env')

  // Restore the original value; assigning `undefined` would store the string "undefined".
  if (WECHATY_PUPPET_ORIG === undefined) {
    delete process.env['WECHATY_PUPPET']
  } else {
    process.env['WECHATY_PUPPET'] = WECHATY_PUPPET_ORIG
  }
})
