#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'
import { FileBox } from 'file-box'

import { UniformResourceNameRegistry } from './uniform-resource-name-registry.js'

test('UniformResourceNameRegistry class', async t => {
  const QRCODE = 'test qrcode'

  const urnRegistry = new UniformResourceNameRegistry()
  await urnRegistry.init()

  const fileBox = FileBox.fromQRCode(QRCODE)
  const stream = await fileBox.toStream()

  const uuid = await urnRegistry.register(stream)

  const stream2 = await urnRegistry.resolve(uuid)
  t.ok(stream2, 'should load stream')

  const fileBox2 = FileBox.fromStream(stream2!, 'test')
  const qrcode = await fileBox2.toQRCode()

  t.equal(qrcode, QRCODE, 'should get back the qrcode data')

  await t.rejects(() => urnRegistry.resolve(uuid), 'should reject when load a UUID again')

  await urnRegistry.destroy()
})

test('expireMilliseconds: in time', async t => {
  const expireMilliseconds = 3
  const urnRegistry = new UniformResourceNameRegistry({
    expireMilliseconds,
  })
  await urnRegistry.init()

  const uuid = await urnRegistry.register(await FileBox.fromQRCode('qr').toStream())
  await new Promise(resolve => setTimeout(resolve, 1))
  await t.resolves(() => urnRegistry.resolve(uuid), `should not expire after 1ms (with ${expireMilliseconds}ms expire)`)

  await urnRegistry.destroy()
})

test('expireMilliseconds: time out', async t => {
  const expireMilliseconds = 1
  const urnRegistry = new UniformResourceNameRegistry({
    expireMilliseconds,
  })
  await urnRegistry.init()

  /**
   * Expired after 1ms
   */
  const uuid2 = await urnRegistry.register(await FileBox.fromQRCode('qr').toStream())
  await new Promise(resolve => setTimeout(resolve, 2))
  await t.rejects(() => urnRegistry.resolve(uuid2), undefined, `should expire after 2ms (with ${expireMilliseconds}ms expire)`)

  await urnRegistry.destroy()
})
