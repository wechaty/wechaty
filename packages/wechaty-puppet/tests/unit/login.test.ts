/**
 * Tests that `login()` emits the `login` event with the user ID, and that
 * stopping the puppet logs it out.
 */
// @ts-check

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PuppetTest } from '../fixtures/puppet-test/puppet-test.ts'

test('login testing', async _t => {

  const puppet = new PuppetTest()

  const USER_ID = 'test-user'
  let userFromEvent = null
  const future = new Promise<void>(resolve => puppet.on('login', user => {
    userFromEvent = user.contactId
    resolve()
  }))
  await puppet.start()
  puppet.login(USER_ID)
  await future

  assert.deepEqual(userFromEvent, USER_ID, `should get login event with ${USER_ID}`)
  await puppet.stop()
  assert.ok(!(puppet.isLoggedIn), 'puppet should not be logged in after stop')
})
