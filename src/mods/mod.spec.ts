#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import {
  config,
  impl,
  log,
  IoClient,
}           from './mod.js'

test('Export of the Framework', async t => {
  t.ok(impl,      'should export impl.*')
  t.ok(IoClient,  'should export IoClient')
  t.ok(log,       'should export log')
})

test('Config setting', async t => {
  t.ok(config, 'should export Config')
  // t.ok(config.default.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
})
