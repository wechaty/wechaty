#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import { packageJson } from './package-json.js'

test('Make sure the packageJson is fresh in source code', async t => {
  const json = JSON.parse(JSON.stringify(packageJson))
  /**
   * Delete test data (keys), which will
   *  be overwrite
   *    by the real data before deploy
   */
  delete json['wechaty']

  const keyNum = Object.keys(json).length
  t.equal(keyNum, 0, 'packageJson should be empty in source code, only updated before publish to NPM')
})
