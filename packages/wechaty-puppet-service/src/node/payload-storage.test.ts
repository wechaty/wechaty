/**
 * Native unit tests for the LMDB side of `#payload-storage`: that the `node`
 * condition selects it, and where it puts and removes the folders.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

import { payloadStorage as selected } from '#payload-storage'

import { useTempHome } from '../../tests/fixtures/temp-home.ts'

import { payloadStorage } from './payload-storage.ts'

test('#payload-storage resolves to the native build', () => {
  assert.equal(selected, payloadStorage)
})

test('native payloadStorage keeps a version of a token in one folder under the home', async t => {
  const home = useTempHome(t)

  const root = payloadStorage.root('token', 'v2.0')
  assert.equal(root, path.join(home, '.wechaty', 'wechaty-puppet-service', 'token', 'v2.0'))

  const storePath = payloadStorage.storePath(root, 'account', 'contact-payload')
  assert.equal(storePath, path.join(root, 'account', 'contact-payload'))

  fs.mkdirSync(storePath, { recursive: true })
  const otherVersion = payloadStorage.root('token', 'v2.1')
  fs.mkdirSync(otherVersion, { recursive: true })

  await payloadStorage.remove(root)
  assert.equal(fs.existsSync(root), false, 'should remove the folder')
  assert.equal(fs.existsSync(otherVersion), true, 'should keep another version')

  await assert.doesNotReject(payloadStorage.remove(root), 'should have nothing to remove')
})
