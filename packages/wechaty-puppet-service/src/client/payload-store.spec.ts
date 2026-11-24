#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { PayloadStore } from './payload-store.js'

test('PayloadStore perfect restart', async t => {
  const token = Math.random().toString(36)
  const store = new PayloadStore({ token })

  for (let i = 0; i < 3; i++) {
    const accountId = Math.random().toString(36)
    await store.start(accountId)
    await store.stop()
    t.pass('start/stop-ed at #' + i)
  }

  await store.destroy()
})
