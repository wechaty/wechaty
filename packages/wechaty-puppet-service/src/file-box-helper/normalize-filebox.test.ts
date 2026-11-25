/**
 * Unit tests for `canPassthrough()` by file box type and size. The local file
 * case is native: see `normalize-filebox.native.test.ts`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FileBox } from 'file-box'

import { canPassthrough } from './normalize-filebox.ts'

const kbFileBox = (size: number) => FileBox.fromBuffer(new Uint8Array(size * 1024), size + 'KB.txt')

test('canPassthrough() size threshold', async _t => {
  assert.ok(canPassthrough(kbFileBox(16)),     'should passthrough 16KB')
  assert.ok(!(canPassthrough(kbFileBox(32))),  'should not passthrough 32KB')
})

test('canPassthrough(): always true for green types', async _t => {
  const URL    = 'https://example.com'
  const QRCODE = 'qrcode'
  const UUID   = '12345678-1234-5678-1234-567812345678'

  assert.ok(canPassthrough(FileBox.fromUrl(URL)),        'should passthrough Url')
  assert.ok(canPassthrough(FileBox.fromQRCode(QRCODE)),  'should passthrough QRCode')
  assert.ok(canPassthrough(FileBox.fromUuid(UUID)),      'should passthrough UUID')
})

test('canPassthrough(): always false for red types', async _t => {
  const streamFileBox = FileBox.fromStream(new Blob([ 'buf' ]).stream(), 'stream.txt')

  assert.ok(!(canPassthrough(streamFileBox)),  'should not passthrough Stream')
})

test('canPassthrough(): will depend on the size for yellow types', async _t => {
  const bufferFileBox = FileBox.fromBuffer(new TextEncoder().encode('buf'))
  const base64FileBox = FileBox.fromBase64(btoa('buf'))

  assert.ok(canPassthrough(bufferFileBox), 'should not passthrough small Buffer')
  assert.ok(canPassthrough(base64FileBox), 'should not passthrough small Base64')

  /**
   * TODO: add the large size test which will over the threshold
   */
})
