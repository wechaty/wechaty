#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import { PuppetMock } from './puppet-mock.js'

class PuppetMockTest extends PuppetMock {
}

test('PuppetMock perfect restart testing', async t => {
  const puppet = new PuppetMockTest()
  try {

    for (let i = 0; i < 3; i++) {
      await puppet.start()
      t.ok(puppet.state.active(), 'should be turned on after start() #' + i)

      await puppet.stop()
      t.ok(puppet.state.inactive(), 'should be turned off after stop() #' + i)
    }

    t.pass('PuppetMock() perfect restart pass.')
  } catch (e) {
    t.fail(e as any)
  }
})

test('PuppetMock toString()', async t => {
  const puppet = new PuppetMockTest()
  const REGEXP = /PuppetMock/
  t.doesNotThrow(() => puppet.toString(), 'should not throw')
  t.ok(REGEXP.test(puppet.toString()), 'should be PuppetMock')
})
