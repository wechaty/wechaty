#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { PuppetHostieServer } from './puppet-server'

test('version()', async (t) => {
  const puppet = new PuppetHostieServer()
  t.ok(puppet.version())
})
