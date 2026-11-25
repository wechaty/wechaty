/**
 * Unit tests for `PayloadStore`: repeated start and stop, that `stop()` and
 * `start()` wait for a close already in flight, that a `stop()` cancels a
 * `start()` whose open has not run yet, that failures leave it usable, and
 * what persists and what `destroy()` removes. They run unchanged on LMDB
 * (Node.js, Deno) and IndexedDB (Chromium), so they observe storage only
 * through `PayloadStore`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type * as PUPPET from 'wechaty-puppet'

import { payloadStorage } from '#payload-storage'
import { FlashStore } from 'flash-store'

import { useTempHome } from '../../tests/fixtures/temp-home.ts'

import { PayloadStore } from './payload-store.ts'

const CONTACT = { id: 'id', name: 'name' } as PUPPET.payloads.Contact

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

test('PayloadStore stop() waits for every close when one of them fails', async t => {
  useTempHome(t)
  const store = new PayloadStore({ token: Math.random().toString(36) })
  await store.start('account')

  const contact = store.contact!
  const room    = store.room!
  const contactClose = contact.close.bind(contact)
  const roomClose    = room.close.bind(room)
  let roomClosed = false
  t.mock.method(contact, 'close', async () => {
    await contactClose()
    throw new Error('close failed')
  })
  t.mock.method(room, 'close', async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
    await roomClose()
    roomClosed = true
  })

  await assert.rejects(store.stop(), /close failed/)
  assert.equal(roomClosed, true, 'should not overtake the close of another store')

  await store.start('account')
  assert.ok(store.contact, 'should start again after a failed close')
  await store.stop()
  await store.destroy()
})

test('PayloadStore start() opens nothing when one store fails to open', async t => {
  useTempHome(t)
  const store = new PayloadStore({ token: Math.random().toString(36) })

  const close     = t.mock.method(FlashStore.prototype, 'close')
  const storePath = payloadStorage.storePath
  const failing   = t.mock.method(payloadStorage, 'storePath', (root: string, accountId: string, storeName: string) => {
    if (storeName === 'room-member-payload') {
      throw new Error('open failed')
    }
    return storePath(root, accountId, storeName)
  })

  await assert.rejects(store.start('account'), /open failed/)
  assert.equal(store.contact, undefined, 'should not keep the store that did open')
  assert.equal(close.mock.callCount(), 1, 'should close the store that did open')

  failing.mock.restore()
  await store.start('account')
  assert.ok(store.contact && store.roomMember && store.room, 'should start again without a stop()')
  await store.stop()
  await store.destroy()
})

test('PayloadStore keeps the payloads across instances, per account', async t => {
  useTempHome(t)
  const token = Math.random().toString(36)

  const writer = new PayloadStore({ token })
  await writer.start('account')
  await writer.contact!.set('id', CONTACT)
  await writer.stop()

  const reader = new PayloadStore({ token })
  await reader.start('account')
  assert.deepEqual(await reader.contact!.get('id'), CONTACT, 'should read what was stored before')
  await reader.stop()

  await reader.start('other-account')
  assert.equal(await reader.contact!.get('id'), undefined, 'should not read another account')
  await reader.stop()
  await reader.destroy()
})

test('PayloadStore destroy() removes all accounts of its own token only', async t => {
  useTempHome(t)
  // "//" and "/": a token is an opaque string, not a path. The neighbour's
  // name starts with the destroyed one's.
  const token     = `${Math.random().toString(36)}//x/y`
  const neighbour = `${token}-2`

  for (const each of [ token, neighbour ]) {
    const store = new PayloadStore({ token: each })
    for (const accountId of [ 'account-1', 'account-2' ]) {
      await store.start(accountId)
      await store.contact!.set('id', CONTACT)
      await store.stop()
    }
  }

  // An instance that never started still removes what others stored.
  await new PayloadStore({ token }).destroy()

  for (const [ each, expected ] of [ [ token, undefined ], [ neighbour, CONTACT ] ] as const) {
    const store = new PayloadStore({ token: each })
    for (const accountId of [ 'account-1', 'account-2' ]) {
      await store.start(accountId)
      assert.deepEqual(await store.contact!.get('id'), expected, `${each} ${accountId}`)
      await store.stop()
    }
    await store.destroy()
  }
})

test('PayloadStore destroy() rejects when the removal fails and can be retried', async t => {
  useTempHome(t)
  const store = new PayloadStore({ token: Math.random().toString(36) })
  await store.start('account')
  await assert.rejects(store.destroy(), /start\(\)-ed store/)
  await store.stop()

  const failing = t.mock.method(payloadStorage, 'remove', async () => { throw new Error('remove failed') })
  await assert.rejects(store.destroy(), /remove failed/)
  failing.mock.restore()
  await store.destroy()
})
