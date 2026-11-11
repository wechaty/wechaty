#!/usr/bin/env node

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { packageJson } from './package-json.ts'

test('Make sure the packageJson is fresh in source code', async _t => {
  const json = JSON.parse(JSON.stringify(packageJson))
  /**
   * Delete test data (keys), which will
   *  be overwrite
   *    by the real data before deploy
   */
  delete json['wechaty']

  const keyNum = Object.keys(json).length
  assert.equal(keyNum, 0, 'packageJson should be empty in source code, only updated before publish to NPM')
})
