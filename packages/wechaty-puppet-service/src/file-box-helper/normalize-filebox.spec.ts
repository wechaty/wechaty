#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'
import { FileBox } from 'file-box'

import { canPassthrough } from './normalize-filebox.js'

const kbFileBox = (size: number) => FileBox.fromBuffer(Buffer.from(
  new Int8Array(size * 1024).fill(0),
), size + 'KB.txt')

test('canPassthrough() size threshold', async t => {
  t.ok(canPassthrough(kbFileBox(16)),     'should passthrough 16KB')
  t.notOk(canPassthrough(kbFileBox(32)),  'should not passthrough 32KB')
})

test('canPassthrough(): always true for green types', async t => {
  const URL    = 'https://example.com'
  const QRCODE = 'qrcode'
  const UUID   = '12345678-1234-5678-1234-567812345678'

  t.ok(canPassthrough(FileBox.fromUrl(URL)),        'should passthrough Url')
  t.ok(canPassthrough(FileBox.fromQRCode(QRCODE)),  'should passthrough QRCode')
  t.ok(canPassthrough(FileBox.fromUuid(UUID)),      'should passthrough UUID')
})

test('canPassthrough(): always false for red types', async t => {
  const streamFileBox = FileBox.fromStream(
    await FileBox.fromQRCode('qr').toStream(),
  )
  const localFileBox = FileBox.fromFile('tests/fixtures/smoke-testing.ts')

  t.notOk(canPassthrough(streamFileBox),  'should not passthrough Stream')
  t.notOk(canPassthrough(localFileBox),   'should not passthrough File')
})

test('canPassthrough(): will depend on the size for yellow types', async t => {
  const bufferFileBox = FileBox.fromBuffer(Buffer.from('buf'))
  const base64FileBox = FileBox.fromBase64(Buffer.from('buf').toString('base64'))

  t.ok(canPassthrough(bufferFileBox), 'should not passthrough small Buffer')
  t.ok(canPassthrough(base64FileBox), 'should not passthrough small Base64')

  /**
   * TODO: add the large size test which will over the threshold
   */
})
