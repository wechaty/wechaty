#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import * as IMPL  from './impl.js'

test('Export of the Framework', async t => {
  t.ok(IMPL.ContactImpl,    'should export Contact')
  t.ok(IMPL.FriendshipImpl, 'should export Friendship')
  t.ok(IMPL.MessageImpl,    'should export Message')
  t.ok(IMPL.RoomImpl,       'should export Room')
  t.ok(IMPL.WechatyImpl,    'should export Wechaty')
})
