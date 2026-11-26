/**
 * Tests that `login()` emits the `login` event with the user ID, and that
 * stopping the puppet logs it out.
 */
// @ts-check

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PuppetTest } from '../fixtures/puppet-test/puppet-test.ts'

test('login testing with EventTarget, next(), and legacy on()', async _t => {

  const puppet = new PuppetTest()

  const USER_ID = 'test-user'
  let userFromEvent = null
  let eventDetailFromListener: unknown = null

  puppet.addEventListener('login', (event: Event) => {
    if (event instanceof CustomEvent) {
      eventDetailFromListener = event.detail
    }
  })

  const future = new Promise<void>(resolve => puppet.on('login', user => {
    userFromEvent = user.contactId
    resolve()
  }))

  const nextPromise = puppet.next('login')

  await puppet.start()
  puppet.login(USER_ID)
  await future
  const nextDetail = await nextPromise

  assert.deepEqual(userFromEvent, USER_ID, `should get login event with ${USER_ID}`)
  assert.deepEqual(eventDetailFromListener, { contactId: USER_ID }, 'should get CustomEvent.detail in addEventListener')
  assert.deepEqual(nextDetail, { contactId: USER_ID }, 'should resolve next() with { contactId: USER_ID }')

  await puppet.stop()
  assert.ok(!(puppet.isLoggedIn), 'puppet should not be logged in after stop')
})
