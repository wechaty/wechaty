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
      assert.ok(puppet.isRunning, 'should be running after start() #' + i)

      await puppet.stop()
      assert.ok(puppet.isStopped, 'should be stopped after stop() #' + i)
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

test('PuppetMock supplies an in-memory PNG contact avatar', async () => {
  const puppet = new PuppetMock()
  const contact = puppet.mocker.createContact()

  const avatar = await puppet.contactAvatar(contact.id)

  assert.equal(avatar.name, 'wechaty-icon.png')
  assert.equal(avatar.mediaType, 'image/png')
  assert.ok(atob(await avatar.toBase64()).startsWith('\x89PNG\r\n\x1a\n'))
  assert.equal(await puppet.contactAvatar(contact.id, avatar), undefined)
})

test('PuppetMock rejects a file request for an unknown message', async () => {
  const puppet = new PuppetMock()

  await assert.rejects(() => puppet.messageFile('missing-message'), /no filebox cache/)
})
