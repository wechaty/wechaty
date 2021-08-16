#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { PayloadStore } from './payload-store'

test('PayloadStore perfect restart', async t => {
  const token = Math.random().toString(36)
  const store = new PayloadStore({ token })

  for (let i = 0; i < 3; i++) {
    await store.start()
    await store.stop()
    t.pass('start/stop-ed at #' + i)
  }

  await store.destroy()
})
