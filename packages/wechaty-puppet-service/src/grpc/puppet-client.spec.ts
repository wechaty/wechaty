#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { PuppetHostie } from './puppet-hostie'

test('version()', async (t) => {
  const puppet = new PuppetHostie()
  t.ok(puppet.version())
})
