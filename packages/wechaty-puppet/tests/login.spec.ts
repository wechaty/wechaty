#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
// @ts-check

import { test } from 'tstest'

import { PuppetTest } from './fixtures/puppet-test/puppet-test.js'

test('login testing', async t => {

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

  t.same(userFromEvent, USER_ID, `should get login event with ${USER_ID}`)
  await puppet.stop()
  t.notOk(puppet.isLoggedIn, 'puppet should not be logged in after stop')
})
