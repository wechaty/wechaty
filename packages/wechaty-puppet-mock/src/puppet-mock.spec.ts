#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import { PuppetMock } from './puppet-mock'

class PuppetMockTest extends PuppetMock {
}

test('PuppetMock perfect restart testing', async (t) => {
  const puppet = new PuppetMockTest()
  try {
    for (let i = 0; i < 3; i++) {
      await puppet.start()
      await puppet.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('PuppetMock() perfect restart pass.')
  } catch (e) {
    t.fail(e)
  }
})
