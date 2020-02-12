#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { PuppetHostieGrpc } from './puppet-client'

test('version()', async (t) => {
  const puppet = new PuppetHostieGrpc({
    token: 'test',
  })
  t.ok(puppet.version())
})
