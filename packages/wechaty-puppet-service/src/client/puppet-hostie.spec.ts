#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { PuppetHostie } from './puppet-hostie'

test('version()', async (t) => {
  const puppet = new PuppetHostie({
    token: 'test',
  })
  t.ok(puppet.version())
})

/**
 * Huan(202003):
 *  need to setup a test server to provide test token for puppet hostie
 */
test.skip('PuppetHostie restart without problem', async (t) => {
  const puppet = new PuppetHostie()
  try {
    for (let i = 0; i < 3; i++) {
      await puppet.start()
      await puppet.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('PuppetHostie() start/restart successed.')
  } catch (e) {
    t.fail(e)
  }
})
