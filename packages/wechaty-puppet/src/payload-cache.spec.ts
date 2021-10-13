#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { PayloadCache } from './payload-cache.js'

test('PayloadCache roomMemberId() restart', async t => {
  const payloadCache = new PayloadCache()
  const roomMemberId = payloadCache.roomMemberId('roomId', 'userId')
  t.equal(roomMemberId, 'roomId-userId', 'should get right id')
})
