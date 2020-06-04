#!/usr/bin/env ts-node

import test  from 'tstest'

import { Mocker } from './mocker'
import { SimpleBehavior } from './behavior'

class MockerTest extends Mocker {
}

test('Mocker restart without problem', async (t) => {
  const mocker = new MockerTest()
  mocker.use(SimpleBehavior())
  mocker.puppet = {
    emit: (..._: any[]) => {},
  } as any

  try {
    for (let i = 0; i < 1; i++) {
      await mocker.start()
      await mocker.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('Mocker() start/restart successed.')
  } catch (e) {
    t.fail(e)
  }
})
