#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import { Io }       from './io'
import { Wechaty }  from './wechaty'

test('Io restart without problem', async t => {
  const io = new Io({
    token   : 'mock_token',
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
