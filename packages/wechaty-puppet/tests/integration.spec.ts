#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
// @ts-check

import { test }  from 'tstest'

import { PuppetTestImpl } from './fixtures/puppet-test/puppet-test.js'

test('Integration testing', async t => {

  const puppet = new PuppetTestImpl()

  t.ok(puppet, 'tbw')
})
