#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'
import { FileBox } from 'file-box'

import { UuidFileManager } from './uuid-file-manager.js'

test('UuidFileManager', async t => {
  const QRCODE = 'test qrcode'

  const manager = new UuidFileManager()
  await manager.init()

  const fileBox = FileBox.fromQRCode(QRCODE)
  const stream = await fileBox.toStream()

  const uuid = await manager.save(stream)

  const stream2 = await manager.load(uuid)
  t.ok(stream2, 'should load stream')

  const fileBox2 = FileBox.fromStream(stream2!, 'test')
  const qrcode = await fileBox2.toQRCode()

  t.equal(qrcode, QRCODE, 'should get back the qrcode data')

  await t.rejects(() => manager.load(uuid), 'should reject when load a UUID again')
})

test('expireMilliseconds', async t => {
  const QRCODE = 'test qrcode'

  const manager = new UuidFileManager({
    expireMilliseconds: 1,
  })
  await manager.init()

  const fileBox = FileBox.fromQRCode(QRCODE)
  const stream = await fileBox.toStream()

  const uuid = await manager.save(stream)
  await t.resolves(() => manager.load(uuid), 'should not expire right after save')

  await new Promise(resolve => setTimeout(resolve, 2))
  await t.rejects(() => manager.load(uuid), undefined, 'should expire after 2ms')
})
