/**
 * Unit tests for `PayloadStore`: repeated start and stop, that `stop()` and
 * `start()` wait for a backend storage close already in flight, and that a `stop()`
 * cancels a `start()` whose open has not run yet.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import { test } from 'node:test'

import { useTempHome } from '../../tests/fixtures/temp-home.ts'
import { VERSION } from '../config.ts'

import { PayloadStore } from './payload-store.ts'

test('PayloadStore perfect restart', async t => {
  useTempHome(t)

  const token = Math.random().toString(36)
  const store = new PayloadStore({ token })

  for (let i = 0; i < 3; i++) {
    const accountId = Math.random().toString(36)
    await store.start(accountId)
    await store.stop()
    assert.ok(true, 'start/stop-ed at #' + i)
  }

  await store.destroy()
})

test('PayloadStore stop() waits for a close that an earlier stop() started', async t => {
  useTempHome(t)
  const store = new PayloadStore({ token: Math.random().toString(36) })
  await store.start('account')

  // Hold the contact store's close until the test releases it.
  let releaseClose!: () => void
  const closeGate = new Promise<void>(resolve => { releaseClose = resolve })
  const contact = store.contact!
  const close = contact.close.bind(contact)
  t.mock.method(contact, 'close', async () => {
    await closeGate
    await close()
  })

  // PuppetService stops the store from its unawaited `logout` listener, then
  // again from onStop(); the second call must not resolve first.
  const first = store.stop()
  let secondDone = false
  const second = store.stop().then(() => { secondDone = true })

  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(secondDone, false, 'should wait for the close in flight')

  releaseClose()
  await Promise.all([ first, second ])
  assert.equal(secondDone, true, 'should resolve once the close finished')

  await store.destroy()
})

test('PayloadStore start() reopens only after a pending close', async t => {
  useTempHome(t)
  const store = new PayloadStore({ token: Math.random().toString(36) })
  await store.start('account')

  let releaseClose!: () => void
  const closeGate = new Promise<void>(resolve => { releaseClose = resolve })
  const contact = store.contact!
  const close = contact.close.bind(contact)
  t.mock.method(contact, 'close', async () => {
    await closeGate
    await close()
  })

  // A logout immediately followed by a login of the same account.
  const stopped = store.stop()
  let started = false
  const restarted = store.start('account').then(() => { started = true })

  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(started, false, 'should not reopen the storage folders yet')

  releaseClose()
  await Promise.all([ stopped, restarted ])
  assert.equal(started, true, 'should reopen after the close')

  await store.stop()
  await store.destroy()
})

test('PayloadStore stop() right after start() leaves no store open', async t => {
  useTempHome(t)
  const store = new PayloadStore({ token: Math.random().toString(36) })

  // A login immediately followed by a logout, both from unawaited listeners.
  const started = store.start('account')
  await store.stop()
  await started
  assert.equal(store.contact, undefined, 'should not open the stores after stop() resolved')

  await store.start('account')
  assert.ok(store.contact, 'should start again')
  await store.stop()
  await store.destroy()
})

test('PayloadStore stop() cancels a start() that waits for a close', async t => {
  useTempHome(t)
  const store = new PayloadStore({ token: Math.random().toString(36) })
  await store.start('account')

  let releaseClose!: () => void
  const closeGate = new Promise<void>(resolve => { releaseClose = resolve })
  const contact = store.contact!
  const close = contact.close.bind(contact)
  t.mock.method(contact, 'close', async () => {
    await closeGate
    await close()
  })

  // Logout, login and logout again while the first close is still running.
  const firstStop = store.stop()
  const restarted = store.start('account')
  const secondStop = store.stop()

  releaseClose()
  await Promise.all([ firstStop, restarted, secondStop ])
  assert.equal(store.contact, undefined, 'should leave no store open after the last stop()')

  await store.destroy()
})

test('PayloadStore falls back to logical store prefix without homedir', async t => {
  if (typeof os?.homedir === 'function') {
    t.mock.method(os, 'homedir', () => '')
  }
  const token = 'test-token'
  class TestPayloadStore extends PayloadStore {

    getStoreDir () { return this.storeDir }

  }
  const store = new TestPayloadStore({ token })
  const [versionMajor = '0'] = VERSION.replace(/^v/, '').split('.')
  assert.equal(store.getStoreDir(), `wechaty-puppet-service-test-token-v${versionMajor}`)
})

test('PayloadStore destroy() cleans up storage on disk and IndexedDB', async (t) => {
  useTempHome(t)
  const token = `destroy-test-${Math.random().toString(36).slice(2)}`
  class TestPayloadStore extends PayloadStore {

    getStoreDir () { return this.storeDir }

}
  const store = new TestPayloadStore({ token })
  await store.start('acc1')
  await store.stop()

  const storeDir = store.getStoreDir()
  if (typeof fs?.existsSync === 'function' && typeof os?.homedir === 'function' && os.homedir()) {
    assert.equal(fs.existsSync(storeDir), true, 'storeDir should exist before destroy')
  }
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
    const dbsBefore = await indexedDB.databases()
    const hasDb = dbsBefore.some(db => db.name && db.name.includes(token))
    assert.equal(hasDb, true, 'IndexedDB database should exist before destroy')
  }

  await store.destroy()

  if (typeof fs?.existsSync === 'function' && typeof os?.homedir === 'function' && os.homedir()) {
    assert.equal(fs.existsSync(storeDir), false, 'storeDir should be removed after destroy')
  }
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
    const dbsAfter = await indexedDB.databases()
    const hasDb = dbsAfter.some(db => db.name && db.name.includes(token))
    assert.equal(hasDb, false, 'IndexedDB database should be removed after destroy')
  }
})

test('PayloadStore unstarted instance destroy() cleans up residual storage for token', async (t) => {
  useTempHome(t)
  const token = `unstarted-test-${Math.random().toString(36).slice(2)}`
  class TestPayloadStore extends PayloadStore {

    getStoreDir () { return this.storeDir }

}
  const originalStore = new TestPayloadStore({ token })
  await originalStore.start('acc2')
  await originalStore.stop()

  // Create fresh, unstarted instance and destroy
  const freshStore = new TestPayloadStore({ token })
  await freshStore.destroy()

  const storeDir = freshStore.getStoreDir()
  if (typeof fs?.existsSync === 'function' && typeof os?.homedir === 'function' && os.homedir()) {
    assert.equal(fs.existsSync(storeDir), false, 'storeDir should be removed by fresh instance destroy')
  }
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
    const dbsAfter = await indexedDB.databases()
    const hasDb = dbsAfter.some(db => db.name && db.name.includes(token))
    assert.equal(hasDb, false, 'IndexedDB databases should be removed by fresh instance destroy')
  }
})

