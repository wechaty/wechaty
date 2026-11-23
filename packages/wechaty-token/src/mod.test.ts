/**
 * Checks the public entry point: everything `mod.ts` documents is exported.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  cmds,
  VERSION,
  WechatyResolver,
  WechatyToken,
} from './mod.ts'

test('mod exports the token, the resolver, the CLI commands, and VERSION', () => {
  assert.equal(typeof WechatyToken, 'function')
  assert.equal(typeof WechatyResolver.setup, 'function')
  assert.deepEqual(Object.keys(cmds).sort(), [ 'discover', 'generate' ])
  assert.equal(typeof VERSION, 'string')
})
