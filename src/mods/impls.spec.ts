#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import * as impls  from './impls.js'

test('Export of the Framework', async t => {
  t.ok(impls.ContactImpl,    'should export Contact')
  t.ok(impls.FriendshipImpl, 'should export Friendship')
  t.ok(impls.MessageImpl,    'should export Message')
  t.ok(impls.RoomImpl,       'should export Room')
  t.ok(impls.WechatyImpl,    'should export Wechaty')
})
