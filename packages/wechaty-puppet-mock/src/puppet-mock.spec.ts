#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import { MemoryCard } from 'memory-card'

import { PuppetMock } from './puppet-mock'

class PuppetMockTest extends PuppetMock {
}

test('PuppetMock restart without problem', async (t) => {
  const puppet = new PuppetMockTest({
    memory   : new MemoryCard(),
  })
  try {
    for (let i = 0; i < 3; i++) {
      await puppet.start()
      await puppet.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('PuppetMock() start/restart successed.')
  } catch (e) {
    t.fail(e)
  }
})
