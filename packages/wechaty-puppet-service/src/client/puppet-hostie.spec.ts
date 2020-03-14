#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { PuppetHostie } from './puppet-hostie'

test('version()', async (t) => {
  const puppet = new PuppetHostie({
    token: 'test',
  })
  t.ok(puppet.version())
})
