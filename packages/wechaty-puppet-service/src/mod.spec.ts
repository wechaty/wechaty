#!/usr/bin/env ts-node

import { test }  from 'tstest'

import * as mod from './mod'

test('default export', async (t) => {
  t.ok(mod.default, 'should export a default, which is required from PuppetManager of Wechaty')
})
