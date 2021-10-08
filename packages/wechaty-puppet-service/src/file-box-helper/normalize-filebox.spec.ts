#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'
import { FileBox } from 'file-box'

import { canPassthrough } from './normalize-filebox.js'

const kbFileBox = (size: number) => FileBox.fromBuffer(Buffer.from(
  new Int8Array(size * 1024).fill(0),
), size + 'KB.txt')

test('canPassthrough()', async t => {
  t.ok(canPassthrough(kbFileBox(16)),       'should passthrough 16KB')
  t.notOk(canPassthrough(kbFileBox(32)),    'should not passthrough 32KB')
  t.notOk(canPassthrough(kbFileBox(64)),    'should not passthrough 64KB')
  t.notOk(canPassthrough(kbFileBox(128)),   'should not passthrough 128KB')
  t.notOk(canPassthrough(kbFileBox(256)),   'should not passthrough 256KB')
  t.notOk(canPassthrough(kbFileBox(512)),   'should not passthrough 512KB')
  t.notOk(canPassthrough(kbFileBox(1024)),  'should not passthrough 1024KB')
  t.notOk(canPassthrough(kbFileBox(2048)),  'should not passthrough 2048KB')
})
