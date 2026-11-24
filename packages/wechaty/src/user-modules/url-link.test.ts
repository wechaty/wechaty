#!/usr/bin/env node
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Wechaty } from '../mods/mod.ts'
import { MessageImpl } from './message.ts'

import { wechatifyUserModule } from './mod.ts'
import { UrlLinkImpl } from './url-link.ts'

const wechaty = {
  puppet: {} as any,
} as any as Wechaty

const UrlLinkTest = wechatifyUserModule(UrlLinkImpl)(wechaty)

test('UrlLink.valid()', async _t => {
  const urlLink = new UrlLinkTest({} as any)
  assert.ok(UrlLinkImpl.valid(urlLink), 'should pass the validation of UrlLinkImpl')
  assert.ok(!MessageImpl.valid(urlLink), 'should not pass the validation of MessageImpl')
})
