#!/usr/bin/env ts-node

import { test }  from 'tstest'

import * as index from './index'

test('default export', async (t) => {
  t.ok(index.default, 'should export a default, which is required from PuppetManager of Wechaty')
})
