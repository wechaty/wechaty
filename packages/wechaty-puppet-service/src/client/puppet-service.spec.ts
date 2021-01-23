#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { PuppetService } from './puppet-service'

test('version()', async (t) => {
  const puppet = new PuppetService({
    token: 'test',
  })
  t.ok(puppet.version())
})

/**
 * Huan(202003):
 *  need to setup a test server to provide test token for Puppet Service
 */
test.skip('PuppetService restart without problem', async (t) => {
  const puppet = new PuppetService()
  try {
    for (let i = 0; i < 3; i++) {
      await puppet.start()
      await puppet.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('PuppetService() start/restart successed.')
  } catch (e) {
    t.fail(e)
  }
})
