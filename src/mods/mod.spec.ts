#!/usr/bin/env -S node --import=tsx/esm

import { test } from 'node:test'
import assert from 'node:assert/strict'

import * as WECHATY from './mod.js'

test('Export of the Framework', async _t => {
  assert.ok(WECHATY.impls,     'should export impls.*')
  assert.ok(WECHATY.types,     'should export types.*')
  assert.ok(WECHATY.IoClient,  'should export IoClient')
  assert.ok(WECHATY.log,       'should export log')
})

test('Config setting', async _t => {
  assert.ok(WECHATY.config, 'should export Config')
  // assert.ok(config.default.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
})
