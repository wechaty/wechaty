#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { CacheAgent } from './cache-agent.js'

test('CacheAgent roomMemberId() restart', async t => {
  const payloadCache = new CacheAgent()
  const roomMemberId = payloadCache.roomMemberId('roomId', 'userId')
  t.equal(roomMemberId, 'roomId-userId', 'should get right id')
})
