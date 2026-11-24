/**
 * Unit tests for `puppet-mock.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PuppetMock } from './puppet-mock.ts'

class PuppetMockTest extends PuppetMock {
}

test('PuppetMock perfect restart testing', async _t => {
  const puppet = new PuppetMockTest()
  try {

    for (let i = 0; i < 3; i++) {
      await puppet.start()
      assert.ok(puppet.state.active(), 'should be turned on after start() #' + i)

      await puppet.stop()
      assert.ok(puppet.state.inactive(), 'should be turned off after stop() #' + i)
    }

    assert.ok(true, 'PuppetMock() perfect restart pass.')
  } catch (e) {
    assert.fail(e as any)
  }
})

test('PuppetMock toString()', async _t => {
  const puppet = new PuppetMockTest()
  const REGEXP = /PuppetMock/
  assert.doesNotThrow(() => puppet.toString(), 'should not throw')
  assert.ok(REGEXP.test(puppet.toString()), 'should be PuppetMock')
})
