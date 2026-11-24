#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import * as mod from './mod.js'

test('default export', async t => {
  t.equal(typeof mod.default, 'function', 'should export Puppet class as default, which is required from PuppetManager of Wechaty')
})
