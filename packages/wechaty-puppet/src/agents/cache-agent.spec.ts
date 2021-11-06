#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { CacheAgent } from './cache-agent.js'

test('CacheAgent roomMemberId() restart', async t => {
  t.ok(CacheAgent, 'tbw')
})
