#!/usr/bin/env node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import { packageJson } from './package-json.js'

test('Make sure the packageJson is fresh in source code', async t => {
  const keyNum = Object.keys(packageJson).length
  t.equal(keyNum, 0, 'packageJson should be empty in source code, only updated before publish to NPM')
})
