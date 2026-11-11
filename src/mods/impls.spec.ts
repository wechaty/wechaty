#!/usr/bin/env node

import { test } from 'node:test'
import assert from 'node:assert/strict'

import * as impls  from './impls.ts'

test('Export of the Framework', async _t => {
  assert.ok(impls.ContactImpl,    'should export Contact')
  assert.ok(impls.FriendshipImpl, 'should export Friendship')
  assert.ok(impls.MessageImpl,    'should export Message')
  assert.ok(impls.RoomImpl,       'should export Room')
  assert.ok(impls.WechatyImpl,    'should export Wechaty')
})
