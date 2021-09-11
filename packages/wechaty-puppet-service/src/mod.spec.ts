#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import * as mod from './mod.js'

test('default export', async t => {
  t.ok(mod.default, 'should export a default, which is required from PuppetManager of Wechaty')
})
