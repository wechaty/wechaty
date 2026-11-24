/**
 * Unit tests for `PayloadStore`: repeated start and stop, that `stop()` and
 * `start()` wait for a LevelDB close already in flight, and that a `stop()`
 * cancels a `start()` whose open has not run yet.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { useTempHome } from '../../tests/fixtures/temp-home.ts'

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
  assert.equal(started, false, 'should not reopen the LevelDB folders yet')

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
