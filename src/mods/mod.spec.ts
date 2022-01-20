#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import * as WECHATY from './mod.js'

test('Export of the Framework', async t => {
  t.ok(WECHATY.impls,     'should export impls.*')
  t.ok(WECHATY.types,     'should export types.*')
  t.ok(WECHATY.IoClient,  'should export IoClient')
  t.ok(WECHATY.log,       'should export log')
})

test('Config setting', async t => {
  t.ok(WECHATY.config, 'should export Config')
  // t.ok(config.default.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
})
