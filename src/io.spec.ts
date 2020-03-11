#!/usr/bin/env ts-node

import test  from 'blue-tape'

import { Io }       from './io'
import { Wechaty }  from './wechaty'

test('Io restart without problem', async t => {
  const io = new Io({
    // token must not contain any white spaces
    token   : 'mock_token_in_wechaty/wechaty/src/io.spec.ts',
    wechaty : new Wechaty(),
  })

  try {
    for (let i = 0; i < 2; i++) {
      await io.start()
      await io.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('start/restart successed.')
  } catch (e) {
    t.fail(e)
  }
})
