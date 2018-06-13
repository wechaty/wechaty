#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import { MemoryCard } from 'memory-card'

import { PadchatManager } from './padchat-manager'
import {
  WECHATY_PUPPET_PADCHAT_ENDPOINT,
}                                     from './config'

class PadchatManagerTest extends PadchatManager {
  public async initCache(token: string, selfId: string) {
    return super.initCache(
      token,
      selfId,
    )
  }
  public async releaseCache() {
    return super.releaseCache()
  }
}

test('smoke testing', async t => {
  t.skip('tbw')
})

test('PadchatManager() cache should be release and can be re-init again.', async t => {
  const manager = new PadchatManagerTest({
    memory   : new MemoryCard(),
    token    : 'mock token',
    endpoint : WECHATY_PUPPET_PADCHAT_ENDPOINT,
  })
  try {
    for (let i = 0; i < 3; i++) {
      await manager.initCache('fake-token', 'fake-self-id')
      await manager.releaseCache()
      t.pass('init/release-ed at #' + i)
    }
    t.pass('PadchatManager() cache init/release/init successed.')
  } catch (e) {
    t.fail(e)
  }
})

test('PadchatManager() should can be able to restart() many times for one instance', async t => {
  const manager = new PadchatManager({
    memory   : new MemoryCard(),
    token    : 'mock token',
    endpoint : WECHATY_PUPPET_PADCHAT_ENDPOINT,
  })
  try {
    for (let i = 0; i < 3; i++) {
      await manager.start()
      await manager.stop()
      t.pass('restarted at #' + i)
    }
    t.pass('PadchatManager() restart successed.')
  } catch (e) {
    console.error(e)
    t.fail(e)
  }
})
