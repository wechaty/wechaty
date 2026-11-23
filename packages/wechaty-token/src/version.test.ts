#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import { VERSION } from './version.js'

test('Make sure the VERSION is fresh in source code', async t => {
  t.equal(VERSION, '0.0.0', 'version should be 0.0.0 in source code, only updated before publish to NPM')
})
