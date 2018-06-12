#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import { MemoryCard } from 'memory-card'

import { Bridge } from './bridge'
import {
  WECHATY_PUPPET_PADCHAT_ENDPOINT,
}                                     from './config'

class BridgeTest extends Bridge {
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

test('bridge cache should be release and can be re-init again.', async t => {
  const bridge = new BridgeTest({
    memory   : new MemoryCard(),
    token    : 'mock token',
    endpoint : WECHATY_PUPPET_PADCHAT_ENDPOINT,
  })
  try {
    await bridge.initCache('fake-token', 'fake-self-id')
    await bridge.releaseCache()
    await bridge.initCache('fake-token', 'fake-self-id')
    t.pass('bridge cache init/release/init successed.')
  } catch (e) {
    t.fail(e)
  }
})

test('bridge should can be restart() after a start()', async t => {
  const bridge = new Bridge({
    memory   : new MemoryCard(),
    token    : 'mock token',
    endpoint : WECHATY_PUPPET_PADCHAT_ENDPOINT,
  })
  try {
    await bridge.start()
    await bridge.stop()
    await bridge.start()
    t.pass('bridge start/restart successed.')
  } catch (e) {
    t.fail(e)
  }
})
